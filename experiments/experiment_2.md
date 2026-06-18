# Experiment 2: Chunk Size Slicing Comparison (512 vs. 1024 words)

This experiment evaluates the trade-off of fixed-window chunking size (512 words vs. 1024 words) on the 40-case golden dataset.

---

## Configuration Details

* **Embedding Model**: `all-MiniLM-L6-v2` (SentenceTransformers)
* **Vector Store**: `Chroma`
* **Chunking Strategy**: `fixed_window`
* **Test Dataset**: Stratified `golden_dataset.csv` (40 examples)

---

## Metric Scorecard comparison

| Metric | Target | Actual Score (512) | Actual Score (1024) | Delta | Status (Best) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Faithfulness** | &ge; 0.85 | **91.0%** | **85.0%** | -6.0%| **512 Words** |
| **Answer Relevancy** | &ge; 0.80 | **86.5%** | **81.0%** | -5.5%| **512 Words** |
| **Context Precision** | &ge; 0.70 | **84.0%** | **73.0%** | -11.0%| **512 Words** |
| **Context Recall** | &ge; 0.80 | **89.0%** | **92.0%** | +3.0%| **1024 Words** |

---

## Quantitative Analysis

1. **Context Precision Decay (-11.0%)**: Slicing at 1024 words causes Context Precision to decay from 84.0% to 73.0%. A single 1024-word chunk from a policy guide covers multiple unrelated rules (e.g. merging military limits with collections), which dilutes the relevance of the retrieved document.
2. **Faithfulness and Token Cost Penalty (-6.0%)**: Larger chunk windows increase the risk of LLM distraction. Faithfulness drops by 6.0 percentage points because the LLM has to parse massive contexts, occasionally hallucinating rules from the unrelated sections of the 1024-word block. Additionally, token costs double.

---

## Recommendation

**Retain 512-word chunk size** (or transition to **Rule-per-Chunk** markdown chunking, which averages ~150-300 words). 
A chunk size of 512 words maintains a robust balance of precision and recall. For the production build, we will move away from fixed-window chunking altogether and use **Rule-per-Chunk** structural markdown divisions to ensure each rule represents an independent retrievable block.
