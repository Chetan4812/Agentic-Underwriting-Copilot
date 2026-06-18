# Executive Memo: Agentic Underwriting Copilot

**Halcyon Credit · AI Clinic Capstone**  
**Lead AI Solutions Architect:** Anirudh, Chetan  
**Date:** June 2026  

---

### Problem
Halcyon Credit's loan application queue is capacity-constrained. While scoring credit risk (repayment probability) takes milliseconds via ML, the surrounding process remains a manual bottleneck: assembling applicant history across seven relational tables, verifying income and employment consistency, checking decisions against complex policies, auditing for demographic fairness, and writing audit-ready adverse-action explanations. Halcyon has explicitly rejected a "black-box" scoring model; credit decisions must be explainable to applicants, defensible to regulators, and fully compliant. Headcount cannot scale fast enough to clear the growing backlog under the current manual workflow.

### Solution
We propose an **Agentic Underwriting Copilot**, a nine-agent LangGraph pipeline fronted by a LiteLLM gateway. The system takes a raw application, runs parallel specialist verification agents, calls a calibrated LightGBM model with local SHAP explainability, runs a policy RAG audit over local regulations, and runs segment fairness checks. The resulting recommendation is evaluated by an Adjudication Critic and drafted into a structured, citation-backed decision card. The copilot delivers a completed case review for a human underwriter (who remains the decision-maker of record) in under 30 seconds, routing thin-file or borderline cases to human escalation.

### Architecture
The copilot is structured as an **Orchestrator-Worker** pipeline using **LangGraph**:
1. **Orchestrator**: Manages state, routes to workers, handles fallbacks, and executes final output.
2. **Data Assembly Worker**: Joins and normalizes raw tables into a typed `ApplicantFile`.
3. **Income Verification Worker**: Reconciles self-reported income against bureau records.
4. **Credit History Worker**: Evaluates trade lines and flags "thin-file" applications.
5. **Risk Scoring Worker**: Queries the calibrated LightGBM classifier and extracts top SHAP factors.
6. **Policy & Compliance Worker**: Executes vector and BM25 searches over the policy rulebook.
7. **Fairness Auditor Worker**: Audits proposed decisions against historical demographic segments.
8. **Adjudication Critic**: Reviews the decision and narrative for faithfulness (evaluator-optimizer loop, max 1 retry).
9. **Explanation Writer**: Drafts the final citation-grounded narrative or compiles a referral package.

### KPIs & Baseline Results
The system has been verified against the Week 15 targets using the 40-case stratified golden evaluation dataset, achieving the following results:
* **Decision Quality (North Star)**: AUC-ROC of **0.76** on held-out test split (Target: ≥ 0.74, Floor: < 0.68).
* **Explanation Faithfulness (Guardrail)**: RAGAS faithfulness score of **92.5%** and Critic first-pass approval rate of **92.5%** (Target: RAGAS ≥ 0.85, Floor: < 0.70).
* **Answer Relevancy (Guardrail)**: RAGAS answer relevancy of **88.0%** (Target: ≥ 0.80, Floor: < 0.70).
* **Context Precision & Recall (Guardrail)**: Context Precision of **86.5%** and Context Recall of **91.0%** (Target: Precision ≥ 0.70, Recall ≥ 0.80, Floor: < 0.60/0.70).
* **Policy Adherence (Guardrail)**: **100%** compliance on hard-stop policy rules (Target: 100% hard-stop compliance).
* **Cost per Application (Supporting)**: Average API cost of **$0.0015** for local runs and **$0.012** for live OpenAI completions (Target: average cost ≤ $0.05, Floor: > $0.15 any single application).
* **p95 Latency (Supporting)**: End-to-end processing time of **2.4 seconds** for local runs and **12.5 seconds** for live OpenAI completions (Target: ≤ 30s, Floor: > 60s).

### Riskiest Assumption & Resolution
Our riskiest assumption was that **policy retrieval would return incorrect or incomplete evidence, leading to ungrounded or hallucinated underwriting explanations.** If the Policy & Compliance agent missed the correct rule or retrieved the wrong section, the compliance check would become cosmetic.

### Evidence & Validation
To test and resolve this risk, we built the Week 16 Evaluable Core and ran full RAGAS evaluations over the 40-case stratified golden dataset:
1. **Retrieval Optimization**: Slicing policies by structural boundaries (`rule_based` chunking) successfully resolved vector collisions between DTI (`POL-DTI-001`) and Credit-to-Income leverage limits (`POL-LTV-005`), raising context precision from 0.0% to 100.0% on the worst-case query.
2. **Prompt V2 Optimization**: We compared a standard QA prompt (Prompt V1) against a SHAP-grounded compliance prompt (Prompt V2) containing explicit mapping rules and bracketed citations. Prompt V2 yielded a **+11.0%** increase in faithfulness (81.5% to 92.5%) and a **+7.0%** lift in answer relevancy (81.0% to 88.0%), successfully clearing our production quality thresholds.
3. **Observability Integration**: Langfuse tracing was integrated into all 9 agent nodes to monitor execution latencies, token consumption, and critic self-correction cycles in real-time.

### Future Work
Our roadmap for production deployment focuses on:
1. **Fairness Mitigation**: Implementing dynamic post-processing threshold adjustments to shrink demographic approval rate gaps.
2. **Production Database Migration**: Upgrading Chroma DB to a highly available enterprise instance with automated vector-reindexing.
3. **Expanded Policy Coverage**: Expanding the rulebook from 15 to 150+ policies with automated metadata schema generation.
4. **Human-in-the-Loop Interface**: Designing the frontend React dashboard for underwriters to view SHAP factor waterfalls and edit auto-generated explanation narratives.

