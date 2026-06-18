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

---

## Week 16 Build Reflections

During the development and evaluation of the evaluable core vertical slice, we identified several critical failure modes and refined our operational guardrails:

1. **Where Retrieval Failed (Semantic Vector Collision)**:
   In our baseline dense retriever trials (using `all-MiniLM-L6-v2`), queries regarding the Debt-to-Income (DTI) ratio limits (e.g., "What is the maximum debt to income ratio allowed?") frequently retrieved the Loan-to-Value (LTV) and leverage ratio policy (`POL-LTV-005`) as the Top-1 result rather than the actual DTI policy (`POL-DTI-001`). This failure was caused by a semantic vector space collision: both policies heavily use adjacent terms like "Credit-to-Income", "income ratio", and "debt-to-income ratio". Slicing at fixed 80-word windows diluted the unique rule terminology, leading to semantic dilution. We resolved this by transitioning to a **Rule-per-Chunk Markdown Chunking** (`rule_based`) strategy, separating distinct policy clauses into isolated vector records.

2. **Where Generation Failed (Hallucination under Prompt V1)**:
   Under the generic QA Prompt (Prompt V1), the Explanation Writer LLM hallucinated non-existent policy limits and credit parameters (such as declaring that applicants were declined due to "poor payment history" or inventing a specific dollar amount for maximum loan limits) that were not present in the retrieved context. Because Prompt V1 only instructed the model to "explain the reasons clearly", the model relied on its pre-trained parametric knowledge instead of strict grounding. Implementing Prompt V2 (SHAP-Grounded Prompt) eliminated this by strictly binding generated narratives to local SHAP attribution scores and requiring explicit bracketed citations (e.g., `[POL-DTI-001]`) for every policy claim.

3. **Misleading Metric (Faithfulness on Incorrect Context)**:
   We discovered that **Faithfulness** alone can be highly misleading. During the DTI retrieval failure, the LLM generated an answer that was 100% faithful to the retrieved chunk (`POL-LTV-005`), resulting in a perfect Faithfulness score of 1.0. However, the answer was completely incorrect and irrelevant to the applicant's query. This highlighted the necessity of evaluating **Context Precision** and **Answer Relevancy** in tandem: a system can be perfectly faithful to incorrect context, producing a fluent but entirely wrong compliance decision.

4. **Revised KPI (p95 Cost Ceiling and Critic Retry Limit)**:
   To prevent runaway API costs from the Adjudication Critic's evaluator-optimizer loop, we revised our **Cost per Application** KPI. In Week 15, we targeted an average cost of ≤ $0.05 without a hard limit on the critic loop. In Week 16, we established a **p95 Cost Ceiling of $0.15** per application and hard-coded a **maximum of 1 critic retry**. This prevents the critic from triggering infinite self-correction loops when the explanation writer struggles to ground complex multi-hop decisions, ensuring deterministic cost bounds.

