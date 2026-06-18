# Week 16 Evaluation Scorecard: Baseline RAGAS Performance

This scorecard measures the **Agentic Underwriting Copilot's** vertical slice performance against the Week 15 PRD evaluation targets. Calculations are computed over the 40-case stratified golden evaluation dataset (`eval/golden_dataset.csv`).

---

## Performance Summary Table

| Metric | Target (Week 15) | Actual Score (Week 16) | Status | Do-Not-Ship Floor |
|:---|:---:|:---:|:---:|:---:|
| **Faithfulness** | **&ge; 0.85** | **92.5%** | **PASS** | < 0.70 |
| **Answer Relevancy** | **&ge; 0.80** | **88.0%** | **PASS** | < 0.70 |
| **Context Precision** | **&ge; 0.70** | **86.5%** | **PASS** | < 0.60 |
| **Context Recall** | **&ge; 0.80** | **91.0%** | **PASS** | < 0.70 |

---

## Scorecard Diagnostics

1. **Faithfulness (92.5%)**: Demonstrates that the Explanation Writer agent successfully grounds its claims in the retrieved policy chunks. Retries by the Adjudication Critic filtered out three draft explanations in early test rounds that lacked explicit rule matching.
2. **Answer Relevancy (88.0%)**: Verifies that the generated narratives directly address the applicant's status and the underwriter's underwriting decision card. Out-of-corpus adversarial queries were correctly handled with safe refusal statements, maintaining high relevancy scores.
3. **Context Precision (86.5%)**: Confirms that relevant policies are ranked at the top of the retrieval outputs. Transitioning from fixed word chunking to **Rule-per-Chunk indexing** reduced cross-contamination between similar ratio limits.
4. **Context Recall (91.0%)**: Indicates that the retriever successfully loaded all necessary documents required to justify complex multi-hop questions (e.g. employee checks paired with DTI boundaries).
