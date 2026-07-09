import sys
import os
import json

# Ensure parent directory is in search path to load app.* modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import ApplicantFile, BureauSummary, PriorApplicationSummary
from app.risk_scoring import CalibratedRiskModel

def run_test():
    print("=" * 60)
    print("   Agentic Underwriting Copilot — Standalone ML Model Runner")
    print("=" * 60)

    # 1. Initialize the model
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    model_path = os.path.join(base_dir, "app/xgb_model.json")
    features_path = os.path.join(base_dir, "app/xgb_features.json")
    
    print(f"Loading XGBoost model from: {model_path}")
    print(f"Loading Feature names from: {features_path}")
    
    try:
        model = CalibratedRiskModel(model_path=model_path, features_path=features_path)
    except Exception as e:
        print(f"Error loading ML model: {e}")
        return

    # Check if we loaded the real model or fallback
    if model.explainer is None:
        print("\n WARNING: XGBoost model files not found. Using fallback heuristics.")
    else:
        print(" XGBoost model and SHAP explainer loaded successfully.")

    # 2. Define applicants
    # Test Case A: Good Credit Profile (Expected Low/Medium Risk)
    applicant_a = ApplicantFile(
        sk_id_curr=9001,
        age_years=40.0,
        employment_tenure_years=10.0,
        income_total=120000.0,
        credit_amount=30000.0,
        dti_ratio=0.15,
        credit_to_income_ratio=0.25,
        thin_file=False,
        days_employed_anomaly=False,
        bureau=BureauSummary(active_credits=1, closed_credits=6, total_debt=2000.0, overdue_debt=0.0, max_dpd=0),
        prior_applications=PriorApplicationSummary(prior_app_count=4, approval_rate=1.0, refusal_rate=0.0),
        ext_source_scores=[0.85, 0.80, 0.88],
        gender="F",
        age_group="40-49"
    )

    # Test Case B: High-Risk Profile (Expected High/Very High Risk)
    applicant_b = ApplicantFile(
        sk_id_curr=9002,
        age_years=28.0,
        employment_tenure_years=1.5,
        income_total=45000.0,
        credit_amount=90000.0,
        dti_ratio=0.45,
        credit_to_income_ratio=2.0,
        thin_file=False,
        days_employed_anomaly=False,
        bureau=BureauSummary(active_credits=4, closed_credits=1, total_debt=35000.0, overdue_debt=1200.0, max_dpd=45),
        prior_applications=PriorApplicationSummary(prior_app_count=2, approval_rate=0.5, refusal_rate=0.5),
        ext_source_scores=[0.35, 0.40, 0.30],
        gender="M",
        age_group="18-29"
    )

    # 3. Run predictions
    for label, applicant in [("APPLICANT A (Low Risk Profile)", applicant_a), 
                             ("APPLICANT B (High Risk Profile)", applicant_b)]:
        print("\n" + "-" * 50)
        print(f"Running Risk Scoring for: {label}")
        print("-" * 50)
        print(f"Income: ${applicant.income_total:,.2f} | Requested Loan: ${applicant.credit_amount:,.2f} | DTI: {applicant.dti_ratio:.1%}")
        print(f"External Bureau Scores: {applicant.ext_source_scores}")
        
        # Execute ML prediction
        result = model.predict_and_explain(applicant)
        
        print(f"\n Prediction Output:")
        print(f"  • Probability of Default (PD): {result.probability_of_default:.2%}")
        print(f"  • Risk Tier: {result.risk_tier.upper()}")
        print(f"  • Confidence Band (90%): [{result.confidence_band[0]:.2%}, {result.confidence_band[1]:.2%}]")
        print(f"  • Flagged Low Confidence: {result.low_confidence}")
        
        print(f"\n Top SHAP Explanations (Feature Impact on Risk):")
        for i, factor in enumerate(result.top_shap_factors):
            effect_str = " Decreased Risk" if factor.effect == "decrease_risk" else " Increased Risk"
            print(f"  {i+1}. Feature: {factor.feature_name:<25} | SHAP Value: {factor.shap_value:+.4f} | {effect_str}")

if __name__ == "__main__":
    run_test()
