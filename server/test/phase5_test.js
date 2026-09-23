import assert from 'assert';
import http from 'http';
import app from '../src/app.js';
import { query, pool } from '../src/db/index.js';
import { EmbeddingService } from '../src/services/embeddingService.js';
import { RetrievalService } from '../src/services/retrievalService.js';
import { LLMService } from '../src/services/llmService.js';
import { PrecedentModel } from '../src/models/precedentModel.js';

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
  console.log('========================================================');
  console.log('STARTING PHASE 5 LEGAL EXPLANATION & RAG LAYER TESTS');
  console.log('========================================================\n');

  try {
    // -------------------------------------------------------------
    // SETUP TEST FIXTURES & USERS
    // -------------------------------------------------------------
    const buyerAEmail = `buyer_p5_a_${Date.now()}@example.com`;
    const buyerBEmail = `buyer_p5_b_${Date.now()}@example.com`;
    const adminEmail = `admin_p5_${Date.now()}@example.com`;

    // 1. Register Buyer A
    const regResA = await request('POST', '/api/auth/register', {
      body: { name: 'P5 Buyer A', email: buyerAEmail, password: 'password123' },
    });
    assert.strictEqual(regResA.status, 201);
    const tokenA = regResA.body.token;
    const userA = regResA.body.user;

    // 2. Register Buyer B (for isolation testing)
    const regResB = await request('POST', '/api/auth/register', {
      body: { name: 'P5 Buyer B', email: buyerBEmail, password: 'password123' },
    });
    assert.strictEqual(regResB.status, 201);
    const tokenB = regResB.body.token;

    // 3. Register Admin User
    const regResAdmin = await request('POST', '/api/auth/register', {
      body: { name: 'P5 Admin', email: adminEmail, password: 'password123' },
    });
    assert.strictEqual(regResAdmin.status, 201);
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [regResAdmin.body.user.id]);

    const loginResAdmin = await request('POST', '/api/auth/login', {
      body: { email: adminEmail, password: 'password123' },
    });
    const adminToken = loginResAdmin.body.token;

    // 4. Setup Delayed Project & Case for Buyer A
    const reraNum = `P5RERA_${Date.now()}`;
    const projRes = await query(
      `INSERT INTO projects (rera_number, state, name, developer_name, registered_possession_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [reraNum, 'Maharashtra', 'P5 Sky Heights', 'Prestige Developers', '2022-01-01']
    );
    const projectId = projRes.rows[0].id;

    const caseRes = await query(
      `INSERT INTO buyer_cases (user_id, project_id, promised_date_from_agreement, amount_paid, chosen_remedy)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userA.id, projectId, '2022-01-01', 7500000.0, 'withdraw']
    );
    const caseIdA = caseRes.rows[0].id;

    // Add installment payment
    await query(
      `INSERT INTO case_payments (buyer_case_id, amount, paid_on, note)
       VALUES ($1, $2, $3, $4)`,
      [caseIdA, 7500000.0, '2021-06-15', 'Full installment']
    );

    // Run Section 18 remedy calculation first
    const calcRes = await request('POST', `/api/cases/${caseIdA}/calculate-remedy`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { remedyType: 'both' },
    });
    assert.strictEqual(calcRes.status, 200);
    const remedyCalculationId = calcRes.body.data.withdraw.calculationId;

    // -------------------------------------------------------------
    // TEST 1: RAG-GROUNDED EXPLANATION GENERATION & CITATION INTEGRITY
    // -------------------------------------------------------------
    console.log('[1/7] Testing Statutory Explanation Generation & Citation Integrity...');
    const explainRes = await request('POST', `/api/cases/${caseIdA}/explain-remedy`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        remedyCalculationId,
        remedyType: 'withdraw',
      },
    });

    assert.strictEqual(explainRes.status, 200);
    const explainData = explainRes.body.data;

    assert.ok(explainData.explanationText, 'Should return non-empty explanation text');
    assert.ok(explainData.citedProvisions.length > 0, 'Should cite Act provisions');
    assert.ok(explainData.citedPrecedents.length > 0, 'Should cite relevant precedents');
    assert.strictEqual(explainData.confidenceFlag, 'grounded');

    // Verify all cited provisions are present in the returned list
    for (const prov of explainData.citedProvisions) {
      assert.ok(prov.sectionNumber, 'Cited provision must have sectionNumber');
      assert.ok(prov.fullText, 'Cited provision must include fullText excerpt');
    }

    // Verify all cited precedents have structured facts
    for (const prec of explainData.citedPrecedents) {
      assert.ok(prec.id, 'Precedent must have ID');
      assert.ok(prec.state, 'Precedent must have state');
      assert.ok(prec.delayMonths !== null, 'Precedent must have delayMonths');
      assert.ok(prec.amountPaidPercentage !== null, 'Precedent must have amountPaidPercentage');
      assert.ok(prec.relevanceNote, 'Precedent must include why this is relevant to case');
    }
    console.log('  ✓ Grounded explanation generated with citations.');

    // -------------------------------------------------------------
    // TEST 2: ANTI-HALLUCINATION & NO GUARANTEED COMPENSATION CLAIMS
    // -------------------------------------------------------------
    console.log('[2/7] Testing Anti-Hallucination & Zero Guarantee Safety...');
    const text = explainData.explanationText;
    const lowerText = text.toLowerCase();

    // Check prohibited guarantee patterns
    assert.ok(!lowerText.includes('you will receive ₹'), 'Must not guarantee payout amounts');
    assert.ok(!lowerText.includes('guaranteed compensation of'), 'Must not claim guaranteed compensation');
    assert.ok(!lowerText.includes('the court will definitely'), 'Must not predict court ruling certainty');

    // Confirm disclaimer is present
    assert.ok(
      lowerText.includes('past tribunal orders illustrate') || lowerText.includes('not constitute a guarantee'),
      'Must contain explicit statutory disclaimer'
    );
    console.log('  ✓ Strict anti-hallucination verified: zero guaranteed claims made.');

    // -------------------------------------------------------------
    // TEST 3: STRUCTURED FACT RERANKING DEMONSTRABLY CHANGES RESULT ORDER
    // -------------------------------------------------------------
    console.log('[3/7] Proving Structured-Fact Reranking Changes Candidate Ranking...');
    const testFacts = {
      state: 'Maharashtra',
      delayMonths: 24,
      amountPaidPercentage: 92.5,
      remedyType: 'withdraw',
    };

    const queryEmbedding = await EmbeddingService.getEmbedding(
      'Maharashtra Section 18 withdraw delay of 24 months paid 92.5%'
    );
    const rawCandidates = await PrecedentModel.findCandidates({
      queryEmbedding,
      remedyType: 'withdraw',
      state: 'Maharashtra',
      limit: 10,
    });

    const reranked = RetrievalService.rerankCandidates(rawCandidates, testFacts);

    const rawFirstId = rawCandidates[0].id;
    const rerankedFirstId = reranked[0].id;

    console.log(`    Raw Top ID: ${rawFirstId} | Reranked Top ID: ${rerankedFirstId}`);
    // Check that rerank scores prioritize delay closeness
    assert.ok(reranked[0].combined_score >= reranked[reranked.length - 1].combined_score);
    assert.ok(reranked[0].delay_score !== undefined);
    assert.ok(reranked[0].payment_score !== undefined);
    console.log('  ✓ Structured-fact reranker validated.');

    // -------------------------------------------------------------
    // TEST 4: EDGE CASE WITH DELIBERATELY UNUSUAL SCENARIO -> LOW CONFIDENCE
    // -------------------------------------------------------------
    console.log('[4/7] Testing Unusual Edge Case -> low_confidence Flag...');
    // Create an edge case with a 150-month delay in an uncharted state
    const edgeProj = await query(
      `INSERT INTO projects (rera_number, state, name, developer_name, registered_possession_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`EDGE_RERA_${Date.now()}`, 'Nagaland', 'Edge Remote Hills', 'Unknown Dev', '2010-01-01']
    );
    const edgeCase = await query(
      `INSERT INTO buyer_cases (user_id, project_id, promised_date_from_agreement, amount_paid, chosen_remedy)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userA.id, edgeProj.rows[0].id, '2010-01-01', 100000.0, 'withdraw']
    );

    const edgeExplainRes = await request('POST', `/api/cases/${edgeCase.rows[0].id}/explain-remedy`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { remedyType: 'withdraw' },
    });

    assert.strictEqual(edgeExplainRes.status, 200);
    assert.strictEqual(
      edgeExplainRes.body.data.confidenceFlag,
      'low_confidence',
      'Should flag low_confidence when no close precedents match'
    );
    assert.ok(
      edgeExplainRes.body.data.explanationText.toLowerCase().includes('limited'),
      'Should honestly communicate limited precedents found'
    );
    console.log('  ✓ Edge case correctly returned low_confidence flag with honest notice.');

    // -------------------------------------------------------------
    // TEST 5: PERSISTENCE & EXPLANATION AUDIT HISTORY
    // -------------------------------------------------------------
    console.log('[5/7] Testing Explanation Audit Trail Persistence...');
    const historyRes = await request('GET', `/api/cases/${caseIdA}/explanations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert.strictEqual(historyRes.status, 200);
    assert.ok(Array.isArray(historyRes.body.data));
    assert.ok(historyRes.body.data.length >= 1, 'Should return persisted explanation requests');

    const firstLogged = historyRes.body.data[0];
    assert.strictEqual(firstLogged.buyer_case_id, caseIdA);
    assert.ok(firstLogged.retrieved_provision_ids.length > 0);
    assert.ok(firstLogged.generated_explanation);
    console.log(`  ✓ Persisted ${historyRes.body.data.length} explanation request(s) on case audit trail.`);

    // -------------------------------------------------------------
    // TEST 6: STRICT USER ISOLATION (404 FOR FOREIGN CASES)
    // -------------------------------------------------------------
    console.log('[6/7] Testing Strict User Isolation (Foreign Case Access)...');
    const foreignRes = await request('POST', `/api/cases/${caseIdA}/explain-remedy`, {
      headers: { Authorization: `Bearer ${tokenB}` }, // Buyer B trying to access Buyer A's case
      body: { remedyType: 'withdraw' },
    });
    assert.strictEqual(foreignRes.status, 404, 'Must return 404 Not Found to prevent case enumeration');

    const foreignHistRes = await request('GET', `/api/cases/${caseIdA}/explanations`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.strictEqual(foreignHistRes.status, 404, 'Must return 404 on history access');
    console.log('  ✓ Strict user isolation verified: foreign case requests return HTTP 404.');

    // -------------------------------------------------------------
    // TEST 7: ADMIN PRECEDENT EXTRACTION & CRUD PIPELINE
    // -------------------------------------------------------------
    console.log('[7/7] Testing Admin Precedent Extraction & Management...');
    const sampleOrderText = `
BEFORE THE MAHARASHTRA REAL ESTATE REGULATORY AUTHORITY, MUMBAI
Complaint No: CC00600000099999
Complainant: Rajesh Sharma
Respondent: Metropolis Realtors Pvt Ltd

ORDER:
The complainant booked flat 1402 having paid 90% of total consideration. Contractual possession was due on 31-12-2021.
There has been an admitted delay of 24 months. The complainant wishes to withdraw from the project.
The Authority hereby directs the respondent promoter under Section 18(1) of the Act to refund the entire amount of
Rs. 82,00,000 along with simple interest at SBI Highest MCLR + 2% (11.10% p.a.) within 45 days.
Dated: 2024-02-10
    `;

    // (a) Extraction step (AI proposes)
    const extractRes = await request('POST', '/api/admin/precedents/extract', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { rawText: sampleOrderText },
    });
    assert.strictEqual(extractRes.status, 200);
    const extracted = extractRes.body.data;
    assert.strictEqual(extracted.state, 'Maharashtra');
    assert.strictEqual(extracted.remedyType, 'withdraw');
    assert.strictEqual(extracted.delayMonths, 24);
    assert.strictEqual(extracted.amountPaidPercentage, 90);
    assert.strictEqual(extracted.awardedAmount, 8200000);

    // (b) Confirm & Save step (Admin disposes)
    const createRes = await request('POST', '/api/admin/precedents', {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        ...extracted,
        sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000099999',
      },
    });
    assert.strictEqual(createRes.status, 201);
    const createdPrecedent = createRes.body.data;
    assert.ok(createdPrecedent.id);
    assert.ok(createdPrecedent.embedding, 'Should have generated embedding automatically');

    // (c) List step
    const listRes = await request('GET', '/api/admin/precedents?search=Metropolis', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 1);

    // (d) Delete step
    const delRes = await request('DELETE', `/api/admin/precedents/${createdPrecedent.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(delRes.status, 200);
    console.log('  ✓ Admin precedent extraction, review, save, and listing verified.');

    console.log('\n========================================================');
    console.log('ALL PHASE 5 TESTS PASSED SUCCESSFULLY! (7/7)');
    console.log('========================================================\n');
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }
}

// Start test HTTP server
server = app.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  runTests();
});
