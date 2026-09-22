import { pool } from '../src/db/index.js';
import { UserModel } from '../src/models/userModel.js';
import { ProjectModel } from '../src/models/projectModel.js';
import { CaseModel } from '../src/models/caseModel.js';
import { MahaRERAAdapter } from '../src/adapters/MahaRERAAdapter.js';
import { KarnatakaRERAAdapter } from '../src/adapters/KarnatakaRERAAdapter.js';
import { SyncService } from '../src/services/SyncService.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import app from '../src/app.js';
import http from 'http';

async function request(server, method, path, { headers = {}, body = null } = {}) {
  const address = server.address();
  const port = address.port;

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING PHASE 3 AUTOMATED TEST SUITE ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const timestamp = Date.now();

    // 1. Verify Adapters in isolation
    console.log('\n[1/6] Testing State Adapters (MahaRERA & K-RERA)...');
    const mahaAdapter = new MahaRERAAdapter({ minDelayMs: 10 });
    const kreraAdapter = new KarnatakaRERAAdapter({ minDelayMs: 10 });

    const mahaDetail = await mahaAdapter.fetchProjectDetail('P51800001234');
    if (mahaDetail.state !== 'Maharashtra' || !mahaDetail.registeredPossessionDate) {
      throw new Error(`MahaRERAAdapter returned invalid detail shape: ${JSON.stringify(mahaDetail)}`);
    }
    console.log(`✓ MahaRERAAdapter fetched: "${mahaDetail.name}" (${mahaDetail.registeredPossessionDate})`);

    const kreraDetail = await kreraAdapter.fetchProjectDetail('PRM/KA/RERA/1251/310/PR/171015/000451');
    if (kreraDetail.state !== 'Karnataka' || !kreraDetail.registeredPossessionDate) {
      throw new Error(`KarnatakaRERAAdapter returned invalid detail shape: ${JSON.stringify(kreraDetail)}`);
    }
    console.log(`✓ KarnatakaRERAAdapter fetched: "${kreraDetail.name}" (${kreraDetail.registeredPossessionDate})`);

    // 2. Setup users: standard buyer & administrator
    console.log('\n[2/6] Setting up Buyer and Admin accounts...');
    const buyer = await UserModel.create({
      email: `phase3_buyer_${timestamp}@example.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      name: 'P3 Buyer',
      role: 'buyer',
    });
    const buyerToken = jwt.sign({ id: buyer.id, email: buyer.email }, config.jwt.secret);

    const admin = await UserModel.create({
      email: `phase3_admin_${timestamp}@example.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      name: 'P3 Regulatory Admin',
      role: 'admin',
    });
    const adminToken = jwt.sign({ id: admin.id, email: admin.email }, config.jwt.secret);
    console.log('✓ Created Buyer and Admin accounts');

    // 3. Test SyncService End-to-End & Upsert
    console.log('\n[3/6] Testing SyncService.syncProject end-to-end...');
    let testProject = await ProjectModel.findByReraNumber('P51800001234');
    if (!testProject) {
      testProject = await ProjectModel.create({
        rera_number: 'P51800001234',
        state: 'Maharashtra',
        name: 'Godrej Prime (Self-Reported Entry)',
        developer_name: 'Godrej Dev',
        registered_possession_date: '2023-01-01',
      });
    } else {
      // Reset to self-reported with old date to test reconciliation
      await pool.query(
        `UPDATE projects 
         SET registered_possession_date = '2023-01-01',
             previous_registered_possession_date = NULL,
             reconciliation_status = 'unverified',
             data_source = 'self_reported',
             last_synced_at = NULL
         WHERE id = $1`,
        [testProject.id]
      );
      testProject = await ProjectModel.findById(testProject.id);
    }

    const buyerCase = await CaseModel.create({
      user_id: buyer.id,
      project_id: testProject.id,
      promised_date_from_agreement: '2022-12-31', // Buyer's contractual date
      amount_paid: 5000000,
      chosen_remedy: 'DELAY_INTEREST',
    });

    const syncResult = await SyncService.syncProject(testProject.id, { triggeredBy: 'test_runner' });
    if (!syncResult.success) {
      throw new Error(`Sync failed: ${syncResult.error}`);
    }

    // Verify database fields after sync
    const syncedProject = await ProjectModel.findById(testProject.id);
    if (syncedProject.data_source !== 'verified_synced') {
      throw new Error(`Expected data_source='verified_synced', got ${syncedProject.data_source}`);
    }
    if (!syncedProject.last_synced_at) {
      throw new Error('Expected last_synced_at timestamp to be set');
    }

    // 4. Test Reconciliation Logic (Synced date vs Buyer's contractual date)
    console.log('\n[4/6] Testing Reconciliation Engine & Mismatch Detection...');
    if (syncedProject.reconciliation_status !== 'mismatched') {
      throw new Error(`Expected reconciliation_status='mismatched', got ${syncedProject.reconciliation_status}`);
    }
    if (!syncedProject.previous_registered_possession_date) {
      throw new Error('Expected previous_registered_possession_date to be populated with 2023-01-01');
    }

    const formatDateOnly = (d) => {
      if (!d) return null;
      if (typeof d === 'string') return d.substring(0, 10);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // CRITICAL: Ensure buyer's contractual date is preserved untouched!
    const verifiedCase = await CaseModel.findById(buyerCase.id, buyer.id);
    const storedPromisedDate = formatDateOnly(verifiedCase.promised_date_from_agreement);
    if (storedPromisedDate !== '2022-12-31') {
      throw new Error(`Buyer promised_date_from_agreement was overwritten! Expected '2022-12-31', got '${storedPromisedDate}'`);
    }
    console.log(`✓ Reconciliation detected date mismatch: Previous=${formatDateOnly(syncedProject.previous_registered_possession_date)}, Updated=${formatDateOnly(syncedProject.registered_possession_date)}`);
    console.log(`✓ Confirmed buyer's contractual date ('2022-12-31') remains locked and untouched.`);

    // 5. Test Forced Failure & Visible Logging in sync_jobs
    console.log('\n[5/6] Testing Forced Sync Failure & Job Logging...');
    let brokenProject = await ProjectModel.findByReraNumber('FORCE_TIMEOUT');
    if (!brokenProject) {
      brokenProject = await ProjectModel.create({
        rera_number: 'FORCE_TIMEOUT',
        state: 'Maharashtra',
        name: 'Simulated Network Failure Project',
        developer_name: 'Broken Infra Corp',
        registered_possession_date: '2025-01-01',
      });
    }

    const failedSync = await SyncService.syncProject(brokenProject.id, { triggeredBy: 'test_failure' });
    if (failedSync.success) {
      throw new Error('Expected sync to fail for FORCE_TIMEOUT, but succeeded');
    }

    // Verify sync_jobs table recorded the failure
    const jobsRes = await SyncService.getRecentJobs({ limit: 5 });
    const failedJob = jobsRes.jobs.find((j) => j.project_id === brokenProject.id);
    if (!failedJob || failedJob.status !== 'failed' || !failedJob.error_log) {
      throw new Error(`Expected failed job in sync_jobs with error_log, got: ${JSON.stringify(failedJob)}`);
    }
    console.log(`✓ Forced failure correctly captured in sync_jobs (status='${failedJob.status}', retries=${failedJob.retry_count})`);

    // 6. Test User On-Demand Sync & Rate Limiting (1/hour)
    console.log('\n[6/6] Testing User On-Demand Sync & Rate Limiting...');
    const manualSync1 = await request(server, 'POST', `/api/cases/${buyerCase.id}/sync`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (manualSync1.status !== 200) {
      throw new Error(`Manual sync failed: ${JSON.stringify(manualSync1.body)}`);
    }

    // Immediate second sync request -> must return 429
    const manualSync2 = await request(server, 'POST', `/api/cases/${buyerCase.id}/sync`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (manualSync2.status !== 429) {
      throw new Error(`Expected HTTP 429 on rapid sync retry, got ${manualSync2.status}`);
    }
    console.log(`✓ On-demand sync rate limiting enforced (received HTTP 429: "${manualSync2.body.error}")`);

    // 7. Test Admin Sync Monitoring APIs (/api/admin/sync/*)
    console.log('\n[7/7] Testing Admin Sync Monitoring & Stats APIs...');
    // Buyer attempting admin route -> 403 Forbidden
    const buyerForbidden = await request(server, 'GET', '/api/admin/sync/stats', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (buyerForbidden.status !== 403) {
      throw new Error(`Expected 403 when buyer accesses admin route, got ${buyerForbidden.status}`);
    }
    console.log('✓ Admin route protected: Buyer received 403 Forbidden');

    // Admin accessing stats
    const adminStats = await request(server, 'GET', '/api/admin/sync/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (adminStats.status !== 200 || !adminStats.body.data.overall) {
      throw new Error(`Admin stats failed: ${JSON.stringify(adminStats.body)}`);
    }
    console.log(`✓ Admin stats retrieved: Total All-Time=${adminStats.body.data.overall.total_all_time}, Success Rate (7d)=${JSON.stringify(adminStats.body.data.last7Days)}`);

    // Admin retrying failed job
    const retryRes = await request(server, 'POST', `/api/admin/sync/retry/${failedJob.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (retryRes.status !== 200) {
      throw new Error(`Admin retry endpoint failed: ${JSON.stringify(retryRes.body)}`);
    }
    console.log('✓ Admin retry executed successfully');

    console.log('\n========================================');
    console.log('ALL PHASE 3 BACKEND ACCEPTANCE TESTS PASSED!');
    console.log('========================================\n');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('Phase 3 Test failed with error:', err);
  process.exit(1);
});
