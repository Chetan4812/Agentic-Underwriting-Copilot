# Experiment 1: Retrieval Top-K Comparison (K=3 vs. K=5)

This experiment evaluates the trade-off of retrieving 3 versus 5 policy chunks on the 40-case golden dataset.

---

## Configuration Details

* **Embedding Model**: `all-MiniLM-L6-v2` (SentenceTransformers)
* **Vector Store**: `Chroma`
* **Chunking Strategy**: `rule_based`
* **Test Dataset**: Stratified `golden_dataset.csv` (40 examples)

---

## Metric Scorecard comparison

| Metric | Target | Actual Score (K=3) | Actual Score (K=5) | Delta | Status (Best) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Faithfulness** | &ge; 0.85 | **92.5%** | **89.0%** | -3.5%| **K=3** |
| **Answer Relevancy** | &ge; 0.80 | **88.0%** | **85.0%** | -3.0%| **K=3** |
| **Context Precision** | &ge; 0.70 | **86.5%** | **78.0%** | -8.5%| **K=3** |
| **Context Recall** | &ge; 0.80 | **91.0%** | **94.0%** | +3.0%| **K=5** |

---

## Quantitative Analysis

1. **Recall Delta (+3.0%)**: Increasing Top-K from 3 to 5 improves Context Recall by 3 percentage points (91.0% to 94.0%), as retrieving more chunks captures complex multi-hop answers that may have borderline similarity scores.
2. **Precision & Relevancy Penalty (-8.5% & -3.0%)**: Context Precision drops significantly by 8.5 percentage points (86.5% to 78.0%). This is because the fourth and fifth chunks are often irrelevant to the specific query, introducing noise. Consequently, Faithfulness drops by 3.5 percentage points as the model tries to integrate distracting information.

---

## Recommendation

**Retain K=3.** 
The minor gain in recall (+3.0%) does not justify the significant drop in context precision (-8.5%) and explanation faithfulness (-3.5%). Furthermore, K=3 reduces prompt token consumption and preserves our p95 application latency constraints.
