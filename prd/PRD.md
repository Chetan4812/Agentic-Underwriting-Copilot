PRODUCT REQUIREMENTS DOCUMENT

Agentic Underwriting Copilot

for Halcyon Credit

Document Owner:  Anirudh — AI Engineering Squad Lead

Client / Persona:  Halcyon Credit (fictional digital consumer lender)

Engagement:  Futurense AI Clinic — Capstone Project 02

Version:  v1.0

Status:  Draft for Sprint 0 Review — Approved metrics pending baseline confirmation

Date:  16 June 2026

“A copilot that assembles the file, reasons through the risk step by step, checks itself against policy and fairness, and hands the underwriter a clear, evidence-backed recommendation — trustworthy, auditable, and run inside a budget.”

# Table of Contents

# 1. Problem Statement

Halcyon Credit is a digital consumer lender serving applicants who often carry thin or non-traditional credit histories. Loan applications arrive faster than human underwriters can review them, and each file requires cross-checking income, debts, bureau records, and prior application history before a defensible decision can be written.

Leadership has explicitly rejected a black-box scoring approach. A lender must be able to explain a decline to the applicant, defend it to a regulator, and demonstrate that the decision was reached fairly. The current manual process is careful but slow, and the queue keeps growing faster than headcount.

### 1.1 Core Problem

Underwriting throughput is capacity-constrained, and the obvious fix — a fast ML score — fails Halcyon's trust bar, because a score alone cannot be explained, audited, or defended.

### 1.2 Why Now

Application volume is outpacing underwriter capacity, creating a growing backlog and slower turnaround for applicants.

A meaningful share of applicants are thin-file or non-traditional, which existing scorecards underrepresent and handle poorly.

Regulatory expectations (fair lending, adverse-action reasoning) make an unexplainable automated decision a direct legal and reputational liability.

Existing external bureau scores (e.g. EXT_SOURCE-style signals) are already opaque to the business; stacking another opaque model on top compounds the trust problem instead of solving it.

### 1.3 Problem We Are Not Solving

We are not building a new credit scoring bureau, a loan origination system, or a system that replaces human underwriters. We are building the layer that assembles facts, reasons about risk transparently, checks itself against policy and fairness, and routes a clear, evidence-backed recommendation to a human who remains the decision-maker of record for declines and edge cases.

# 2. Target Users and Personas

Five personas anchor design and prioritization decisions. Each carries one goal, one frustration, and one job-to-be-done statement that scope decisions can be tested against.

Persona 1 — Priya, Frontline Underwriter

Reviews the copilot's recommendation on the majority of standard applications before signing off.


| Attribute | Detail |
| --- | --- |
| Goal | Clear the queue without compromising decision quality or missing a fairness or policy issue. |
| Frustration | Spends most of her time re-deriving facts the system should have assembled for her, and distrusts any recommendation she can't trace to evidence. |
| Job to Be Done | When I open a file, I want every relevant fact already assembled and the reasoning shown, so I can confirm or override in minutes, not re-investigate from scratch. |


Persona 2 — Daniel, Senior Underwriter (Escalation Reviewer)

Takes the cases the copilot routes as thin-file, low-confidence, or fairness-flagged.


| Attribute | Detail |
| --- | --- |
| Goal | Resolve genuinely ambiguous cases correctly, with full context on why the case was escalated. |
| Frustration | Escalations often arrive with no clear reason — he has to reconstruct what was uncertain before he can even start deciding. |
| Job to Be Done | When a case is escalated to me, I want a referral package stating exactly what is known, what is uncertain, and why a human is needed, so I don't repeat the copilot's work. |


Persona 3 — Maria, Operations Lead

Owns queue throughput, unit economics, and answers to leadership for cost and quality.


