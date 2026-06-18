# Risk Register

This document tracks the technical, operational, and regulatory risks associated with the **Agentic Underwriting Copilot for Halcyon Credit**, along with their mitigations, owners, and residual risk assessments.

---

## Top 8 Risks & Mitigations

| ID | Risk Name & Assumption | Description | Likelihood | Impact | Mitigation Strategy | Owner | Residual Risk |
|---|---|---|---|---|---|---|---|
| **R1** | **⭐ Highest Risk / Riskiest Assumption**:<br>Incorrect or Incomplete Policy Retrieval | Policy retrieval returns incorrect or incomplete evidence, leading to ungrounded underwriting explanations. | **Medium** | **High** | • **Rule-per-chunk chunking** with stable clause IDs (e.g. `POL-DTI-001`) to prevent text clipping.<br>• **Hybrid retrieval** (Chroma vector embedding + BM25 keyword matching) to capture semantic and exact terms.<br>• **Self-RAG-lite verification**: if retrieval similarity is below threshold, trigger one search reformulation; if still low, route to human review as "policy undetermined."<br>• **RAGAS Faithfulness validation** integrated into the Adjudication Critic loop. | Anirudh — AI Engineering Squad Lead | **Low** |
| **R2** | **Tabular Class Imbalance & Model Miscalibration** | Risk model (LightGBM) underrepresents defaults due to severe class imbalance (8% positive), leading to miscalibrated default probabilities (PD) that mis-route applications. | **Medium** | **High** | • Use **class-weighting** (`scale_pos_weight`) during model training.<br>• Apply **Isotonic Regression calibration** on validation splits before threshold mapping.<br>• Evaluate and audit model performance using **PR-AUC and Calibration Curves** instead of simple accuracy metrics. | Chetan — ML Engineer | **Low** |
| **R3** | **Data Anomaly Leakage** | Sentinel values like `365243` (1,000 years) for unemployed/pensioners pass through ingestion, distorting risk calculations and explanations. | **High** | **Medium** | • **Data Assembly Agent** runs explicit cleaning rules to map sentinel values to `null` and set an explicit `days_employed_anomaly = true` flag.<br>• Model trained to handle this flag natively via LightGBM's default missing value routing. | Chetan — ML Engineer | **Low** |
| **R4** | **Underwriter Automation Bias** | Frontline underwriters blindly approve the copilot's recommendations without verifying evidence, turning it into a de facto black box. | **High** | **High** | • UX design uses an **A2UI-style decision card** that forces side-by-side inspection of SHAP waterfalls and policy citations.<br>• Approve/Decline overrides require underwriters to select reasons from a dropdown, preventing passive click-through. | Priya — Frontline Underwriter / Queue Owner | **Medium** |
| **R5** | **Sensitive Financial Data Exposure (PII)** | Applicant PII (such as income details, SSN proxies, and bureau records) leaks into LLM prompts or public logs. | **Medium** | **High** | • Ingestion layer **redacts names, raw SSNs, and address strings** before agent input.<br>• System uses internal IDs (`SK_ID_CURR`) for tracking.<br>• **LiteLLM Gateway** strips prompt bodies from log outputs, storing only token counts, latencies, and costs. | Anirudh — AI Engineering Squad Lead | **Low** |
| **R6** | **Regulatory Non-Compliance of Explanations** | Adverse-action explanations written by the LLM fail to meet Reg B / ECOA specificity requirements, causing compliance violations. | **Medium** | **High** | • Explanation Writer is constrained to select adverse action reason codes from a **predefined compliant taxonomy** mapped to SHAP values.<br>• **Adjudication Critic** rejects explanations that lack explicit citations or mismatch risk scoring outputs. | Elena — Compliance & Fairness Officer | **Low** |
| **R7** | **Fairness Gaps Across Protected Segments** | The system produces higher false-negative rates for thin-file, younger, or regional segments, creating fair lending violations. | **Medium** | **High** | • **Fairness Check Agent** evaluates segment metrics (gender, age-bucket) against pre-calculated baselines.<br>• Segments with an approval rate delta > 5 percentage points trigger a hard escalation flag to human review. | Elena — Compliance & Fairness Officer | **Low** |
| **R8** | **Gateway Model Outages & Pipeline Latency** | Model APIs time out or fail under burst load, violating the p95 latency budget (≤ 30s) and freezing the underwriting queue. | **Medium** | **Medium** | • **LiteLLM Gateway** configures automatic fallback routing (e.g. Gemini Flash to GPT-4o-mini), retry rules, and timeouts.<br>• Parallel agent execution via LangGraph.<br>• Hard timeouts route the application gracefully to the Human Escalation Agent. | Anirudh — AI Engineering Squad Lead | **Low** |

---

## Mitigation Mapping to System Design

Each high-severity risk is addressed by specific components defined in the `TECHNICAL_DESIGN.md`:
* **R1 (Retrieval Miss)** is mitigated by the **Policy & Compliance Agent** (using hybrid retrieval and RAGAS).
* **R2 (Model Miscalibration)** is mitigated by the **Risk Scoring Agent** (Isotonic calibration + SHAP tree explainer).
* **R3 (Data Anomaly)** is mitigated by the **Data Assembly Agent** (imputation & mapping logic).
* **R6 & R7 (Compliance & Fairness)** are mitigated by the **Fairness & Bias Check Agent** and the **Adjudication Critic Agent**.
* **R8 (Gateway & Latency)** is mitigated by the **LiteLLM Gateway** and parallel graph branches in **LangGraph**.
