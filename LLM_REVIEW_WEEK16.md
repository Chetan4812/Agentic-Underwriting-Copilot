# LLM Red-Team Review: Worst-Case Retrieval Diagnosis & Fix

This document records the red-teaming and debugging process for the worst-performing evaluation query during our baseline vertical slice trials, detailing the prompt, the LLM diagnosis, our critique, the implemented fix, and the resulting scorecard improvement.

---

## 1. The Worst-Performing Case (Baseline)

* **Question**: "What is the maximum debt to income ratio allowed?"
* **Expected Document**: `POL-DTI-001` (Debt-to-Income Limits and Calculation Policy)
* **Retrieved Context (Top-1)**: `POL-LTV-005` (Loan-to-Value & Leverage Ratio Limits)
  * *Retrieved text snippet*: "...The Credit-to-Income ratio (total credit amount requested / gross annual income) must not exceed 4.0 for standard applicants..."
* **Generated Answer (Failing)**: "Under Halcyon policy [POL-LTV-005], the Credit-to-Income ratio must not exceed 4.0 for standard applicants."
* **Ground Truth**: "The maximum allowable Debt-to-Income (DTI) ratio for any personal loan is 50%. Any application exceeding this limit is flagged as a hard stop and recommended for decline."
* **Baseline Scores**:
  * Faithfulness: 1.0 (The generated answer was faithful to the retrieved chunk, but wrong relative to the user's intent).
  * Answer Relevancy: 0.15 (The answer did not resolve the question about DTI limits).
  * Context Precision: 0.00 (The correct document `POL-DTI-001` was ranked Top-2 instead of Top-1).
  * Context Recall: 1.00 (The correct document was present in the Top-3 retrieved contexts).

---

## 2. Red-Team Diagnosis Prompt

The following prompt was sent to the LLM to diagnose the failure:

```text
You are a Staff AI Engineer. Review this failing RAG case:
- Question: "What is the maximum debt to income ratio allowed?"
- Expected: "POL-DTI-001" (DTI limits)
- Retrieved Top-1: "POL-LTV-005" (Credit-to-Income leverage limits)
- Resulting generation: Incorrectly answered with Credit-to-Income ratio limits.

Explain why the dense vector retriever (using all-MiniLM-L6-v2) failed to rank POL-DTI-001 above POL-LTV-005, and propose a concrete technical fix.
```

---

## 3. LLM Diagnosis Response

> ### Model Diagnosis
>
> The failure is caused by **semantic term dilution** and **vector space collision**:
>
> 1. **Semantic Similarity**: The terms "Credit-to-Income ratio" and "Debt-to-Income ratio" are highly similar in vector space. Both map to financial leverage and income divisions. The embedding model `all-MiniLM-L6-v2`, with a context window of 256 tokens, represents these concepts in close proximity.
> 2. **Token Contamination**: In the baseline `fixed_window` chunking strategy (80 words), the DTI document chunk contains generic introductory sentences. Conversely, the `POL-LTV-005` chunk contains denser numeric limits ("4.0 for standard", "2.0 for thin-file"), which matched the query's term "allowed" more strongly, pushing its cosine similarity score higher.
>
> **Proposed Fix**: Increase the chunk size to 1024 words to merge these two documents into a single chunk, so that the LLM receives both policies and can select the correct DTI rule inside the context.

---

## 4. Our Engineering Critique

We evaluated the model's diagnosis and disagreed with the proposed fix:

* **Where the LLM was Correct**: The model correctly identified that dense vectors are blind to exact terms like "Credit-to-Income" versus "Debt-to-Income" because they are semantically adjacent. It was also correct that fixed chunking margins create token dilution.
* **Where the LLM was Wrong (and Generic)**: The LLM's proposal to increase chunk size to 1024 words is an **anti-pattern**. Slicing at 1024 words would load more irrelevant tokens into the prompt context, increasing API costs, degrading context precision, and introducing model distraction (as proven in Experiment 2).
* **Our Selected Fix**: Instead of increasing chunk sizes, we implemented:
  1. **Rule-per-Chunk Markdown Chunking**: Slicing the policies strictly by structural document borders (`rule_based`), keeping `POL-DTI-001` intact as a single, isolated vector.
  2. **Citations Mapping**: Forcing the Explanation Writer to cite the specific retrieved ID, and instructing the Adjudicator Critic to verify that the SHAP factor names (e.g. `dti_ratio`) match the cited document ID (e.g. `POL-DTI-001`).

---

## 5. Implemented Fix & New Metrics

We verified the fix by running the evaluation suite under the `rule_based` chunking configuration.

### Scorecard Comparison (DTI Query)

| Metric | Baseline (fixed_window) | Revised (rule_based) | Delta | Status |
|:---|:---:|:---:|:---:|:---:|
| **Top-1 Retrieval Hit** | `POL-LTV-005` (Incorrect) | `POL-DTI-001` (Correct) | **Resolved** | **PASS** |
| **Answer Relevancy** | 15.0% | **92.0%** | **+77.0%** | **PASS** |
| **Context Precision** | 0.0% | **100.0%** | **+100.0%** | **PASS** |
| **Faithfulness** | 100.0% (to wrong doc) | **100.0%** (to correct doc) | **Neutral** | **PASS** |

Under the structural `rule_based` chunking strategy, the retriever correctly identified `POL-DTI-001` as the Top-1 match because the chunk was compact and focused entirely on the DTI limit, eliminating vector dilution.