| Attribute | Detail |
| --- | --- |
| Goal | Prove the system reduces cost-per-application without degrading decision quality or fairness. |
| Frustration | Has no real-time visibility into what the system costs to run or where quality is silently slipping. |
| Job to Be Done | When I check the dashboard, I want cost, latency, and quality metrics in one place, so I can defend the system's ROI without asking engineering for a one-off report. |


Persona 4 — Elena, Compliance & Fairness Officer

Confirms every decision pattern is policy-adherent and fair across applicant segments before it scales.


| Attribute | Detail |
| --- | --- |
| Goal | Catch a systemic fairness or policy gap before a regulator or a lawsuit does. |
| Frustration | Fairness audits today are retrospective and manual, run long after decisions have already gone out. |
| Job to Be Done | When a new decision pattern emerges, I want a standing fairness and policy report, so issues surface before they become liabilities, not after. |


Persona 5 — Sam, Loan Applicant (indirect user)

Receives a decision and, if declined, an explanation of why.


| Attribute | Detail |
| --- | --- |
| Goal | Understand exactly what to fix or provide to get approved, especially if he has a thin credit file. |
| Frustration | Past adverse-action letters have used generic, unhelpful boilerplate reason codes. |
| Job to Be Done | When I'm declined, I want a specific, understandable reason tied to my actual application, so I know whether and how to reapply. |


# 3. Jobs-to-be-Done Summary


| User | Job to Be Done (one sentence) |
| --- | --- |
| Frontline Underwriter | Get a fully assembled, evidence-backed recommendation so review takes minutes, not a manual re-investigation. |
| Senior Underwriter | Receive a referral package that states what's known, what's uncertain, and why — so escalation time isn't wasted reconstructing context. |
| Operations Lead | See cost, latency, and quality together so the system's ROI and reliability are always defensible. |
| Compliance Officer | See a standing fairness and policy report so systemic issues surface before they scale into liabilities. |
| Applicant | Receive a specific, evidence-tied reason for a decline so the next step is clear. |


# 4. Scope and Non-Scope

## 4.1 In Scope

Ingesting structured application data and joined bureau / prior-application / installment / POS / credit-card history for a single applicant file.

An agentic pipeline that verifies income/employment consistency, summarizes credit history, scores repayment risk, checks the decision against a policy rulebook, checks fairness against segment baselines, critiques the draft decision and explanation, writes a grounded explanation, and routes to a human when warranted.

A trained tabular risk model (LightGBM-class) with calibrated probability output and SHAP-based local explainability.

A retrieval-augmented policy and compliance layer grounded in a synthetic lending rulebook and reason-code corpus.

A synthetic data pipeline covering applicant narratives, thin-file profiles, adversarial/inconsistent cases, and rare fraud patterns.

A full evaluation pipeline: golden set, calibrated LLM judge, RAGAS, regression CI, DSPy-optimized explanation prompts, and a benchmark against non-agentic baselines.

An LLM gateway with model routing, fallback, and cost/latency instrumentation, plus an observability dashboard.

A deployed API and minimal decision-card interface, with an operate runbook.

## 4.2 Out of Scope (this engagement)

Replacing the human underwriter as the legal decision-maker of record for declines and escalations.

Building a new credit bureau, loan origination system, or core banking integration.

Live integration with real, regulated production credit bureaus or payment processors (mock services seeded from the dataset stand in for these).

Fine-tuning a foundation model (DoRA/QLoRA) or building a distilled production model — explicitly deferred to a future phase given the 2-week build window and a free-first tooling mandate.

Multi-agent debate, GraphRAG, and Agent2Agent (A2A) cross-service orchestration — evaluated and deferred; documented as future work with rationale.

Applicant-facing chat or self-service interface; the system's user is the underwriter, not the applicant directly.

# 5. Assumptions and Open Questions

## 5.1 Stated Assumptions (where the client cannot be asked directly)


