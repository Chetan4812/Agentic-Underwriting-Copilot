import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PW = process.env.SEED_DEFAULT_PASSWORD ?? 'Password123!';
const SUPERADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL ?? 'superadmin@halcyoncredit.com';
const SUPERADMIN_PW = process.env.SEED_SUPERADMIN_PASSWORD ?? 'SuperAdmin123!';

async function main() {
  console.log('Seeding demo data...');

  const defaultHash = await bcrypt.hash(DEFAULT_PW, 10);
  const superHash = await bcrypt.hash(SUPERADMIN_PW, 10);

  // --- Users (one per role, plus a bootstrap Super Admin) ---
  const [superadmin, priya, daniel, elena, maria, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: SUPERADMIN_EMAIL },
      update: { role: 'SUPER_ADMIN', passwordHash: superHash, isActive: true },
      create: { name: 'Root Super Admin', email: SUPERADMIN_EMAIL, role: 'SUPER_ADMIN', passwordHash: superHash },
    }),
    prisma.user.upsert({
      where: { email: 'priya@halcyoncredit.com' },
      update: { passwordHash: defaultHash },
      create: { name: 'Priya Nair', email: 'priya@halcyoncredit.com', role: 'FRONTLINE_UNDERWRITER', passwordHash: defaultHash },
    }),
    prisma.user.upsert({
      where: { email: 'daniel@halcyoncredit.com' },
      update: { passwordHash: defaultHash },
      create: { name: 'Daniel Okafor', email: 'daniel@halcyoncredit.com', role: 'SENIOR_UNDERWRITER', passwordHash: defaultHash },
    }),
    prisma.user.upsert({
      where: { email: 'elena@halcyoncredit.com' },
      update: { passwordHash: defaultHash },
      create: { name: 'Elena Rossi', email: 'elena@halcyoncredit.com', role: 'COMPLIANCE_OFFICER', passwordHash: defaultHash },
    }),
    prisma.user.upsert({
      where: { email: 'maria@halcyoncredit.com' },
      update: { passwordHash: defaultHash },
      create: { name: 'Maria Alvarez', email: 'maria@halcyoncredit.com', role: 'OPERATIONS_LEAD', passwordHash: defaultHash },
    }),
    prisma.user.upsert({
      where: { email: 'admin@halcyoncredit.com' },
      update: { passwordHash: defaultHash },
      create: { name: 'System Admin', email: 'admin@halcyoncredit.com', role: 'ADMIN', passwordHash: defaultHash },
    }),
  ]);
  void superadmin;
  console.log(`Seeded users. Super Admin: ${SUPERADMIN_EMAIL} / ${SUPERADMIN_PW}`);
  console.log(`Other demo users use password: ${DEFAULT_PW}`);

  // --- Helper to build a fully-populated application ---
  type Effect = 'increase_risk' | 'decrease_risk';
  async function createApp(opts: {
    id: number;
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ESCALATED';
    loanAmount: number;
    dti: number;
    riskTier: 'low' | 'medium' | 'high' | 'very_high';
    pd: number;
    band: [number, number];
    thinFile?: boolean;
    lowConf?: boolean;
    fairness?: boolean;
    daysEmployed?: number;
    gender: string;
    ageGroup: string;
    ageYears: number;
    income: number;
    assignedTo?: string | null;
    shap: Array<{ f: string; v: number; e: Effect }>;
    citations: Array<{ id: string; text: string; passed: boolean }>;
    decision?: {
      verdict: string;
      confidence: number;
      narrative: string;
      reasons: string[];
      cost: number;
      actionedBy?: string;
    };
    referral?: { reason: string; flags: string[] };
  }) {
    const daysEmployed = opts.daysEmployed ?? -Math.round(opts.ageYears * 30);
    await prisma.underwritingApplication.upsert({
      where: { skIdCurr: opts.id },
      update: {},
      create: {
        skIdCurr: opts.id,
        status: opts.status,
        loanAmount: opts.loanAmount,
        dtiRatio: opts.dti,
        assignedToUserId: opts.assignedTo ?? null,
        rawFields: { SK_ID_CURR: opts.id, DAYS_EMPLOYED: daysEmployed, CODE_GENDER: opts.gender },
        applicantFile: {
          sk_id_curr: opts.id,
          age_years: opts.ageYears,
          employment_tenure_years: Math.max(0, Math.round((-daysEmployed / 365) * 10) / 10),
          income_total: opts.income,
          credit_amount: opts.loanAmount,
          dti_ratio: opts.dti,
          credit_to_income_ratio: Math.round((opts.loanAmount / opts.income) * 100) / 100,
          thin_file: !!opts.thinFile,
          days_employed_anomaly: daysEmployed === 365243,
          days_employed: daysEmployed,
          bureau: { active_credits: 2, closed_credits: 4, total_debt: 3500, overdue_debt: opts.riskTier === 'high' ? 1200 : 0, max_dpd: opts.riskTier === 'high' ? 45 : 0 },
          prior_applications: { prior_app_count: 3, approval_rate: 0.67, refusal_rate: 0.33, avg_requested_amt: 15000, avg_granted_amt: 12000 },
          ext_source_scores: [0.72, 0.68, 0.74],
          gender: opts.gender,
          age_group: opts.ageGroup,
        },
        assessment: {
          create: {
            defaultProbability: opts.pd,
            riskTier: opts.riskTier,
            confidenceBandLower: opts.band[0],
            confidenceBandUpper: opts.band[1],
            lowConfidenceFlag: !!opts.lowConf,
            thinFileFlag: !!opts.thinFile,
            fairnessFlag: !!opts.fairness,
          },
        },
        shapFactors: { create: opts.shap.map((s) => ({ featureName: s.f, shapValue: s.v, effect: s.e })) },
        policyCitations: { create: opts.citations.map((c) => ({ clauseId: c.id, textSnippet: c.text, passed: c.passed })) },
        ...(opts.decision
          ? {
              decisionRecord: {
                create: {
                  decisionRecommendation: opts.decision.verdict,
                  confidence: opts.decision.confidence,
                  explanationNarrative: opts.decision.narrative,
                  topReasons: opts.decision.reasons,
                  policyCitations: opts.citations.map((c) => c.id),
                  auditTrail: { data_assembly_timestamp: new Date().toISOString(), income_check: daysEmployed === 365243 ? 'pensioner_unemployed' : 'standard_employed', overdue_debt: 0, critic_retries: 0 },
                  finalCostUsd: opts.decision.cost,
                  actionedByUserId: opts.decision.actionedBy ?? null,
                  actionedAt: opts.decision.actionedBy ? new Date() : null,
                },
              },
            }
          : {}),
        ...(opts.referral
          ? {
              referralPackage: {
                create: {
                  reasonForReferral: opts.referral.reason,
                  escalationFlags: opts.referral.flags,
                  partialFindings: { risk_tier: opts.riskTier, pd: opts.pd, hard_stop_violations: [], fairness_flag: !!opts.fairness, low_confidence: !!opts.lowConf, critic_failed: opts.referral.flags.includes('CRITIC_REJECTION') },
                },
              },
            }
          : {}),
      },
    });
  }

  await createApp({ id: 100002, status: 'PENDING', loanAmount: 20000, dti: 0.22, riskTier: 'medium', pd: 0.082, band: [0.062, 0.102], gender: 'F', ageGroup: '40-49', ageYears: 45, income: 85000, assignedTo: priya.id,
    shap: [ { f: 'ext_source_scores_avg', v: -0.2, e: 'decrease_risk' }, { f: 'dti_ratio', v: 0.05, e: 'increase_risk' }, { f: 'employment_tenure_years', v: -0.08, e: 'decrease_risk' }, { f: 'overdue_debt', v: 0.02, e: 'increase_risk' } ],
    citations: [ { id: 'POL-DTI-001', text: 'The maximum allowable DTI ratio for any personal loan is 50%. Applicants below 30% are auto-eligible.', passed: true }, { id: 'POL-EMP-002', text: 'Employment tenure of at least 6 months is required unless offsetting assets are verified.', passed: true } ],
    decision: { verdict: 'recommend_approve', confidence: 0.918, narrative: 'The applicant presents a medium risk profile with a probability of default of 8.2%. External bureau scores are strong (avg 0.71) and DTI of 22% is comfortably within policy limits. No hard-stop violations detected.', reasons: ['Low risk score (tier: medium)', 'DTI ratio of 22.00% is within limits.'], cost: 0.0015 } });

  await createApp({ id: 100004, status: 'ESCALATED', loanAmount: 12000, dti: 0.31, riskTier: 'medium', pd: 0.091, band: [0.05, 0.16], thinFile: true, gender: 'M', ageGroup: '20-29', ageYears: 24, income: 32000, assignedTo: null,
    shap: [ { f: 'thin_file', v: 0.18, e: 'increase_risk' }, { f: 'age_years', v: 0.06, e: 'increase_risk' }, { f: 'ext_source_scores_avg', v: -0.04, e: 'decrease_risk' } ],
    citations: [ { id: 'POL-THN-003', text: 'Files with fewer than 3 tradelines require supplementary verification (utility / rental).', passed: false } ],
    referral: { reason: 'Thin credit history file, requires utility verification.', flags: ['THIN_FILE'] } });

  await createApp({ id: 100007, status: 'ESCALATED', loanAmount: 45000, dti: 0.48, riskTier: 'high', pd: 0.21, band: [0.14, 0.28], lowConf: true, gender: 'M', ageGroup: '50-59', ageYears: 54, income: 61000, assignedTo: daniel.id,
    shap: [ { f: 'dti_ratio', v: 0.22, e: 'increase_risk' }, { f: 'overdue_debt', v: 0.14, e: 'increase_risk' }, { f: 'max_dpd', v: 0.09, e: 'increase_risk' }, { f: 'ext_source_scores_avg', v: -0.03, e: 'decrease_risk' } ],
    citations: [ { id: 'POL-DTI-001', text: 'The maximum allowable DTI ratio for any personal loan is 50%.', passed: true }, { id: 'POL-DPD-004', text: 'Any account with 30+ days past due in the last 12 months triggers senior review.', passed: false } ],
    referral: { reason: 'High model uncertainty near the decision boundary; overdue debt present.', flags: ['LOW_CONFIDENCE', 'CRITIC_REJECTION'] } });

  await createApp({ id: 100010, status: 'ESCALATED', loanAmount: 18000, dti: 0.27, riskTier: 'medium', pd: 0.099, band: [0.07, 0.13], fairness: true, gender: 'F', ageGroup: '60-69', ageYears: 63, daysEmployed: 365243, income: 40000, assignedTo: null,
    shap: [ { f: 'age_group', v: 0.11, e: 'increase_risk' }, { f: 'gender', v: 0.07, e: 'increase_risk' }, { f: 'ext_source_scores_avg', v: -0.05, e: 'decrease_risk' } ],
    citations: [ { id: 'POL-EMP-002', text: 'Employment tenure of at least 6 months is required unless offsetting assets are verified.', passed: false } ],
    referral: { reason: 'Fairness flag raised on age/gender parity; pensioner profile needs manual income verification.', flags: ['FAIRNESS', 'THIN_FILE'] } });

  await createApp({ id: 100015, status: 'APPROVED', loanAmount: 9000, dti: 0.14, riskTier: 'low', pd: 0.031, band: [0.02, 0.045], gender: 'F', ageGroup: '30-39', ageYears: 34, income: 72000, assignedTo: priya.id,
    shap: [ { f: 'ext_source_scores_avg', v: -0.26, e: 'decrease_risk' }, { f: 'dti_ratio', v: -0.06, e: 'decrease_risk' } ],
    citations: [ { id: 'POL-DTI-001', text: 'The maximum allowable DTI ratio for any personal loan is 50%.', passed: true } ],
    decision: { verdict: 'recommend_approve', confidence: 0.964, narrative: 'Low risk profile, strong bureau scores and very low DTI. Auto-approved.', reasons: ['Low risk score (tier: low)', 'DTI ratio of 14.00% is well within limits.'], cost: 0.0012, actionedBy: priya.id } });

  await createApp({ id: 100021, status: 'DECLINED', loanAmount: 52000, dti: 0.57, riskTier: 'very_high', pd: 0.34, band: [0.28, 0.41], gender: 'M', ageGroup: '30-39', ageYears: 38, income: 48000, assignedTo: daniel.id,
    shap: [ { f: 'dti_ratio', v: 0.31, e: 'increase_risk' }, { f: 'credit_to_income_ratio', v: 0.19, e: 'increase_risk' }, { f: 'overdue_debt', v: 0.12, e: 'increase_risk' } ],
    citations: [ { id: 'POL-DTI-001', text: 'The maximum allowable DTI ratio for any personal loan is 50%.', passed: false } ],
    decision: { verdict: 'recommend_decline', confidence: 0.89, narrative: 'DTI of 57% exceeds the 50% hard limit and the requested amount is disproportionate to income. Declined.', reasons: ['DTI ratio of 57.00% exceeds policy limit of 50%.', 'Very high risk tier.'], cost: 0.0018, actionedBy: daniel.id } });

  await createApp({ id: 100024, status: 'PENDING', loanAmount: 15000, dti: 0.19, riskTier: 'low', pd: 0.041, band: [0.03, 0.06], gender: 'M', ageGroup: '40-49', ageYears: 47, income: 90000, assignedTo: null,
    shap: [ { f: 'ext_source_scores_avg', v: -0.21, e: 'decrease_risk' }, { f: 'employment_tenure_years', v: -0.09, e: 'decrease_risk' }, { f: 'dti_ratio', v: 0.03, e: 'increase_risk' } ],
    citations: [ { id: 'POL-DTI-001', text: 'The maximum allowable DTI ratio for any personal loan is 50%.', passed: true }, { id: 'POL-EMP-002', text: 'Employment tenure of at least 6 months is required.', passed: true } ],
    decision: { verdict: 'recommend_approve', confidence: 0.933, narrative: 'Solid low-risk applicant with high income and stable employment.', reasons: ['Low risk score (tier: low)', 'DTI within limits.'], cost: 0.0014 } });

  console.log('Seed complete: 5 users, 7 applications.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
