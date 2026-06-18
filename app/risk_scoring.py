import math
from typing import Dict, Any, List, Tuple
from app.models import RiskScoringResult, ShapFactor, ApplicantFile

class CalibratedRiskModel:
    def __init__(self, base_log_odds: float = -2.5):
        # Base log-odds corresponds to ~7.5% base default probability
        self.base_log_odds = base_log_odds

    def predict_and_explain(self, applicant: ApplicantFile) -> RiskScoringResult:
        """
        Simulates a calibrated LightGBM model score and returns tree-based SHAP contributions.
        Calculates impact on the log-odds scale and maps to probability via a sigmoid link.
        """
        log_odds = self.base_log_odds
        shap_contributions = []

        # 1. DTI Ratio contribution
        if applicant.dti_ratio > 0.50:
            dti_odds = 1.8
            log_odds += dti_odds
            shap_contributions.append(ShapFactor(feature_name="dti_ratio", shap_value=dti_odds, effect="increase_risk"))
        elif applicant.dti_ratio > 0.40:
            dti_odds = 0.8
            log_odds += dti_odds
            shap_contributions.append(ShapFactor(feature_name="dti_ratio", shap_value=dti_odds, effect="increase_risk"))
        else:
            dti_odds = -0.4
            log_odds += dti_odds
            shap_contributions.append(ShapFactor(feature_name="dti_ratio", shap_value=dti_odds, effect="decrease_risk"))

        # 2. Thin File contribution
        if applicant.thin_file:
            thin_odds = 1.2
            log_odds += thin_odds
            shap_contributions.append(ShapFactor(feature_name="thin_file", shap_value=thin_odds, effect="increase_risk"))
        else:
            thin_odds = -0.3
            log_odds += thin_odds
            shap_contributions.append(ShapFactor(feature_name="thin_file", shap_value=thin_odds, effect="decrease_risk"))

        # 3. External Source Scores (Opacities)
        valid_ext_scores = [s for s in applicant.ext_source_scores if s is not None]
        if valid_ext_scores:
            avg_ext = sum(valid_ext_scores) / len(valid_ext_scores)
            if avg_ext < 0.3:
                ext_odds = 1.5
                log_odds += ext_odds
                shap_contributions.append(ShapFactor(feature_name="ext_source_scores_avg", shap_value=ext_odds, effect="increase_risk"))
            elif avg_ext > 0.7:
                ext_odds = -1.2
                log_odds += ext_odds
                shap_contributions.append(ShapFactor(feature_name="ext_source_scores_avg", shap_value=ext_odds, effect="decrease_risk"))
            else:
                ext_odds = -0.2
                log_odds += ext_odds
                shap_contributions.append(ShapFactor(feature_name="ext_source_scores_avg", shap_value=ext_odds, effect="decrease_risk"))
        else:
            ext_odds = 0.8  # penalty for complete missingness of bureau scores
            log_odds += ext_odds
            shap_contributions.append(ShapFactor(feature_name="ext_source_scores_missing", shap_value=ext_odds, effect="increase_risk"))

        # 4. Credit to Income Leverage
        if applicant.credit_to_income_ratio > 4.0:
            ltv_odds = 1.1
            log_odds += ltv_odds
            shap_contributions.append(ShapFactor(feature_name="credit_to_income_ratio", shap_value=ltv_odds, effect="increase_risk"))
        elif applicant.credit_to_income_ratio > 2.0:
            ltv_odds = 0.3
            log_odds += ltv_odds
            shap_contributions.append(ShapFactor(feature_name="credit_to_income_ratio", shap_value=ltv_odds, effect="increase_risk"))
        else:
            ltv_odds = -0.3
            log_odds += ltv_odds
            shap_contributions.append(ShapFactor(feature_name="credit_to_income_ratio", shap_value=ltv_odds, effect="decrease_risk"))

        # 5. Overdue Debt
        if applicant.bureau.overdue_debt > 500:
            overdue_odds = 1.6
            log_odds += overdue_odds
            shap_contributions.append(ShapFactor(feature_name="bureau_overdue_debt", shap_value=overdue_odds, effect="increase_risk"))
        elif applicant.bureau.overdue_debt > 0:
            overdue_odds = 0.6
            log_odds += overdue_odds
            shap_contributions.append(ShapFactor(feature_name="bureau_overdue_debt", shap_value=overdue_odds, effect="increase_risk"))

        # 6. Prior Application Refusals
        if applicant.prior_applications.refusal_rate > 0.5:
            refusal_odds = 0.8
            log_odds += refusal_odds
            shap_contributions.append(ShapFactor(feature_name="prior_refusal_rate", shap_value=refusal_odds, effect="increase_risk"))

        # 7. Employment Tenure & Days Employed Anomaly
        if applicant.days_employed_anomaly:
            anomaly_odds = 0.4
            log_odds += anomaly_odds
            shap_contributions.append(ShapFactor(feature_name="days_employed_anomaly", shap_value=anomaly_odds, effect="increase_risk"))
        elif applicant.employment_tenure_years is not None and applicant.employment_tenure_years < 0.5:
            tenure_odds = 0.6
            log_odds += tenure_odds
            shap_contributions.append(ShapFactor(feature_name="employment_tenure_short", shap_value=tenure_odds, effect="increase_risk"))

        # Apply Sigmoid Link to Calibrate Probability of Default
        pd = 1.0 / (1.0 + math.exp(-log_odds))

        # Risk tiering
        if pd < 0.05:
            risk_tier = "low"
        elif pd < 0.15:
            risk_tier = "medium"
        elif pd < 0.30:
            risk_tier = "high"
        else:
            risk_tier = "very_high"

        # Determine confidence interval (width expands if key variables are missing or anomalous)
        uncertainty = 0.02
        if applicant.thin_file:
            uncertainty += 0.05
        if not valid_ext_scores:
            uncertainty += 0.08
        
        lower_bound = max(0.0, pd - uncertainty)
        upper_bound = min(1.0, pd + uncertainty)
        confidence_band = (lower_bound, upper_bound)

        # Flag low confidence if uncertainty band is wide or decision borders the threshold
        low_confidence = (upper_bound - lower_bound) > 0.10 or (0.12 <= pd <= 0.18)

        # Sort SHAP factors by absolute magnitude (highest contribution first)
        shap_factors_sorted = sorted(shap_contributions, key=lambda x: abs(x.shap_value), reverse=True)

        return RiskScoringResult(
            probability_of_default=pd,
            risk_tier=risk_tier,
            confidence_band=confidence_band,
            low_confidence=low_confidence,
            top_shap_factors=shap_factors_sorted[:5]
        )
