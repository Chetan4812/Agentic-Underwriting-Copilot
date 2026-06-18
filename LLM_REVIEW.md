# LLM Red-Team Review: KPI Validation Audit

This document record details the red-team review of the KPI and evaluation section of the **Agentic Underwriting Copilot for Halcyon Credit**, executed by an LLM acting as a skeptical Staff AI Safety and Underwriting Engineer, followed by our engineering critique and the resulting revisions.

---

## 1. Red-Team Prompt

The following prompt was sent to the LLM to red-team our PRD's KPI section:

```text
You are a skeptical, highly experienced Staff AI Safety & Underwriting Engineer at a digital consumer lender. 
I want you to red-team the KPI and evaluation section of my Product Requirements Document (PRD) for an "Agentic Underwriting Copilot" designed for Halcyon Credit. 
Analyze the metrics for vagueness, lack of measurability, and missing failure modes. Point out where the targets are unrealistic, and identify any blind spots regarding credit compliance and cost dynamics.

Here is the KPI section:
| Metric | Operational Definition | Target & Baseline | Type |
| --- | --- | --- | --- |
| Decision Quality | Agreement with ground-truth repayment outcome on held-out loans (AUC-ROC, PR-AUC). | AUC-ROC >= 0.74 on held-out real test set (baseline: LightGBM alone, expected ~0.74-0.76). | North Star |
| Explanation Faithfulness | Whether the written reason matches the factors that actually drove the decision (RAGAS faithfulness + critic pass rate). | >= 90% of explanations pass the critic's check on first or second pass; RAGAS faithfulness >= 0.85. | Supporting |
| Fairness Gap | Difference in approval rate and error rate (FPR/FNR) across gender, age-bucket, and region segments. | Approval-rate gap <= 5 percentage points across segments with sufficient sample size. | Guardrail |
| Policy Adherence | Share of decisions where every applicable policy rule was checked and respected, with no hard-stop violations released. | 100% -- zero hard-stop policy violations released; <= 2% of cases routed to "policy undetermined" human review. | Guardrail |
| Cost per Assessed Application | Total LLM + infra cost divided by applications successfully assessed end-to-end. | <= $0.05 per application at the cheap-model routing tier (baseline: single strong-model-only call). | Supporting |
```

---

## 2. LLM Red-Team Response

Below is the critique returned by the LLM:

> ### Staff Engineer Feedback & Critique
>
> 1. **The "100% Policy Adherence" Illusion**: Setting a target of "100% policy adherence with zero hard-stop violations released" is mathematically and operationally unrealistic for an LLM-based RAG system. Even with a critic and high-quality vector database, retrieval misses and semantic parsing errors will occur. Declaring a 100% target without an explicit **graceful degradation or fail-safe threshold** makes this a target of vibes, not engineering.
> 2. **RAGAS Noise in Underwriting**: RAGAS faithfulness metrics are notoriously noisy when evaluated on complex financial explanations. If your risk model output SHAP values (e.g. "high DTI ratio") and the agent writes a paragraph explaining that, RAGAS might penalize the explanation for including helpful contextual detail not explicitly in the "retrieved chunk". How are you calibrating the judge to ensure it doesn't penalize useful reasoning?
> 3. **The Critic Loop Cost Spiral**: Your cost metric of "≤ $0.05 average per application" is highly sensitive to the Adjudication Critic's retry loops. If the critic rejects a draft decision and triggers a retry, the cost for that single application will double or triple. If 15% of applications fail the first pass, your average cost will exceed the budget. You need a **p95 cost ceiling** per application, not just an average.
> 4. **Fairness Statistical Power Gaps**: You specify "across segments with sufficient sample size" for the Fairness Gap. This is a massive loophole. If a segment (e.g., a specific regional rating or younger age bucket) has a small sample size in a weekly batch, the system might ignore a major bias trend. You must explicitly define what constitutes "sufficient sample size" and specify how the system behaves when statistical power is low.
> 5. **Opaque Baseline Comparison**: You state the baseline for Decision Quality is "LightGBM alone." However, you are building an *agentic* pipeline that wraps this model. The real danger is that the LLM agent *overrides* the LightGBM decision incorrectly, lowering the overall AUC-ROC. You need to explicitly measure the "Agent Override Error Rate."

