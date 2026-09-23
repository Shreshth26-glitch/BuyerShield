import { pool, query } from '../index.js';
import { EmbeddingService } from '../../services/embeddingService.js';

export const ACT_PROVISIONS_DATA = [
  {
    sectionNumber: 'Section 18(1)',
    title: 'Return of Amount and Statutory Interest for Delay in Handover',
    fullText:
      'If the promoter fails to complete or is unable to give possession of an apartment, plot or building, (a) in accordance with the terms of the agreement for sale or, as the case may be, duly completed by the date specified therein; or (b) due to discontinuance of his business as a developer on account of suspension or revoking of the registration under this Act or for any other reason, he shall be liable on demand to the allottees, in case the allottee wishes to withdraw from the project, without prejudice to any other remedy available, to return the amount received by him in respect of that apartment, plot, building, as the case may be, with interest at such rate as may be prescribed in this behalf including compensation in the manner as provided under this Act.',
    state: null,
  },
  {
    sectionNumber: 'Section 18(1) Proviso',
    title: 'Monthly Delay Interest Where Allottee Retains Allotment',
    fullText:
      'Provided that where an allottee does not intend to withdraw from the project, he shall be paid, by the promoter, interest for every month of delay, till the handing over of the possession, at such rate as may be prescribed.',
    state: null,
  },
  {
    sectionNumber: 'Section 18(2)',
    title: 'Compensation for Defective Title of Land',
    fullText:
      'The promoter shall compensate the allottees in case of any loss caused to him due to defective title of the land, on which the project is being developed or has been developed, in the manner as provided under this Act, and the claim for compensation under this subsection shall not be barred by limitation provided under any law for the time being in force.',
    state: null,
  },
  {
    sectionNumber: 'Section 18(3)',
    title: 'Failure to Discharge Other Statutory Obligations',
    fullText:
      'If the promoter fails to discharge any other obligations imposed on him under this Act or the rules or regulations made thereunder or in accordance with the terms and conditions of the agreement for sale, he shall be liable to pay such compensation to the allottees, in the manner as provided under this Act.',
    state: null,
  },
  {
    sectionNumber: 'Section 2(za)',
    title: 'Statutory Definition of Prescribed Interest',
    fullText:
      '"Interest" means the rates of interest payable by the promoter or the allottee, as the case may be. The rate of interest chargeable from the allottee by the promoter, in case of default, shall be equal to the rate of interest payable by the promoter to the allottee in case of default, as prescribed by the appropriate State Government.',
    state: null,
  },
  {
    sectionNumber: 'Section 19(4)',
    title: 'Allottee Entitlement to Claim Refund and Interest',
    fullText:
      'The allottee shall be entitled to claim the refund of amount paid along with interest at such rate as may be prescribed and compensation in the manner as provided under this Act, from the promoter, if the promoter fails to comply or is unable to give possession of the apartment, plot or building in accordance with the terms of agreement for sale or due to discontinuance of his business.',
    state: null,
  },
  {
    sectionNumber: 'Section 31',
    title: 'Filing of Complaints Before the Authority or Adjudicating Officer',
    fullText:
      'Any aggrieved person may file a complaint with the Authority or the adjudicating officer, as the case may be, for any violation or contravention of the provisions of this Act or the rules and regulations made thereunder, against any promoter, allottee or real estate agent, as the case may be.',
    state: null,
  },
  {
    sectionNumber: 'MahaRERA Rule 18',
    title: 'Maharashtra Prescribed Benchmark Rate of Interest',
    fullText:
      'Under Rule 18 of the Maharashtra Real Estate (Regulation and Development) (Registration of real estate projects, registration of real estate agents, rates of interest and disclosures on website) Rules, 2017, the rate of interest payable by the promoter to the allottee shall be the State Bank of India highest Marginal Cost of Lending Rate (MCLR) plus two percent.',
    state: 'Maharashtra',
  },
  {
    sectionNumber: 'Karnataka RERA Rule 16',
    title: 'Karnataka Prescribed Benchmark Rate of Interest',
    fullText:
      'Under Rule 16 of the Karnataka Real Estate (Regulation and Development) Rules, 2017, the rate of interest payable by the promoter to the allottee shall be the State Bank of India highest Marginal Cost of Lending Rate (MCLR) plus two percent.',
    state: 'Karnataka',
  },
];

