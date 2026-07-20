// ---------------------------------------------------------------------------
// Data contracts that mirror EXACTLY the FastAPI AI service payloads.
// Keep these in sync with the backend Pydantic models.
// ---------------------------------------------------------------------------

export type RiskTier = 'low' | 'medium' | 'high' | 'very_high';

export type ShapEffect = 'increase_risk' | 'decrease_risk';

export interface ApplicationInput {
  sk_id_curr: number;
  requested_at: string; // ISO datetime
  raw_fields: Record<string, unknown>;
}

export interface BureauSummary {
  active_credits: number;
  closed_credits: number;
  total_debt: number;
  overdue_debt: number;
  max_dpd: number;
}

export interface PriorApplicationsSummary {
  prior_app_count: number;
  approval_rate: number;
  refusal_rate: number;
  avg_requested_amt: number;
  avg_granted_amt: number;
}

export interface ApplicantFile {
  sk_id_curr: number;
  age_years: number;
  employment_tenure_years: number;
  income_total: number;
  credit_amount: number;
  dti_ratio: number;
  credit_to_income_ratio: number;
  thin_file: boolean;
  days_employed_anomaly: boolean;
  bureau: BureauSummary;
  prior_applications: PriorApplicationsSummary;
  ext_source_scores: number[];
  gender: string; // CODE_GENDER, e.g. "F" | "M"
  age_group: string; // e.g. "40-49"
  // Raw sentinel field surfaced for the pensioner/unemployed banner.
  days_employed?: number;
}

export interface ShapFactor {
  feature_name: string;
  shap_value: number;
  effect: ShapEffect;
}

export interface RiskScoringResult {
  probability_of_default: number;
  risk_tier: RiskTier;
  confidence_band: [number, number];
  low_confidence: boolean;
  top_shap_factors: ShapFactor[];
}

export interface PolicyCitation {
  clause_id: string;
  text_snippet: string;
}

export interface PolicyComplianceResult {
  applicable_rules: string[];
  rule_pass_fail: Record<string, boolean>;
  hard_stop_violations: string[];
  citations: PolicyCitation[];
  policy_undetermined: boolean;
}

export type DecisionVerdict =
  | 'recommend_approve'
  | 'recommend_decline'
  | 'refer_to_senior';

export interface DecisionRecord {
  sk_id_curr: number;
  decision: DecisionVerdict | string;
  confidence: number;
  top_reasons: string[];
  policy_citations: string[];
  explanation_narrative: string;
  fairness_flag: boolean;
  thin_file_flag: boolean;
  audit_trail: Record<string, unknown>;
  total_cost_usd: number;
}

export interface ReferralPackage {
  sk_id_curr: number;
  referred_at: string;
  reason_for_referral: string;
  escalation_flags: string[];
  partial_applicant_file: Partial<ApplicantFile> | Record<string, unknown>;
  partial_findings: {
    risk_tier: RiskTier | string;
    pd: number;
    hard_stop_violations: string[];
    fairness_flag: boolean;
    low_confidence: boolean;
    critic_failed: boolean;
  } & Record<string, unknown>;
  total_cost_usd: number;
}

// Discriminated union returned by POST /assess
export type AssessResponse =
  | ({ kind: 'decision' } & DecisionRecord)
  | ({ kind: 'referral' } & ReferralPackage);

// Escalation flag display metadata (referral queue tags).
export const ESCALATION_TAGS: Record<string, { short: string; label: string }> = {
  THIN_FILE: { short: 'THN', label: 'Thin-File' },
  LOW_CONFIDENCE: { short: 'LOW-CF', label: 'Low Confidence' },
  FAIRNESS: { short: 'BIAS', label: 'Fairness' },
  CRITIC_REJECTION: { short: 'CRT-REJ', label: 'Critic Rejection' },
};

// Adverse action taxonomy (required when declining), mapped to policy clauses.
export const ADVERSE_ACTION_CODES: Array<{
  code: string;
  label: string;
  policyClause: string;
}> = [
  { code: 'AA-DTI-HIGH', label: 'Debt-to-income ratio too high', policyClause: 'POL-DTI-001' },
  { code: 'AA-DELINQUENCY', label: 'Past delinquency / adverse repayment history', policyClause: 'POL-DPD-004' },
  { code: 'AA-THIN-FILE', label: 'Insufficient credit history', policyClause: 'POL-THN-003' },
  { code: 'AA-EMPLOYMENT', label: 'Insufficient / unverifiable employment', policyClause: 'POL-EMP-002' },
  { code: 'AA-OVERDUE-DEBT', label: 'Existing overdue debt', policyClause: 'POL-DPD-004' },
  { code: 'AA-CREDIT-AMOUNT', label: 'Requested amount exceeds capacity', policyClause: 'POL-CAP-005' },
];