---

## 3. Our Engineering Critique

We evaluated the red-team feedback and categorized the points as follows:

### Where the LLM was Correct:
* **The Policy Adherence fail-safe**: The LLM is correct that 100% adherence cannot be achieved by the model alone. We resolved this by highlighting that the 100% target applies to *released automated decisions*, which we guarantee by routing any policy checks that fall below our retrieval similarity threshold ($\theta$) directly to the human escalation queue rather than letting the agent guess.
* **The Cost Spiral**: The critique of the average cost metric is spot-on. A system that averages $0.04 but costs $1.50 on complex edge cases due to agent retries is a financial liability. We must implement a hard cost ceiling ($0.15) at the API gateway level to trigger a kill switch and route to manual review.
* **Fairness Sample Limits**: The warning about sample size loopholes is highly relevant. If we only audit when sample size is large, we risk missing systemic bias in minority cohorts.

### Where the LLM was Generic:
* **RAGAS Noise**: While the LLM is correct that RAGAS can be noisy, it proposed a generic warning without accounting for our specific mitigation: our local SHAP-to-narrative mapping. The SHAP values are structured features, which makes checking if the text matches the SHAP factors a much simpler, deterministic extraction task than general RAGAS evaluation.

### Why Certain KPI Choices Were Retained:
* We retained the **100% Policy Adherence** target because it is an absolute regulatory and business requirement. A lender cannot legally release a system that has a "99% compliance rate" if the remaining 1% represents a direct violation of lending law (like the Military Lending Act). The target must remain 100%; we address the feasibility of this target by adjusting the agent's action boundaries (routing to manual review) rather than lowering our standards.

---

## 4. Revised KPI Section

Based on the audit, we revised the KPI section in the PRD and Technical Design to incorporate these engineering controls:

```diff
 | Metric | Operational Definition | Target & Baseline | Type |
 | --- | --- | --- | --- |
 | Decision Quality | Agreement with ground-truth repayment outcome on held-out loans (AUC-ROC, PR-AUC). | AUC-ROC >= 0.74 on held-out real test set (baseline: LightGBM alone, expected ~0.74-0.76). | North Star |
 | Explanation Faithfulness | Whether the written reason matches the factors that actually drove the decision (RAGAS faithfulness + critic pass rate). | >= 90% of explanations pass the critic's check on first or second pass; RAGAS faithfulness >= 0.85. | Supporting |
 | Fairness Gap | Difference in approval rate and error rate (FPR/FNR) across gender, age-bucket, and region segments. | Approval-rate gap <= 5 percentage points across segments with sufficient sample size. | Guardrail |
- | Policy Adherence | Share of decisions where every applicable policy rule was checked and respected, with no hard-stop violations released. | 100% -- zero hard-stop policy violations released; <= 2% of cases routed to "policy undetermined" human review. | Guardrail |
+ | Policy Adherence | Share of decisions where every applicable policy rule was checked and respected, with no hard-stop violations released. | 100% -- zero hard-stop policy violations released; <= 2% of cases routed to "policy undetermined" human review. *Determined using similarity threshold theta.* | Guardrail |
- | Cost per Assessed Application | Total LLM + infra cost divided by applications successfully assessed end-to-end. | <= $0.05 per application at the cheap-model routing tier (baseline: single strong-model-only call). | Supporting |
+ | Cost per Assessed Application | Total LLM + infra cost divided by applications successfully assessed end-to-end. | Average <= $0.05; Hard p95 ceiling of <= $0.15 per application (limits loop cost). | Supporting |
+ | Statistical Power Threshold | Minimum applicant count required in a cohort segment to run automated fairness check. | N >= 100 applications per segment. Cohorts with N < 100 default to manual human fairness review. | Guardrail |
+ | Agent Override Error Rate | Rate at which the agentic layer incorrectly overrides a correct LightGBM risk model decision. | <= 1.0% of all applications (baseline: 0.0% override error on LightGBM score alone). | Supporting |
```
