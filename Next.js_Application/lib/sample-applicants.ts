import type { ApplicantFile } from './types';

// ---------------------------------------------------------------------------
// Dummy applicant presets for testing the full pipeline. Selecting a preset in
// the New Application form fills every field the AI / backend needs. Each one
// is designed to exercise a different decision path.
// ---------------------------------------------------------------------------

export interface SamplePreset {
  id: string;
  label: string;
  description: string;
  expectedOutcome: string;
  // Full applicant file EXCEPT sk_id_curr (assigned at submit time).
  file: Omit<ApplicantFile, 'sk_id_curr'>;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'prime-approve',
    label: 'Prime borrower',
    description: 'Strong bureau scores, low DTI, long tenure.',
    expectedOutcome: 'Auto-approve (low risk)',
    file: {
      age_years: 41,
      employment_tenure_years: 11.5,
      income_total: 120000,
      credit_amount: 18000,
      dti_ratio: 0.14,
      credit_to_income_ratio: 0.15,
      thin_file: false,
      days_employed_anomaly: false,
      bureau: { active_credits: 2, closed_credits: 6, total_debt: 4200, overdue_debt: 0, max_dpd: 0 },
      prior_applications: { prior_app_count: 4, approval_rate: 0.75, refusal_rate: 0.25, avg_requested_amt: 16000, avg_granted_amt: 15000 },
      ext_source_scores: [0.82, 0.78, 0.85],
      gender: 'M',
      age_group: '40-49',
      days_employed: -4200,
    },
  },
  {
    id: 'standard-approve',
    label: 'Standard employed (medium)',
    description: 'Average scores, moderate DTI — borderline approve.',
    expectedOutcome: 'Approve (medium risk)',
    file: {
      age_years: 45,
      employment_tenure_years: 8.2,
      income_total: 85000,
      credit_amount: 20000,
      dti_ratio: 0.22,
      credit_to_income_ratio: 0.24,
      thin_file: false,
      days_employed_anomaly: false,
      bureau: { active_credits: 2, closed_credits: 4, total_debt: 3500, overdue_debt: 0, max_dpd: 0 },
      prior_applications: { prior_app_count: 3, approval_rate: 0.67, refusal_rate: 0.33, avg_requested_amt: 15000, avg_granted_amt: 12000 },
      ext_source_scores: [0.72, 0.68, 0.74],
      gender: 'F',
      age_group: '40-49',
      days_employed: -2900,
    },
  },
  {
    id: 'high-dti-decline',
    label: 'High DTI (hard stop)',
    description: 'DTI above the 50% policy cap — hard-stop decline.',
    expectedOutcome: 'Auto-decline (POL-DTI-001)',
    file: {
      age_years: 38,
      employment_tenure_years: 3.1,
      income_total: 42000,
      credit_amount: 30000,
      dti_ratio: 0.57,
      credit_to_income_ratio: 0.71,
      thin_file: false,
      days_employed_anomaly: false,
      bureau: { active_credits: 5, closed_credits: 2, total_debt: 24000, overdue_debt: 0, max_dpd: 15 },
      prior_applications: { prior_app_count: 2, approval_rate: 0.5, refusal_rate: 0.5, avg_requested_amt: 20000, avg_granted_amt: 9000 },
      ext_source_scores: [0.44, 0.51, 0.4],
      gender: 'M',
      age_group: '30-39',
      days_employed: -1130,
    },
  },
  {
    id: 'delinquency-decline',
    label: 'Past delinquency',
    description: 'Active overdue debt and high DPD — adverse history.',
    expectedOutcome: 'Decline (POL-DPD-004)',
    file: {
      age_years: 34,
      employment_tenure_years: 2.4,
      income_total: 55000,
      credit_amount: 22000,
      dti_ratio: 0.38,
      credit_to_income_ratio: 0.4,
      thin_file: false,
      days_employed_anomaly: false,
      bureau: { active_credits: 4, closed_credits: 1, total_debt: 18000, overdue_debt: 2600, max_dpd: 95 },
      prior_applications: { prior_app_count: 3, approval_rate: 0.33, refusal_rate: 0.67, avg_requested_amt: 21000, avg_granted_amt: 7000 },
      ext_source_scores: [0.38, 0.42, 0.35],
      gender: 'M',
      age_group: '30-39',
      days_employed: -880,
    },
  },
  {
    id: 'thin-file-referral',
    label: 'Thin file (referral)',
    description: 'Insufficient bureau history — refer for manual review.',
    expectedOutcome: 'Refer — [THN] Thin-File',
    file: {
      age_years: 26,
      employment_tenure_years: 1.2,
      income_total: 48000,
      credit_amount: 9000,
      dti_ratio: 0.19,
      credit_to_income_ratio: 0.19,
      thin_file: true,
      days_employed_anomaly: false,
      bureau: { active_credits: 0, closed_credits: 0, total_debt: 0, overdue_debt: 0, max_dpd: 0 },
      prior_applications: { prior_app_count: 0, approval_rate: 0, refusal_rate: 0, avg_requested_amt: 0, avg_granted_amt: 0 },
      ext_source_scores: [0.55],
      gender: 'F',
      age_group: '18-29',
      days_employed: -430,
    },
  },
  {
    id: 'pensioner-referral',
    label: 'Pensioner / unemployed',
    description: 'DAYS_EMPLOYED sentinel (365243) — manual income verification.',
    expectedOutcome: 'Refer — manual income verification',
    file: {
      age_years: 67,
      employment_tenure_years: 0,
      income_total: 32000,
      credit_amount: 12000,
      dti_ratio: 0.28,
      credit_to_income_ratio: 0.38,
      thin_file: false,
      days_employed_anomaly: true,
      bureau: { active_credits: 1, closed_credits: 5, total_debt: 2000, overdue_debt: 0, max_dpd: 0 },
      prior_applications: { prior_app_count: 2, approval_rate: 0.5, refusal_rate: 0.5, avg_requested_amt: 10000, avg_granted_amt: 9000 },
      ext_source_scores: [0.6, 0.58, 0.63],
      gender: 'F',
      age_group: '60-69',
      days_employed: 365243,
    },
  },
  {
    id: 'fairness-referral',
    label: 'Fairness-flag cohort',
    description: 'Older female cohort with borderline risk — fairness monitor.',
    expectedOutcome: 'Refer — [BIAS] Fairness',
    file: {
      age_years: 63,
      employment_tenure_years: 6.0,
      income_total: 51000,
      credit_amount: 21000,
      dti_ratio: 0.34,
      credit_to_income_ratio: 0.41,
      thin_file: false,
      days_employed_anomaly: false,
      bureau: { active_credits: 3, closed_credits: 3, total_debt: 9000, overdue_debt: 0, max_dpd: 10 },
      prior_applications: { prior_app_count: 4, approval_rate: 0.5, refusal_rate: 0.5, avg_requested_amt: 18000, avg_granted_amt: 12000 },
      ext_source_scores: [0.49, 0.46, 0.52],
      gender: 'F',
      age_group: '60-69',
      days_employed: -2200,
    },
  },
];

export function getPreset(id: string): SamplePreset | undefined {
  return SAMPLE_PRESETS.find((p) => p.id === id);
}
