import { pool } from '../src/db/index.js';
import { UserModel } from '../src/models/userModel.js';
import { ProjectModel } from '../src/models/projectModel.js';
import { CaseModel } from '../src/models/caseModel.js';
import { PaymentModel } from '../src/models/paymentModel.js';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import app from '../src/app.js';
import http from 'http';

// Helper to make local requests to express app without supertest
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
  console.log('--- STARTING PHASE 2 AUTOMATED TEST SUITE ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 1. Create two distinct test users for isolation testing
    const timestamp = Date.now();
    const userA = await UserModel.create({
      email: `test_user_a_${timestamp}@example.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      name: 'Buyer A',
      role: 'buyer',
    });
    const tokenA = jwt.sign({ id: userA.id, email: userA.email }, config.jwt.secret);

    const userB = await UserModel.create({
      email: `test_user_b_${timestamp}@example.com`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuu',
      name: 'Buyer B',
      role: 'buyer',
    });
    const tokenB = jwt.sign({ id: userB.id, email: userB.email }, config.jwt.secret);

    console.log('✓ Created User A and User B');

    // 2. Test Project Creation & Validation
    const testRera = `PRM/KA/RERA/${timestamp}`;
    const projectPayload = {
      rera_number: testRera,
      state: 'Karnataka',
      name: `Grand Serene Tower ${timestamp}`,
      developer_name: 'Sobha Horizon Developers',
      registered_possession_date: '2023-06-30',
    };

    const createProjRes = await request(server, 'POST', '/api/projects', {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: projectPayload,
    });

    if (createProjRes.status !== 201 || !createProjRes.body.data.id) {
      throw new Error(`Project creation failed: ${JSON.stringify(createProjRes.body)}`);
    }
    const projectId = createProjRes.body.data.id;
    console.log(`✓ Project created with ID: ${projectId}`);

    // 3. Test Duplicate Project Prevention (same RERA + State)
    const dupProjRes = await request(server, 'POST', '/api/projects', {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        ...projectPayload,
        name: 'Different Name But Same RERA Number',
      },
    });

    if (dupProjRes.status !== 200 || !dupProjRes.body.isExisting || dupProjRes.body.data.id !== projectId) {
      throw new Error(`Duplicate project handling failed: ${JSON.stringify(dupProjRes.body)}`);
    }
    console.log('✓ Duplicate project returned existing ID without duplication');

    // 4. Test Public Project Search
    const searchRes = await request(server, 'GET', `/api/projects?search=${timestamp}`);
    if (searchRes.status !== 200 || !searchRes.body.data || searchRes.body.data.length === 0) {
      throw new Error(`Project search failed: ${JSON.stringify(searchRes.body)}`);
    }
    console.log(`✓ Public project search returned ${searchRes.body.data.length} match(es)`);

    // 5. Test Invalid Date Validation (>10 years in future)
    const invalidDateProj = await request(server, 'POST', '/api/projects', {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        ...projectPayload,
        rera_number: `INVALID/${timestamp}`,
        registered_possession_date: '2045-01-01',
      },
    });
    if (invalidDateProj.status !== 400) {
      throw new Error(`Expected 400 for impossible future date, got ${invalidDateProj.status}`);
    }
    console.log('✓ Server rejected impossible future date (>10 years)');

    // 6. Test Buyer Case Creation for User A with initial amount_paid
    const casePayload = {
      project_id: projectId,
      promised_date_from_agreement: '2023-03-31', // in the past, so days_delayed > 0
      amount_paid: 2500000.0,
      chosen_remedy: 'DELAY_INTEREST',
    };

    const createCaseRes = await request(server, 'POST', '/api/cases', {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: casePayload,
    });

    if (createCaseRes.status !== 201 || !createCaseRes.body.data.id) {
      throw new Error(`Case creation failed: ${JSON.stringify(createCaseRes.body)}`);
    }
    const caseA = createCaseRes.body.data;
    console.log(`✓ Case A created with ID: ${caseA.id}`);

    // Verify derived fields: days_delayed > 0 and total_paid == 2500000
    if (typeof caseA.days_delayed !== 'number' || caseA.days_delayed <= 0) {
      throw new Error(`Invalid days_delayed: ${caseA.days_delayed}`);
    }
    if (caseA.total_paid !== 2500000) {
      throw new Error(`Invalid total_paid: expected 2500000, got ${caseA.total_paid}`);
    }
    console.log(`✓ Derived fields on creation: days_delayed = ${caseA.days_delayed}, total_paid = ₹${caseA.total_paid}`);

    // 7. Test Logging a Payment
    const paymentPayload = {
      amount: 500000.0,
      paid_on: '2023-08-15',
      note: 'Fourth slab completion payment',
    };

    const logPayRes = await request(server, 'POST', `/api/cases/${caseA.id}/payments`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: paymentPayload,
    });

    if (logPayRes.status !== 201 || !logPayRes.body.data.id) {
      throw new Error(`Payment logging failed: ${JSON.stringify(logPayRes.body)}`);
    }
    const paymentId = logPayRes.body.data.id;
    if (logPayRes.body.total_paid !== 3000000) {
      throw new Error(`Expected updated total_paid 3000000, got ${logPayRes.body.total_paid}`);
    }
    console.log(`✓ Payment logged with ID: ${paymentId}. Updated total_paid = ₹${logPayRes.body.total_paid}`);

    // 8. Test GET /api/cases/:id returns payments array and correct totals
    const getCaseRes = await request(server, 'GET', `/api/cases/${caseA.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    if (getCaseRes.status !== 200 || !Array.isArray(getCaseRes.body.data.payments) || getCaseRes.body.data.payments.length !== 2) {
      throw new Error(`Case detail payments list unexpected: ${JSON.stringify(getCaseRes.body)}`);
    }
    console.log(`✓ Case detail verified with ${getCaseRes.body.data.payments.length} payment records`);

    // 9. SECURITY & USER ISOLATION TESTS
    // User B attempts to access Case A -> MUST return 404 (not 403)
    const getForeignCase = await request(server, 'GET', `/api/cases/${caseA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (getForeignCase.status !== 404) {
      throw new Error(`Expected 404 when User B reads Case A, got ${getForeignCase.status}`);
    }
    console.log('✓ Security: User B accessing Case A received HTTP 404 (not 403)');

    const patchForeignCase = await request(server, 'PATCH', `/api/cases/${caseA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { chosen_remedy: 'REFUND' },
    });
    if (patchForeignCase.status !== 404) {
      throw new Error(`Expected 404 when User B patches Case A, got ${patchForeignCase.status}`);
    }
    console.log('✓ Security: User B updating Case A received HTTP 404');

    const payForeignCase = await request(server, 'POST', `/api/cases/${caseA.id}/payments`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { amount: 1000, paid_on: '2024-01-01' },
    });
    if (payForeignCase.status !== 404) {
      throw new Error(`Expected 404 when User B logs payment to Case A, got ${payForeignCase.status}`);
    }
    console.log('✓ Security: User B logging payment to Case A received HTTP 404');

    const deleteForeignCase = await request(server, 'DELETE', `/api/cases/${caseA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (deleteForeignCase.status !== 404) {
      throw new Error(`Expected 404 when User B deletes Case A, got ${deleteForeignCase.status}`);
    }
    console.log('✓ Security: User B deleting Case A received HTTP 404');

    // 10. Test Payment Deletion by User A
    const delPayRes = await request(server, 'DELETE', `/api/cases/${caseA.id}/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (delPayRes.status !== 200 || delPayRes.body.total_paid !== 2500000) {
      throw new Error(`Payment deletion failed: ${JSON.stringify(delPayRes.body)}`);
    }
    console.log(`✓ Payment deleted. Recalculated total_paid = ₹${delPayRes.body.total_paid}`);

    console.log('\n========================================');
    console.log('ALL PHASE 2 BACKEND ACCEPTANCE TESTS PASSED!');
    console.log('========================================\n');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
