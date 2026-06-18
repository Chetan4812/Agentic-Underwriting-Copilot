# Experiment 3: Prompt Optimization (Prompt V1 vs. Prompt V2)

This experiment evaluates the performance delta between a standard QA generation prompt (Prompt V1) and a SHAP-grounded compliance instruction prompt (Prompt V2) on the 40-case golden dataset.

---

## Configuration Details

* **Embedding Model**: `all-MiniLM-L6-v2`
* **Vector Store**: `Chroma`
* **Chunking Strategy**: `rule_based`
* **Retrieval Configuration**: Top-K = 3
* **Test Dataset**: Stratified `golden_dataset.csv` (40 examples)

---

## Metric Scorecard comparison

| Metric | Target | Actual Score (V1) | Actual Score (V2) | Delta | Status (Best) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Faithfulness** | &ge; 0.85 | **81.5%** | **92.5%** | +11.0%| **Prompt V2** |
| **Answer Relevancy** | &ge; 0.80 | **81.0%** | **88.0%** | +7.0%| **Prompt V2** |
| **Context Precision** | &ge; 0.70 | **86.5%** | **86.5%** | +0.0%| Neutral |
| **Context Recall** | &ge; 0.80 | **91.0%** | **91.0%** | +0.0%| Neutral |

---

## Prompt Implementations

### Prompt V1 (Standard QA Prompt)
```text
Write a detailed explanation of the credit underwriting decision for the applicant.
Decision: {decision}
Use the provided retrieved policy contexts:
{contexts}
Explain the reasons clearly.
```

### Prompt V2 (SHAP-Grounded Prompt - Optimized)
```text
Write a detailed, formal underwriting explanation for Halcyon Credit.
Decision: {decision}
Applicant SK_ID_CURR: {file.sk_id_curr}
Risk Tier: {scoring.risk_tier} (PD: {scoring.probability_of_default:.2%})
Top SHAP Factors: {scoring.top_shap_factors}

CRITICAL INSTRUCTIONS:
1. You MUST only state claims that are explicitly grounded in the provided policy contexts.
2. For each decline decision, map the primary SHAP factor directly to one of the approved regulatory codes (e.g. ADV-DTI for high debt-to-income, ADV-EMP for short employment length).
3. If you make any policy claim, cite the stable clause ID (e.g., POL-DTI-001) in brackets.
4. Do not invent details or assume values outside the given context.
```

---

## Quantitative Analysis

1. **Faithfulness Optimization (+11.0%)**: Prompt V1 achieved a RAGAS faithfulness of only 81.5% (failing our 85% target), as the model frequently wrote generic decline rationales (e.g. "poor payment history") that were not actually present in the retrieved context or supported by the applicant's record. Prompt V2 raised faithfulness to 92.5% by strictly binding explanations to SHAP factors and policy IDs.
2. **Answer Relevancy Lift (+7.0%)**: Relevancy improved by 7.0 percentage points. Incorporating strict mapping constraints prevented the LLM from adding fluff, keeping the explanations concise and compliant.

---

## Recommendation

**Implement Prompt V2.**
Prompt V2 successfully meets all of our evaluation targets, whereas Prompt V1 fails the faithfulness threshold. Binding the LLM's reasoning engine to local SHAP attributions and policy chunk citations is critical to legal auditability.
