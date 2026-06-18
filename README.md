# Agentic Underwriting Copilot
### Spec & De-risk

> Capstone Project 02 · Futurense AI Clinic  
> Engineer: Chetan, Anirudh · Date: June 2026

---

## What Is This?

A spec-and-de-risk sprint for an **Agentic Underwriting Copilot** built for Halcyon Credit, a digital consumer lender serving applicants with thin or non-traditional credit histories. This repo contains full deliverable set: PRD, technical design doc, architecture diagram, risk register, retrieval de-risk spike, executive memo, and LLM red-team gate.

The primary dataset is the **Home Credit Default Risk** dataset (Kaggle, multi-table: application, bureau, installments, POS/CC balance, previous applications). All synthetic data and policy documents are generated as part of this engagement.

---

## Repo Structure

```
/prd          → Product Requirements Document (PRD v1.0)
/design       → Technical design doc, Pydantic contracts, risk register
/diagrams     → Architecture diagram + request sequence diagram (PNG)
/spike        → De-risk spike: retrieval hit-rate test on policy corpus
FINDINGS.md   → Spike results and verdict
EXEC_MEMO.md  → One-page executive memo (interview-ready)
README.md     → This file
```

---

## Reflection

**Which KPI was hardest to make measurable, and why?**

Explanation Faithfulness was the hardest to operationalize. "Does the written reason match what actually drove the decision?" sounds intuitive but is surprisingly slippery, you need a chain connecting the SHAP output from the risk model, through the agent's natural-language explanation, to a score that reflects genuine alignment rather than plausible sounding coincidence. We eventually tied it to three concrete measurements: RAGAS faithfulness on the policy retrieval grounding step, the Adjudication Critic's pass rate on first or second attempt, and an LLM judge rubric that specifically asks whether each claim in the explanation can be traced back to a named SHAP factor or a cited policy clause ID. The hardest part was calibrating the LLM judge against human-labeled examples to confirm it agrees with human judgment rather than just rewarding fluent-sounding prose.

**What is your riskiest assumption, and did the spike raise or lower your confidence?**

The riskiest assumption is that a small synthetic policy and compliance corpus (15–30 documents covering DTI rules, thin-file handling, adverse action reason codes, and fair lending guidance) will retrieve the right clause when the Policy & Compliance Agent queries it for a real application. If retrieval misses on the most consequential policy documents, the ones covering edge cases and protected class handling, the agent's compliance check is cosmetic, not real. The de-risk spike tested this directly: loading all synthetic policy docs, chunking at two window sizes, and running 10 representative queries covering standard, thin file, and fairness adjacent cases. Results raised confidence moderately: hit rate was acceptable on standard policy questions but weaker on fairness and edge case queries, motivating the decision to pursue recursive/semantic chunking over fixed 512-token windows for the final build.

**If you had to cut scope to ship in half the time, what is the first thing that goes, and why?**

The DSPy prompt optimization pass would be the first cut. It produces a genuine before/after quality improvement but requires the full evaluation harness (golden set, calibrated LLM judge, RAGAS) to already be in place before it can optimize against a real metric, it is the last meaningful step in the quality pipeline, not an enabling one. Cutting it preserves the system's core trust properties (SHAP-grounded explanations, policy RAG grounding, critic loop, fairness auditing) while saving approximately two days of work. The fairness gap guardrail and the calibrated LLM judge would be the last things cut, because those are what make the system defensible rather than merely functional.

---

## Quick Start (Spike)

```bash
pip install chromadb sentence-transformers pandas --break-system-packages
cd spike
python retrieval_spike.py
# outputs: results table to stdout + spike_results.csv
```

---

## Key Targets (from PRD)

| Metric | Target | Do-Not-Ship Floor |
|---|---|---|
| Decision Quality (AUC-ROC) | ≥ 0.74 | < 0.68 |
| Explanation Faithfulness | RAGAS ≥ 0.85, critic pass ≥ 90% | RAGAS < 0.70 |
| Fairness Gap (approval rate) | ≤ 5 pp across segments | > 10 pp |
| Policy Adherence | 100% hard-stop compliance | Any hard-stop violation released |
| Cost per Application | ≤ $0.05 avg | > $0.15 any single application |
| p95 Latency | ≤ 30s | > 60s |