| # | Assumption | Why It's Needed |
| --- | --- | --- |
| A1 | The Home Credit Default Risk dataset's TARGET label (repayment difficulty) is an adequate proxy for Halcyon's real default definition. | No client-specific default definition exists; a public dataset proxy is required to build and evaluate a model at all. |
| A2 | A human underwriter remains accountable for every decline and every escalated case; the copilot's output is a recommendation, not a final decision. | Required to keep the system within a defensible legal and ethical operating boundary given Halcyon's stated rejection of black-box automation. |
| A3 | Synthetic applicant narratives and the lending policy rulebook are stand-ins for real Halcyon documents and policy, since no real client artifacts exist for this engagement. | Stage 5 of the brief explicitly requires synthetic augmentation; no real policy text is available. |
| A4 | Protected attributes (gender, age) are usable for fairness auditing but never as model features. | Required to satisfy fair-lending principles while still being able to measure the fairness gap metric. |
| A5 | A free-tier deployment and free/open models for iteration are acceptable for this engagement; paid calls are reserved for evaluation and final runs. | Matches the brief's free-first tooling mandate and the cost-per-application guardrail. |


## 5.2 Open Questions for the Client

What is Halcyon's actual application volume, and what does the daily/weekly peak pattern look like?

What categories of decision must never be automated end-to-end, even with high model confidence (e.g. is there a loan-size threshold above which a human must review regardless of score)?

What is the real adverse-action reason-code taxonomy Halcyon currently uses, and does it map cleanly to model-derived SHAP factors?

What latency is acceptable from application submission to a recommendation appearing in an underwriter's queue?

What is Halcyon's existing definition of a fairness-sensitive segment, beyond the legally protected classes?

# 6. Explanation Teardown — Pattern and Anti-Pattern

Two real adverse-action / decision-explanation approaches were examined to ground what makes a written reason trustworthy versus what undermines trust.

### 6.1 Pattern Worth Adopting

Specific, factor-tied reason statements (e.g. citing a debt-to-income ratio against a stated threshold, or a specific missed-payment pattern) let an applicant or reviewer trace the explanation back to a concrete, checkable fact. This is the model our Explanation Writer agent follows: every claim must cite a SHAP factor or a retrievable policy/compliance reference.

### 6.2 Anti-Pattern to Avoid

Generic, boilerplate reason codes (e.g. a vague “insufficient credit history” with no specifics) leave the applicant unable to act and leave a reviewer unable to verify the decision was reasoned, not templated. Our Adjudication Critic agent explicitly rejects explanations that are not grounded in this application's own evidence.

# 7. Target Metrics, Baselines, and Operational Definitions

Every metric below has an explicit operational definition so it is unambiguous in later evaluation, a stated target, and a stated baseline for comparison — a target without a baseline cannot be judged. Decision Quality is the north-star metric; Fairness Gap and Policy Adherence are hard guardrails that must never be crossed even if Decision Quality or cost improves.