export const PRECEDENT_ORDERS_DATA = [
  {
    state: 'Maharashtra',
    orderDate: '2023-04-18',
    outcomeType: 'REFUND_ORDERED',
    remedyType: 'withdraw',
    delayMonths: 24,
    amountPaidPercentage: 92.5,
    awardedAmount: 8500000.0,
    interestRate: 10.75,
    sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000018492',
    summary:
      'MahaRERA bench directed the promoter to refund the entire disbursed principal sum of Rs. 85,00,000 along with simple interest at SBI Highest MCLR + 2% from the promised possession deadline until actual realization. The allottee established that the project was delayed by over 24 months past the contractual deadline agreed in the registered agreement for sale. The Authority held that unilateral portal revisions cannot strip the buyer of Section 18(1) withdrawal rights.',
  },
  {
    state: 'Maharashtra',
    orderDate: '2023-08-11',
    outcomeType: 'MONTHLY_DELAY_INTEREST',
    remedyType: 'continue',
    delayMonths: 18,
    amountPaidPercentage: 88.0,
    awardedAmount: 1140000.0,
    interestRate: 10.9,
    sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000021430',
    summary:
      'The home buyer sought to retain the allotment while demanding statutory compensation for delayed possession. MahaRERA ruled under Section 18(1) proviso that the builder must pay monthly delay interest at SBI Highest MCLR + 2% on the total sum of Rs. 72,00,000 paid by the allottee. Accrued delay interest for 18 months of delay was quantified at Rs. 11,40,000 to be paid within 45 days, with continued recurring monthly interest until physical handover with Occupancy Certificate.',
  },
  {
    state: 'Karnataka',
    orderDate: '2023-06-25',
    outcomeType: 'REFUND_ORDERED',
    remedyType: 'withdraw',
    delayMonths: 36,
    amountPaidPercentage: 95.0,
    awardedAmount: 12500000.0,
    interestRate: 10.8,
    sourceUrl: 'https://rera.karnataka.gov.in/orders/COMP_2022_0841',
    summary:
      'K-RERA Authority adjudicated in favor of an allottee who paid 95% of consideration (Rs. 1.25 Cr) where project completion was overdue by 36 months. Applying Section 18(1) and Karnataka Rule 16, the Authority ordered 100% refund of principal plus prescribed simple interest at 10.80% p.a. The promoter plea citing COVID-19 force majeure was rejected beyond the 6-month blanket extension.',
  },
  {
    state: 'Karnataka',
    orderDate: '2023-11-03',
    outcomeType: 'MONTHLY_DELAY_INTEREST',
    remedyType: 'continue',
    delayMonths: 14,
    amountPaidPercentage: 85.0,
    awardedAmount: 760000.0,
    interestRate: 11.1,
    sourceUrl: 'https://rera.karnataka.gov.in/orders/COMP_2023_0192',
    summary:
      'Karnataka RERA ordered the promoter to pay monthly delay interest under Rule 16 for an overdue residential unit where the buyer wished to retain ownership. With 85% paid and 14 months elapsed past contractual possession date, the Authority ordered immediate disbursement of accrued interest of Rs. 7.60 Lakhs, directing future monthly payments directly to the buyer till valid OC is secured.',
  },
  {
    state: 'Maharashtra',
    orderDate: '2024-01-15',
    outcomeType: 'REFUND_ORDERED',
    remedyType: 'withdraw',
    delayMonths: 12,
    amountPaidPercentage: 80.0,
    awardedAmount: 6400000.0,
    interestRate: 11.1,
    sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000030114',
    summary:
      'MahaRERA held that even a 12-month delay entitles an allottee to exercise unconditional withdrawal under Section 18(1). The promoter was ordered to refund Rs. 64 Lakhs with interest at 11.10% (SBI MCLR + 2%) within 60 days. The bench emphasized that the agreement possession date is binding and cannot be altered unilaterally.',
  },
  {
    state: 'Maharashtra',
    orderDate: '2024-02-28',
    outcomeType: 'MONTHLY_DELAY_INTEREST',
    remedyType: 'continue',
    delayMonths: 30,
    amountPaidPercentage: 90.0,
    awardedAmount: 2250000.0,
    interestRate: 11.1,
    sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000034501',
    summary:
      'MahaRERA bench granted continuous monthly delay interest for 30 months of delayed construction in a Thane high-rise project. The complainant had paid 90% of the flat cost. The promoter was directed to pay Rs. 22.5 Lakhs in accrued arrears within 30 days and continue paying monthly interest until the grant of part Occupancy Certificate.',
  },
  {
    state: 'Karnataka',
    orderDate: '2023-09-14',
    outcomeType: 'REFUND_ORDERED',
    remedyType: 'withdraw',
    delayMonths: 48,
    amountPaidPercentage: 100.0,
    awardedAmount: 18000000.0,
    interestRate: 10.75,
    sourceUrl: 'https://rera.karnataka.gov.in/orders/COMP_2022_1904',
    summary:
      'In a severe 4-year delay on a Bengaluru luxury villa, Karnataka RERA ordered complete cancellation and refund of Rs. 1.80 Cr paid in full. Statutory simple interest under Section 18 was awarded from each date of deposit until full repayment, plus Rs. 1,00,000 in litigation costs.',
  },
  {
    state: 'Maharashtra',
    orderDate: '2023-12-05',
    outcomeType: 'MONTHLY_DELAY_INTEREST',
    remedyType: 'continue',
    delayMonths: 8,
    amountPaidPercentage: 75.0,
    awardedAmount: 420000.0,
    interestRate: 10.9,
    sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000028911',
    summary:
      'Under MahaRERA Rule 18, an 8-month delay entitled the allottee who paid 75% consideration to monthly interest. The Authority ordered payment of Rs. 4,20,000 for the accrued period and barred the promoter from demanding further payment milestone installments until construction reached the corresponding floor level.',
  },
  {
    state: 'Karnataka',
    orderDate: '2024-03-10',
    outcomeType: 'REFUND_ORDERED',
    remedyType: 'withdraw',
    delayMonths: 15,
    amountPaidPercentage: 70.0,
    awardedAmount: 5100000.0,
    interestRate: 11.1,
    sourceUrl: 'https://rera.karnataka.gov.in/orders/COMP_2023_0982',
    summary:
      'K-RERA ruled that a buyer who had disbursed 70% of flat cost was justified in withdrawing after 15 months delay without tower completion. The developer was ordered to refund Rs. 51 Lakhs with interest at 11.10% without making any forfeiture deductions or administrative penalty charges.',
  },
  {
    state: 'Maharashtra',
    orderDate: '2023-05-22',
    outcomeType: 'MONTHLY_DELAY_INTEREST',
    remedyType: 'continue',
    delayMonths: 40,
    amountPaidPercentage: 95.0,
    awardedAmount: 3100000.0,
    interestRate: 10.75,
    sourceUrl: 'https://maharera.maharashtra.gov.in/orders/CC00600000019208',
    summary:
      'A 40-month delay in a Navi Mumbai project resulted in MahaRERA directing the developer to pay Rs. 31,00,000 in accrued delay interest to the buyer who chose to stay in the project. The bench reiterated that possession without a valid Occupancy Certificate cannot stop the accrual of Section 18 delay interest.',
  },
];

