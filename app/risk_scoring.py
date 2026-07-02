import xgboost as xgb
import shap
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from app.models import RiskScoringResult, ShapFactor, ApplicantFile

class CalibratedRiskModel:
    def __init__(self, model_path: str = "app/xgb_model.json", features_path: str = "app/xgb_features.json"):
        import os
        self.model = xgb.Booster()
        # Only load if paths exist, otherwise wait for training to complete
        if os.path.exists(model_path) and os.path.exists(features_path):
            self.model.load_model(model_path)
            with open(features_path, 'r') as f:
                self.feature_names = json.load(f)
            self.explainer = shap.TreeExplainer(self.model)
        else:
            self.feature_names = []
            self.explainer = None

    def predict_and_explain(self, applicant: ApplicantFile) -> RiskScoringResult:
        if not applicant.xgb_features or not self.feature_names or not self.explainer:
            return self._fallback_prediction(applicant)
            
        row_data = {feat: applicant.xgb_features.get(feat, np.nan) for feat in self.feature_names}
        df = pd.DataFrame([row_data])
        df = df.astype(float)
        dmat = xgb.DMatrix(df)
        
        pd_val = float(self.model.predict(dmat)[0])
        
        shap_values = self.explainer.shap_values(df)
        shap_array = shap_values[0] if isinstance(shap_values, list) else shap_values
        if len(shap_array.shape) > 1:
            shap_array = shap_array[0]
            
        shap_contributions = []
        for i, feat_name in enumerate(self.feature_names):
            val = float(shap_array[i])
            if abs(val) > 0.001:
                effect = "increase_risk" if val > 0 else "decrease_risk"
                shap_contributions.append(ShapFactor(feature_name=feat_name, shap_value=val, effect=effect))
                
        shap_contributions = sorted(shap_contributions, key=lambda x: abs(x.shap_value), reverse=True)
        top_factors = shap_contributions[:5]
        
        if pd_val < 0.05:
            risk_tier = "low"
        elif pd_val < 0.15:
            risk_tier = "medium"
        elif pd_val < 0.30:
            risk_tier = "high"
        else:
            risk_tier = "very_high"

        uncertainty = 0.02
        if applicant.thin_file:
            uncertainty += 0.05
            
        lower_bound = max(0.0, pd_val - uncertainty)
        upper_bound = min(1.0, pd_val + uncertainty)
        confidence_band = (lower_bound, upper_bound)
        
        low_confidence = (upper_bound - lower_bound) > 0.10 or (0.12 <= pd_val <= 0.18)

        return RiskScoringResult(
            probability_of_default=pd_val,
            risk_tier=risk_tier,
            confidence_band=confidence_band,
            low_confidence=low_confidence,
            top_shap_factors=top_factors
        )
        
    def _fallback_prediction(self, applicant: ApplicantFile) -> RiskScoringResult:
        pd_val = 0.08
        return RiskScoringResult(
            probability_of_default=pd_val,
            risk_tier="medium",
            confidence_band=(0.0, 0.15),
            low_confidence=True,
            top_shap_factors=[ShapFactor(feature_name="missing_features", shap_value=1.0, effect="increase_risk")]
        )
