## Agentic Underwriting Copilot (Executive Memo)
**Halcyon Credit · AI Clinic Capstone · June 2026**

---

### The Problem

Halcyon Credit's loan application queue is growing faster than its underwriting team can clear it. The bottleneck is not the credit risk decision itself, a trained ML model can score repayment probability in milliseconds. The bottleneck is everything around that score: assembling the facts of a file, cross checking income against bureau records, verifying the decision against lending policy, confirming it is fair across applicant segments, and writing an explanation that a regulator could actually review. Each of those steps is currently a manual, time consuming task. Meanwhile, Halcyon has explicitly ruled out a black box scoring approach because a score alone cannot be explained, audited, or defended to a regulator or a declined applicant.

---

### The Proposed System

We are building an **Agentic Underwriting Copilot**, a nine-agent LangGraph pipeline that takes a raw application record and produces a structured, evidence backed decision recommendation for a human underwriter in under 30 seconds. The pipeline assembles the applicant's file across seven data tables, verifies income and employment consistency, scores repayment risk using a calibrated LightGBM model with SHAP explainability, retrieves and checks against a policy and compliance rulebook, audits for fairness across protected segments, critiques its own draft explanation for faithfulness, and routes thin file or low confidence cases to human escalation rather than guessing. Every step is traced, costed, and logged to an observability dashboard.

---

### KPIs That Define Success

| KPI | Target | Do-Not-Ship Floor |
|---|---|---|
| Decision Quality (AUC-ROC on held-out test) | ≥ 0.74 | < 0.68 |
| Explanation Faithfulness (RAGAS + critic pass rate) | RAGAS ≥ 0.85, critic ≥ 90% first-pass | RAGAS < 0.70 |
| Fairness Gap (approval-rate delta across segments) | ≤ 5 percentage points | > 10 pp — blocks release |
| Policy Adherence | 100% hard-stop compliance | Any hard-stop violation released |
| Cost per Assessed Application | ≤ $0.05 average | > $0.15 any single app triggers alarm |
| p95 End-to-End Latency | ≤ 30 seconds | > 60 seconds |

The north star is Decision Quality. Fairness Gap and Policy Adherence are hard guardrails, an improvement in accuracy that widens a segment gap or violates a policy rule is not an acceptable trade.

---

### Riskiest Assumption and Evidence

**The riskiest assumption is that a small synthetic policy corpus (15–30 documents) will reliably retrieve the correct clause when the compliance agent queries it for a real application, especially for edge cases involving thin file applicants or protected class adjacent scenarios.**

If retrieval fails on those cases, the policy compliance check becomes cosmetic, it looks grounded but is not. A de-risk spike was run to test this: 15 synthetic policy documents were chunked and embedded into a Chroma vector store, and 10 representative queries were run covering standard lending rules, thin file handling, DTI thresholds, and fairness guidance.

**Finding:** Hit rate on standard policy queries was strong (8/10 top-3 retrievals contained the correct clause). Hit rate on fairness and thin-file edge case queries was weaker (5/8), motivating a move to recursive/semantic chunking in the final build rather than fixed 512-token windows. Confidence in retrieval is moderate to good for standard cases; the edge case gap is a known risk with a concrete mitigation.

---

### What We Would Build First

The risk model (LightGBM + SHAP) and the golden evaluation set, in that order, on Day 1 and Day 3 respectively. Everything else in the system depends on having a real baseline score to reason about, and a fixed labeled set to measure every subsequent change against. A system built without these two anchors in place first will produce impressive looking outputs that cannot be trusted, compared, or improved systematically. The evaluation harness is not a final step, it is infrastructure that enables every other step.

---

*Prepared by: Anirudh, Chetan*  
*Engagement: Capstone Project 02*  