| Metric | Operational Definition | Target & Baseline | Type |
| --- | --- | --- | --- |
| Decision Quality | Agreement with ground-truth repayment outcome on held-out loans (AUC-ROC, PR-AUC given class imbalance, and calibration error). | AUC-ROC ≥ 0.74 on held-out real test set (baseline: trained LightGBM model alone, expected ~0.74–0.76 on this dataset's known difficulty). | North Star |
| Explanation Faithfulness | Whether the written reason matches the factors that actually drove the decision (RAGAS faithfulness + critic pass rate + judge rubric score). | ≥ 90% of explanations pass the critic's faithfulness check on first or second pass; RAGAS faithfulness ≥ 0.85. | Supporting |
| Fairness Gap | Difference in approval rate and error rate (FPR/FNR) across gender, age-bucket, and region-rating segments. | Approval-rate gap ≤ 5 percentage points across segments with sufficient sample size; flagged and reported (not silently passed) when sample size is insufficient. | Guardrail |
| Policy Adherence | Share of decisions where every applicable policy rule was checked and respected, with no hard-stop violations released. | 100% — zero hard-stop policy violations released; ≤ 2% of cases routed to “policy undetermined” human review. | Guardrail |
| Cost per Assessed Application | Total LLM + infra cost (gateway-logged) divided by applications successfully assessed end-to-end. | ≤ $0.05 per application at the cheap-model routing tier (baseline: single strong-model-only call, expected materially higher per call). | Supporting |


### 7.1 Why These Are the Right Metrics

Decision Quality is north-star because it is the system's core economic and reputational function — a copilot that is fast and explainable but wrong is still a liability.

Explanation Faithfulness and Policy Adherence operationalize Halcyon's explicit “not a black box” mandate; without them, the system is indistinguishable from the score it was built to avoid.

Fairness Gap is a guardrail, not a supporting metric, because an improvement in average decision quality that widens a segment gap is not an acceptable trade — it must block release, not just get reported.

Cost per Assessed Application is the unit economics gate that decides whether this ships at all, per the brief's explicit framing.

# 8. Non-Functional Requirements


| Requirement | Target |
| --- | --- |
| Latency budget (p50 / p95) | p50 ≤ 12s, p95 ≤ 30s from application submission to a recommendation reaching the underwriter's queue, under normal load. |
| Burst handling | Sustain at least 10 concurrent application assessments without latency budget breach, via async agent execution, queuing, and caching. |
| Cost ceiling per application | ≤ $0.05 average; hard alarm at ≥ $0.15 for any single application (signals a routing or retry failure). |
| Safety bar for sensitive cases | Any case below the model-confidence threshold, any thin-file case, and any fairness-flagged case is routed to human escalation — never auto-approved or auto-declined. |
| Availability | Gateway-level fallback chain ensures no single model provider outage halts the pipeline; degraded mode routes to human review rather than failing silently. |
| Auditability | Every decision is traceable end-to-end: every agent step, tool call, retrieved policy/compliance reference, and model version is logged and reconstructable. |


# 9. Discovery Data Snapshot

Primary dataset: Home Credit Default Risk (Kaggle), chosen over Lending Club and the Risk Model Stability release because it is multi-table and closest in shape to a real underwriting file — application, bureau, and installment history joined on applicant ID, matching exactly the kind of file an underwriter would actually open.


| Characteristic | Observation |
| --- | --- |
| Scale | ~307K applications in the full training set (this sample: 100 rows for schema profiling); 122 columns per application; previous_application.csv alone carries ~1.05M historical loan records. |
| Class balance | ~8% positive (default / repayment difficulty) in the full dataset — severe imbalance; accuracy is not a usable metric, PR-AUC and calibration are required. |
| Known data quality issue | DAYS_EMPLOYED carries a sentinel value (365243) for unemployed/pensioner applicants — requires explicit cleaning into a missingness flag, not naive imputation. |
| Strongest existing signal | EXT_SOURCE_1/2/3 (normalized external bureau scores) are historically the strongest predictors and are themselves partially missing and already opaque — directly motivating the explainability mandate. |
| Underrepresented segment | Thin-file / sparse-bureau-history applicants are present but underrepresented relative to real-world volume — the primary target for synthetic augmentation. |
| Fairness-relevant fields | CODE_GENDER and DAYS_BIRTH (age) are protected attributes; NAME_EDUCATION_TYPE, OCCUPATION_TYPE, ORGANIZATION_TYPE, and REGION_RATING_CLIENT are potential proxies requiring explicit fairness monitoring even if used as model features. |


# 10. Approval

This PRD is intended to be buildable by an engineer without a follow-up meeting, and approvable by a stakeholder as the contract for Sprint 0 exit. Metrics in Section 7 will be revisited once the baseline model (Sprint 1) produces real numbers to replace estimated baselines.

Prepared by: Anirudh, AI Engineering Squad

Review gate: Sprint 0 exit — Discover and Define