export async function seedPhase5Data() {
  console.log('\n--- Seeding Phase 5: RERA Act Provisions & Precedents ---');

  // 1. Seed Act Provisions
  for (const prov of ACT_PROVISIONS_DATA) {
    const existing = await query(
      `SELECT id FROM act_provisions WHERE section_number = $1 AND (state = $2 OR (state IS NULL AND $2 IS NULL))`,
      [prov.sectionNumber, prov.state]
    );

    const embedding = await EmbeddingService.getEmbedding(`${prov.sectionNumber} ${prov.title} ${prov.fullText}`);
    const embeddingJson = EmbeddingService.formatForDb(embedding);

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO act_provisions (section_number, title, full_text, state, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [prov.sectionNumber, prov.title, prov.fullText, prov.state, embeddingJson]
      );
      console.log(`✓ Seeded provision: ${prov.sectionNumber}`);
    } else {
      await query(
        `UPDATE act_provisions 
         SET title = $1, full_text = $2, embedding = $3 
         WHERE id = $4`,
        [prov.title, prov.fullText, embeddingJson, existing.rows[0].id]
      );
      console.log(`✓ Updated provision: ${prov.sectionNumber}`);
    }
  }

  // 2. Seed Precedent Orders
  for (const prec of PRECEDENT_ORDERS_DATA) {
    const existing = await query(
      `SELECT id FROM precedent_orders WHERE source_url = $1`,
      [prec.sourceUrl]
    );

    const embeddingText = `${prec.state} ${prec.remedyType} delay ${prec.delayMonths} months paid ${prec.amountPaidPercentage}%: ${prec.summary}`;
    const embedding = await EmbeddingService.getEmbedding(embeddingText);
    const embeddingJson = EmbeddingService.formatForDb(embedding);

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO precedent_orders (
          state, order_date, outcome_type, remedy_type, delay_months,
          amount_paid_percentage, awarded_amount, interest_rate, source_url,
          summary, is_usable, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          prec.state,
          prec.orderDate,
          prec.outcomeType,
          prec.remedyType,
          prec.delayMonths,
          prec.amountPaidPercentage,
          prec.awardedAmount,
          prec.interestRate,
          prec.sourceUrl,
          prec.summary,
          true,
          embeddingJson,
        ]
      );
      console.log(`✓ Seeded precedent: [${prec.state}] ${prec.outcomeType} (${prec.delayMonths}m delay)`);
    } else {
      await query(
        `UPDATE precedent_orders 
         SET state = $1, order_date = $2, outcome_type = $3, remedy_type = $4,
             delay_months = $5, amount_paid_percentage = $6, awarded_amount = $7,
             interest_rate = $8, summary = $9, is_usable = $10, embedding = $11
         WHERE id = $12`,
        [
          prec.state,
          prec.orderDate,
          prec.outcomeType,
          prec.remedyType,
          prec.delayMonths,
          prec.amountPaidPercentage,
          prec.awardedAmount,
          prec.interestRate,
          prec.summary,
          true,
          embeddingJson,
          existing.rows[0].id,
        ]
      );
      console.log(`✓ Updated precedent: [${prec.state}] ${prec.outcomeType}`);
    }
  }

  console.log('✓ Phase 5 RAG Provisions & Precedents seed complete.\n');
}

// Allow direct CLI execution: node src/db/seeds/seed_phase5_rag.js
if (process.argv[1] && process.argv[1].endsWith('seed_phase5_rag.js')) {
  seedPhase5Data()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
