from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Literal, Dict, Any, Tuple

class ApplicationInput(BaseModel):
    sk_id_curr: int
    requested_at: datetime
    raw_fields: Dict[str, Any]  # Normalised by Data Assembly Agent

class BureauSummary(BaseModel):
    active_credits: int = 0
    closed_credits: int = 0
    total_debt: float = 0.0
    overdue_debt: float = 0.0
    max_dpd: int = 0

class PriorApplicationSummary(BaseModel):
    prior_app_count: int = 0
    approval_rate: float = 0.0
    refusal_rate: float = 0.0
    avg_requested_amt: float = 0.0
    avg_granted_amt: float = 0.0

class ApplicantFile(BaseModel):
    sk_id_curr: int
    age_years: float
    employment_tenure_years: Optional[float]
    income_total: float
    credit_amount: float
    dti_ratio: float                # annuity / income
    credit_to_income_ratio: float
    thin_file: bool                 # True = no bureau history
    days_employed_anomaly: bool     # True = sentinel value detected
    bureau: BureauSummary
    prior_applications: PriorApplicationSummary
    ext_source_scores: List[Optional[float]]
    gender: str = "Unspecified"     # for fairness checks
    age_group: str = "Unspecified"  # for fairness checks

class ShapFactor(BaseModel):
    feature_name: str
    shap_value: float               # positive pushes toward default, negative away
    effect: Literal["increase_risk", "decrease_risk"]

class RiskScoringResult(BaseModel):
    probability_of_default: float          # calibrated 0-1
    risk_tier: Literal["low", "medium", "high", "very_high"]
    confidence_band: Tuple[float, float]   # 90% interval
    low_confidence: bool                   # True = route to human
    top_shap_factors: List[ShapFactor]     # top 5 signed

class PolicyCitation(BaseModel):
    clause_id: str
    text_snippet: str

class PolicyComplianceResult(BaseModel):
    applicable_rules: List[str]
    rule_pass_fail: Dict[str, bool]
    hard_stop_violations: List[str]
    citations: List[PolicyCitation]
    policy_undetermined: bool = False

class FairnessCheckResult(BaseModel):
    fairness_flag: bool                    # True = triggers review due to outlier
    segment_metrics: Dict[str, Any]
    check_status: Literal["passed", "flagged", "insufficient_data"]

class CriticVerdict(BaseModel):
    approved: bool
    critique_notes: str
    retry_count: int

class DecisionRecord(BaseModel):
    sk_id_curr: int
    decision: Literal["recommend_approve", "recommend_decline", "refer_to_human"]
    confidence: float
    top_reasons: List[str]          # max 5, each citing SHAP or policy clause
    policy_citations: List[str]     # clause IDs cited
    explanation_narrative: str      # human-readable explanation
    fairness_flag: bool
    thin_file_flag: bool
    audit_trail: Dict[str, Any]     # full agent step log
    total_cost_usd: float

class ReferralPackage(BaseModel):
    sk_id_curr: int
    referred_at: datetime
    reason_for_referral: str        # e.g., thin-file, fairness flag, critic rejected, low confidence
    escalation_flags: List[str]
    partial_applicant_file: Optional[ApplicantFile] = None
    partial_findings: Dict[str, Any]
    total_cost_usd: float
