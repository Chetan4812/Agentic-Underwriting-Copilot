import type {
  ApplicantFile,
  AssessResponse,
  PolicyComplianceResult,
  RiskScoringResult,
  RiskTier,
  ShapFactor,
} from './types';

// ---------------------------------------------------------------------------
// Deterministic MOCK AI engine.
// Reproduces the *shape* of the 9-agent pipeline output (risk scoring, SHAP,
// policy compliance, and a final DecisionRecord / ReferralPackage) directly
// from an ApplicantFile, so the whole system is testable end-to-end WITHOUT
// the FastAPI service running. Pure + deterministic (no randomness).
// ---------------------------------------------------------------------------

export const DAYS_EMPLOYED_SENTINEL = 365243;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round(x: number, dp = 4): number {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}

function mean(xs: number[]): number {
  if (!xs || xs.length === 0) return 0.5;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function tierFromPd(pd: number): RiskTier {
  if (pd < 0.05) return 'low';
  if (pd < 0.12) return 'medium';
  if (pd < 0.25) return 'high';
  return 'very_high';
}

export interface FullAssessment {
  risk: RiskScoringResult;
  compliance: PolicyComplianceResult;
  outcome: AssessResponse;
  fairnessFlag: boolean;
  thinFileFlag: boolean;
  lowConfidence: boolean;
}

const CLAUSE_TEXT: Record<string, string> = {
  'POL-DTI-001':
    'The maximum allowable debt-to-income (DTI) ratio for any unsecured personal loan is 50%. Applications exceeding this threshold are a hard stop.',
  'POL-EMP-002':
    'Applicants must demonstrate verifiable employment. Pensioner or unemployed profiles (DAYS_EMPLOYED sentinel) require manual income verification before a decision.',
  'POL-THN-003':
    'Thin-file applicants (insufficient bureau history) must be referred for manual review and alternative-data verification.',
  'POL-DPD-004':
    'Any active overdue debt or a maximum days-past-due (DPD) of 30 or more constitutes adverse repayment history and blocks automated approval.',
  'POL-CAP-005':
    'Requested credit must not exceed 5x the applicant total income (credit-to-income ratio cap).',
};

export function computeAssessment(file: ApplicantFile): FullAssessment {
  const extAvg = mean(file.ext_source_scores);
  const dti = file.dti_ratio ?? 0;
  const overdue = file.bureau?.overdue_debt ?? 0;
  const maxDpd = file.bureau?.max_dpd ?? 0;
  const tenure = file.employment_tenure_years ?? 0;
  const anomaly =
    file.days_employed_anomaly || file.days_employed === DAYS_EMPLOYED_SENTINEL;

  // --- Probability of default (calibrated-ish heuristic) ---
  let pd =
    0.02 +
    (1 - extAvg) * 0.18 +
    Math.max(0, dti - 0.3) * 0.55 +
    (overdue > 0 ? 0.05 : 0) +
    (maxDpd >= 30 ? 0.05 : 0) +
    (file.thin_file ? 0.03 : 0) +
    (anomaly ? 0.02 : 0);
  pd = round(clamp(pd, 0.005, 0.95));
  const tier = tierFromPd(pd);

  // --- Confidence band ---
  let halfWidth = 0.02 + (file.thin_file ? 0.03 : 0) + (anomaly ? 0.02 : 0);
  const bandLower = round(clamp(pd - halfWidth, 0, 1));
  const bandUpper = round(clamp(pd + halfWidth, 0, 1));
  const lowConfidence = bandUpper - bandLower > 0.08 || file.thin_file;

  // --- Fairness heuristic (demographic parity proxy) ---
  const olderCohort = ['50-59', '60-69', '70+'].includes(file.age_group);
  const fairnessFlag = Boolean(olderCohort && file.gender === 'F' && pd > 0.09);

  // --- SHAP factors (contributions to default log-odds) ---
  const shap: ShapFactor[] = [];
  const extContribution = round((0.5 - extAvg) * 0.9);
  shap.push({
    feature_name: 'ext_source_scores_avg',
    shap_value: extContribution,
    effect: extContribution >= 0 ? 'increase_risk' : 'decrease_risk',
  });
  const dtiContribution = round((dti - 0.3) * 0.8);
  shap.push({
    feature_name: 'dti_ratio',
    shap_value: dtiContribution,
    effect: dtiContribution >= 0 ? 'increase_risk' : 'decrease_risk',
  });
  const tenureContribution = round(-Math.min(tenure, 15) * 0.02);
  shap.push({
    feature_name: 'employment_tenure_years',
    shap_value: tenureContribution,
    effect: tenureContribution >= 0 ? 'increase_risk' : 'decrease_risk',
  });
  const overdueContribution = round(overdue > 0 ? 0.18 : -0.04);
  shap.push({
    feature_name: 'bureau_overdue_debt',
    shap_value: overdueContribution,
    effect: overdueContribution >= 0 ? 'increase_risk' : 'decrease_risk',
  });
  const priorContribution = round((0.5 - (file.prior_applications?.approval_rate ?? 0.5)) * 0.2);
  shap.push({
    feature_name: 'prior_approval_rate',
    shap_value: priorContribution,
    effect: priorContribution >= 0 ? 'increase_risk' : 'decrease_risk',
  });
  shap.sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  const risk: RiskScoringResult = {
    probability_of_default: pd,
    risk_tier: tier,
    confidence_band: [bandLower, bandUpper],
    low_confidence: lowConfidence,
    top_shap_factors: shap,
  };

  // --- Policy compliance ---
  const rulePass: Record<string, boolean> = {
    'POL-DTI-001': dti <= 0.5,
    'POL-EMP-002': !anomaly && tenure >= 0.5,
    'POL-THN-003': !file.thin_file,
    'POL-DPD-004': overdue <= 0 && maxDpd < 30,
    'POL-CAP-005': (file.credit_to_income_ratio ?? 0) <= 5,
  };
  const applicableRules = Object.keys(rulePass);
  const hardStops: string[] = [];
  if (!rulePass['POL-DTI-001']) hardStops.push('POL-DTI-001');
  if (overdue > 0 || maxDpd >= 90) hardStops.push('POL-DPD-004');

  const citations = applicableRules.map((clause) => ({
    clause_id: clause,
    text_snippet: CLAUSE_TEXT[clause] ?? 'Policy clause.',
  }));

  const compliance: PolicyComplianceResult = {
    applicable_rules: applicableRules,
    rule_pass_fail: rulePass,
    hard_stop_violations: hardStops,
    citations,
    policy_undetermined: false,
  };

  // --- Decide referral vs decision ---
  const escalationFlags: string[] = [];
  if (file.thin_file) escalationFlags.push('THIN_FILE');
  if (lowConfidence && !file.thin_file) escalationFlags.push('LOW_CONFIDENCE');
  if (fairnessFlag) escalationFlags.push('FAIRNESS');

  const cost = round(0.0011 + shap.length * 0.0004 + (anomaly ? 0.0009 : 0), 4);
  const nowIso = new Date().toISOString();

  const mustRefer = escalationFlags.length > 0 && hardStops.length === 0;

  if (mustRefer) {
    const reasonParts: string[] = [];
    if (file.thin_file)
      reasonParts.push('Thin credit-history file; requires alternative-data / utility verification.');
    if (anomaly)
      reasonParts.push('Pensioner / unemployed profile (DAYS_EMPLOYED sentinel); manual income verification required.');
    if (fairnessFlag)
      reasonParts.push('Fairness monitor flagged a potential disparate-impact pattern for this cohort.');
    if (lowConfidence && !file.thin_file)
      reasonParts.push('Model confidence band is wide; escalate for senior review.');

    const referral: AssessResponse = {
      kind: 'referral',
      sk_id_curr: file.sk_id_curr,
      referred_at: nowIso,
      reason_for_referral: reasonParts.join(' '),
      escalation_flags: escalationFlags,
      partial_applicant_file: file as unknown as Record<string, unknown>,
      partial_findings: {
        risk_tier: tier,
        pd,
        hard_stop_violations: hardStops,
        fairness_flag: fairnessFlag,
        low_confidence: lowConfidence,
        critic_failed: false,
      },
      total_cost_usd: cost,
    };
    return { risk, compliance, outcome: referral, fairnessFlag, thinFileFlag: file.thin_file, lowConfidence };
  }

  // Decision path
  let decision: string;
  const reasons: string[] = [];
  if (hardStops.length > 0) {
    decision = 'recommend_decline';
    if (!rulePass['POL-DTI-001'])
      reasons.push(`DTI ratio of ${(dti * 100).toFixed(2)}% exceeds the 50% policy cap (POL-DTI-001).`);
    if (overdue > 0) reasons.push('Active overdue debt on bureau record (POL-DPD-004).');
  } else if (tier === 'very_high') {
    decision = 'recommend_decline';
    reasons.push(`Very high modelled default probability (${(pd * 100).toFixed(2)}%).`);
  } else if (tier === 'high') {
    decision = 'refer_to_senior';
    reasons.push(`Elevated risk tier (${tier}); senior sign-off recommended.`);
  } else {
    decision = 'recommend_approve';
    reasons.push(`Low modelled risk (tier: ${tier}, PD ${(pd * 100).toFixed(2)}%).`);
    reasons.push(`DTI ratio of ${(dti * 100).toFixed(2)}% is within policy limits.`);
    if (extAvg >= 0.6) reasons.push('Strong external bureau scores support repayment capacity.');
  }

  const confidence = round(clamp(1 - (bandUpper - bandLower) * 3, 0.55, 0.98), 3);
  const verb =
    decision === 'recommend_approve'
      ? 'approve'
      : decision === 'recommend_decline'
        ? 'decline'
        : 'refer to a senior underwriter';
  const narrative =
    `Based on the calibrated risk model, this applicant carries a ${tier} risk tier with an ` +
    `estimated probability of default of ${(pd * 100).toFixed(2)}% (confidence band ` +
    `${(bandLower * 100).toFixed(1)}%–${(bandUpper * 100).toFixed(1)}%). ` +
    `Debt-to-income stands at ${(dti * 100).toFixed(2)}% and the external bureau score average is ` +
    `${extAvg.toFixed(2)}. Policy checks ${hardStops.length === 0 ? 'passed with no hard-stop violations' : 'raised hard-stop violations'}. ` +
    `The system therefore recommends to ${verb}.`;

  const decisionRecord: AssessResponse = {
    kind: 'decision',
    sk_id_curr: file.sk_id_curr,
    decision,
    confidence,
    top_reasons: reasons,
    policy_citations: applicableRules.filter((r) => !rulePass[r] || r === 'POL-DTI-001'),
    explanation_narrative: narrative,
    fairness_flag: fairnessFlag,
    thin_file_flag: file.thin_file,
    audit_trail: {
      data_assembly_timestamp: nowIso,
      income_check: anomaly ? 'manual_verification_required' : 'standard_employed',
      overdue_debt: overdue,
      ext_source_avg: round(extAvg, 3),
      critic_retries: 0,
      engine: 'mock',
    },
    total_cost_usd: cost,
  };

  return { risk, compliance, outcome: decisionRecord, fairnessFlag, thinFileFlag: file.thin_file, lowConfidence };
}
