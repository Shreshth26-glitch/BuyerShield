import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { query } from '../src/db/index.js';
import {
  calculateWithdrawRemedy,
  calculateContinueRemedy,
  normalizeDate,
  formatDateOnly,
} from '../src/utils/remedyMath.js';

let server;
let baseUrl;

function request(method, path, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch {
            json = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================');
  console.log('STARTING PHASE 4 REMEDY CALCULATOR TEST SUITE');
  console.log('========================================\n');

  try {
    // -------------------------------------------------------------
    // 1. PURE MATH & ZERO ROUNDING DRIFT UNIT TESTS
    // -------------------------------------------------------------
    console.log('[1/5] Testing Pure Deterministic Math Engine...');

    const principal = 5000000; // ₹50 Lakhs
    const rate = 10.85; // 10.85% annual
    const delayStart = '2024-01-01';
    const delayEnd = '2024-03-31';

    // (a) Withdraw remedy
    const withdraw = calculateWithdrawRemedy({
      principalAmount: principal,
      delayStartDate: delayStart,
      today: delayEnd,
      rate,
    });

    assert.strictEqual(withdraw.isDelayed, true);
    assert.strictEqual(withdraw.refundAmount, 5000000);
    assert.strictEqual(withdraw.daysElapsed, 90);

    // Hand calculation:
    // (5000000 * 10.85 * 90) / (365 * 100) = 48825000 / 365 = 133767.12328...
    // In paise: round(13376712.328...) = 13376712 paise = 133767.12
    assert.strictEqual(withdraw.interestAmount, 133767.12);
    assert.strictEqual(withdraw.totalAmount, 5133767.12);
    console.log('✓ Withdraw remedy matched exact hand-calculated interest (₹1,33,767.12)');

    // (b) Continue remedy month-by-month breakdown
    const continueRemedy = calculateContinueRemedy({
      principalAmount: principal,
      delayStartDate: delayStart,
      today: delayEnd,
      rate,
    });

    assert.strictEqual(continueRemedy.isDelayed, true);
    assert.strictEqual(continueRemedy.breakdown.length, 3); // Jan, Feb, Mar 2024
    assert.strictEqual(continueRemedy.breakdown[0].month, 'Jan 2024');
    assert.strictEqual(continueRemedy.breakdown[1].month, 'Feb 2024');
    assert.strictEqual(continueRemedy.breakdown[2].month, 'Mar 2024');

    // Verify zero rounding drift
    const itemizedSum = continueRemedy.breakdown.reduce((sum, row) => sum + row.amount, 0);
    const itemizedPaiseSum = continueRemedy.breakdown.reduce((sum, row) => sum + row.amountPaise, 0);

    const diff = Math.abs(continueRemedy.totalAccruedSoFar - (itemizedPaiseSum / 100));
    assert.strictEqual(diff, 0, 'Zero rounding drift guaranteed between itemized rows and total sum');
    console.log(`✓ Continue remedy zero-drift verified: ${continueRemedy.breakdown.length} months itemized, sum = ₹${continueRemedy.totalAccruedSoFar}`);

    // (c) Future date guardrail
    const futureCalc = calculateWithdrawRemedy({
      principalAmount: principal,
      delayStartDate: '2028-01-01',
      today: '2026-01-01',
      rate,
    });
    assert.strictEqual(futureCalc.isDelayed, false);
    assert.strictEqual(futureCalc.interestAmount, 0);
    console.log('✓ Pure math correctly returns isDelayed=false for future dates');

    // -------------------------------------------------------------
    // 2. SETUP SERVER & TEST ACCOUNTS
    // -------------------------------------------------------------
    console.log('\n[2/5] Initializing Test Server & User Sessions...');
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const testSuffix = Date.now();
    const buyerEmail = `buyer_phase4_${testSuffix}@test.com`;
    const adminEmail = `admin_phase4_${testSuffix}@test.com`;
    const buyer2Email = `buyer2_phase4_${testSuffix}@test.com`;
    const password = 'Password@123';

    // Register Buyer 1
    const regBuyerRes = await request('POST', '/api/auth/register', {
      body: { email: buyerEmail, password, name: 'Phase4 Buyer' },
    });
    const buyerToken = regBuyerRes.body.token;
    const buyerId = regBuyerRes.body.user.id;

    // Register Buyer 2 (for security testing)
    const regBuyer2Res = await request('POST', '/api/auth/register', {
      body: { email: buyer2Email, password, name: 'Phase4 Buyer 2' },
    });
    const buyer2Token = regBuyer2Res.body.token;

    // Register Admin
    const regAdminRes = await request('POST', '/api/auth/register', {
      body: { email: adminEmail, password, name: 'Phase4 Admin' },
    });
    const adminId = regAdminRes.body.user.id;
    // Elevate admin
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminId]);

    // Login Admin to get token with admin role
    const loginAdminRes = await request('POST', '/api/auth/login', {
      body: { email: adminEmail, password },
    });
    const adminToken = loginAdminRes.body.token;

    console.log('✓ Buyer and Admin authenticated successfully');

    // -------------------------------------------------------------
    // 3. CREATE CASE WITH DELAY & PAYMENTS
    // -------------------------------------------------------------
    console.log('\n[3/5] Setting up Delayed Case with Payment Ledger...');

    // Seed test project in Maharashtra with delayed date (e.g. 2023-01-01)
    const projRes = await query(`
      INSERT INTO projects (rera_number, state, name, developer_name, registered_possession_date)
      VALUES ($1, 'Maharashtra', 'Lakeside Heights Phase 4', 'Apex Developers', '2023-01-01')
      ON CONFLICT (rera_number) DO UPDATE SET registered_possession_date = '2023-01-01'
      RETURNING id;
    `, [`P51800099${testSuffix}`]);
    const projectId = projRes.rows[0].id;

    // Create Buyer Case with agreement date 2023-01-01 and initial payment
    const caseRes = await request('POST', '/api/cases', {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        project_id: projectId,
        promised_date_from_agreement: '2023-01-01',
        amount_paid: 2500000,
        chosen_remedy: 'DELAY_INTEREST',
      },
    });
    assert.strictEqual(caseRes.status, 201);
    const caseId = caseRes.body.data.id;

    // Log second payment installment
    const payRes = await request('POST', `/api/cases/${caseId}/payments`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        amount: 1500000,
        paid_on: '2023-06-01',
        note: 'Structure milestone installment',
      },
    });
    assert.strictEqual(payRes.status, 201);
    console.log(`✓ Created Case #${caseId} with total audited principal ₹40,00,000`);

    // -------------------------------------------------------------
    // 4. TEST REMEDY CALCULATION ENDPOINT & AUDIT LOGGING
    // -------------------------------------------------------------
    console.log('\n[4/5] Testing POST /api/cases/:id/calculate-remedy & History...');

    const calcRes = await request('POST', `/api/cases/${caseId}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: { remedyType: 'both' },
    });

    assert.strictEqual(calcRes.status, 200);
    assert.strictEqual(calcRes.body.success, true);
    assert.strictEqual(calcRes.body.data.isDelayed, true);
    assert.strictEqual(calcRes.body.data.principalAmount, 4000000);
    assert.strictEqual(calcRes.body.data.policy.state, 'Maharashtra');
    assert.strictEqual(calcRes.body.data.policy.totalRate, 11.10); // 9.10 + 2.00
    assert.ok(calcRes.body.data.withdraw.totalAmount > 4000000);
    assert.ok(calcRes.body.data.continue.totalAccruedSoFar > 0);
    assert.ok(calcRes.body.data.continue.breakdown.length > 0);

    // Verify calculation was saved to remedy_calculations
    const auditRows = await query(
      `SELECT * FROM remedy_calculations WHERE buyer_case_id = $1 ORDER BY calculated_at DESC`,
      [caseId]
    );
    assert.strictEqual(auditRows.rows.length, 2); // 1 withdraw, 1 continue
    console.log('✓ Calculation completed successfully and persisted 2 audit log records');

    // Run recalculation to test audit trail accumulation (must not overwrite)
    await request('POST', `/api/cases/${caseId}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: { remedyType: 'both' },
    });

    const auditRowsAfter = await query(
      `SELECT * FROM remedy_calculations WHERE buyer_case_id = $1 ORDER BY calculated_at DESC`,
      [caseId]
    );
    assert.strictEqual(auditRowsAfter.rows.length, 4, 'Recalculation must append to history, never overwrite');

    // Test GET /api/cases/:id/remedy-history
    const histRes = await request('GET', `/api/cases/${caseId}/remedy-history`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.strictEqual(histRes.status, 200);
    assert.strictEqual(histRes.body.data.length, 4);
    console.log('✓ GET /api/cases/:id/remedy-history retrieved 4 chronological records');

    // -------------------------------------------------------------
    // 5. GUARDRAILS, SECURITY & ADMIN POLICY CRUD
    // -------------------------------------------------------------
    console.log('\n[5/5] Testing Guardrails, User Isolation & Admin Policy CRUD...');

    // (a) Security: Buyer 2 accessing Buyer 1's calculation receives 404
    const foreignCalcRes = await request('POST', `/api/cases/${caseId}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${buyer2Token}` },
    });
    assert.strictEqual(foreignCalcRes.status, 404);
    console.log('✓ User isolation: Foreign buyer received 404 Not Found');

    // (b) Guardrail: Non-delayed future case
    const futureCaseRes = await query(`
      INSERT INTO projects (rera_number, state, name, developer_name, registered_possession_date)
      VALUES ($1, 'Maharashtra', 'Future Tower', 'Apex Developers', '2030-01-01')
      ON CONFLICT (rera_number) DO UPDATE SET registered_possession_date = '2030-01-01'
      RETURNING id;
    `, [`P518FUTURE${testSuffix}`]);
    const futureCase = await request('POST', '/api/cases', {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        project_id: futureCaseRes.rows[0].id,
        promised_date_from_agreement: '2030-01-01',
        amount_paid: 1000000,
      },
    });
    const futureCalcRes = await request('POST', `/api/cases/${futureCase.body.data.id}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.strictEqual(futureCalcRes.status, 400);
    assert.strictEqual(futureCalcRes.body.code, 'NOT_YET_DELAYED');
    console.log('✓ Guardrail: Non-delayed project rejected with HTTP 400 NOT_YET_DELAYED');

    // (c) Guardrail: Unconfigured state policy
    const unconfiguredProj = await query(`
      INSERT INTO projects (rera_number, state, name, developer_name, registered_possession_date)
      VALUES ($1, 'Goa', 'Goa Sunshine', 'Goa Developers', '2022-01-01')
      ON CONFLICT (rera_number) DO UPDATE SET registered_possession_date = '2022-01-01'
      RETURNING id;
    `, [`P_GOA_${testSuffix}`]);
    const goaCase = await request('POST', '/api/cases', {
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        project_id: unconfiguredProj.rows[0].id,
        promised_date_from_agreement: '2022-01-01',
        amount_paid: 1000000,
      },
    });
    const goaCalcRes = await request('POST', `/api/cases/${goaCase.body.data.id}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.strictEqual(goaCalcRes.status, 400);
    assert.strictEqual(goaCalcRes.body.code, 'RATE_POLICY_NOT_FOUND');
    console.log('✓ Guardrail: Unconfigured state rejected with HTTP 400 RATE_POLICY_NOT_FOUND');

    // (d) Admin RBAC protection on interest-rates
    const nonAdminPolicyRes = await request('GET', '/api/admin/interest-rates', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.strictEqual(nonAdminPolicyRes.status, 403);
    console.log('✓ Admin RBAC: Regular buyer received 403 Forbidden on policy endpoints');

    // (e) Admin creates new policy for Goa
    const createPolicyRes = await request('POST', '/api/admin/interest-rates', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        state: 'Goa',
        benchmark_name: 'SBI Highest MCLR',
        benchmark_rate_source: 'Goa RERA Notification Rule 15',
        benchmark_rate_value: 8.95,
        added_percentage: 2.00,
        effective_from: '2024-01-01',
        source_url: 'https://rera.goa.gov.in',
      },
    });
    assert.strictEqual(createPolicyRes.status, 201);
    const newPolicyId = createPolicyRes.body.data.id;
    console.log(`✓ Admin successfully created new interest rate policy (ID: ${newPolicyId})`);

    // Now Goa calculation succeeds!
    const retryGoaCalcRes = await request('POST', `/api/cases/${goaCase.body.data.id}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert.strictEqual(retryGoaCalcRes.status, 200);
    assert.strictEqual(retryGoaCalcRes.body.data.policy.totalRate, 10.95);
    console.log('✓ Case in newly configured state calculates cleanly with 10.95% rate');

    // (f) Admin deletes test policy
    const deletePolicyRes = await request('DELETE', `/api/admin/interest-rates/${newPolicyId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(deletePolicyRes.status, 200);
    console.log('✓ Admin policy deletion succeeded');

    console.log('\n========================================');
    console.log('ALL PHASE 4 BACKEND ACCEPTANCE TESTS PASSED!');
    console.log('========================================');
  } catch (err) {
    console.error('\n✗ TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    // Close db pool to let process exit cleanly
    const { pool } = await import('../src/db/index.js');
    await pool.end();
    process.exit(0);
  }
}

runTests();
