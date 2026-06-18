# Retrieval De-Risk Spike Findings

This document outlines the findings of our **Retrieval De-Risk Spike** (`spike/retrieval_spike.py`), which was executed to test our riskiest assumption: *that a vector database grounded in our credit policy corpus can reliably retrieve correct compliance clauses for applicant files.*

---

## 1. Retrieval Accuracy Summary

The de-risk spike loaded 15 synthetic policy documents, chunked them using standard fixed-size word-based windows (80 words, 20 words overlap), embedded them using local `all-MiniLM-L6-v2` embeddings, and stored them in a local Chroma vector database. We executed 10 representative underwriting and compliance queries.

| Metric | Result | Target | Status |
|---|---|---|---|
| **Top-1 Retrieval Accuracy (Hit Rate)** | **90.0%** (9/10) | ≥ 80.0% | **Passed** |
| **Top-3 Retrieval Accuracy (Hit Rate)** | **100.0%** (10/10) | ≥ 90.0% | **Passed** |

### Detailed Query Performance

| Query | Expected Clause | Top-1 Retrieved | Top-3 Retrieved | Hit (Y/N) |
|---|---|---|---|---|
| What is the maximum debt to income ratio allowed? | `POL-DTI-001` | `POL-LTV-005` | `POL-LTV-005`, `POL-DTI-001`, `POL-AMT-010` | **Y** (Top-2) |
| Are thin file applicants with no credit history automatically declined? | `POL-THN-004` | `POL-THN-004` | `POL-THN-004`, `POL-CRD-003`, `POL-CRD-003` | **Y** (Top-1) |
| How do we handle DAYS_EMPLOYED anomaly or pensioner employment status? | `POL-EMP-002` | `POL-EMP-002` | `POL-EMP-002`, `POL-EMP-002`, `POL-THN-004` | **Y** (Top-1) |
| What are the rules for applicants with a recent bankruptcy? | `POL-CRD-003` | `POL-CRD-003` | `POL-CRD-003`, `POL-EMP-002`, `POL-THN-004` | **Y** (Top-1) |
| Can we approve a loan if the applicant is on active duty in the military? | `POL-MIL-012` | `POL-MIL-012` | `POL-MIL-012`, `POL-THN-004`, `POL-COI-014` | **Y** (Top-1) |
| How many paystubs are required to verify income? | `POL-INC-006` | `POL-INC-006` | `POL-INC-006`, `POL-INC-006`, `POL-EMP-002` | **Y** (Top-1) |
| What should do if name on application does not match bureau? | `POL-FRA-009` | `POL-FRA-009` | `POL-FRA-009`, `POL-ADV-008`, `POL-COL-011` | **Y** (Top-1) |
| What are adverse action codes for high credit card utilization? | `POL-ADV-008` | `POL-ADV-008` | `POL-ADV-008`, `POL-CRD-003`, `POL-FRA-009` | **Y** (Top-1) |
| Can we approve an application if there is an active collection? | `POL-COL-011` | `POL-COL-011` | `POL-COL-011`, `POL-CRD-003`, `POL-FRA-009` | **Y** (Top-1) |
| Is age or gender allowed to be used when assessing credit risk? | `POL-FAR-007` | `POL-FAR-007` | `POL-FAR-007`, `POL-CRD-003`, `POL-THN-004` | **Y** (Top-1) |

---

## 2. Key Observations

1. **Semantic Match High-Quality**: The local `all-MiniLM-L6-v2` encoder showed strong semantic capacity, mapping domain terminology (e.g. "bankruptcy", "collection", "active duty", "paystubs") directly to the relevant clauses.
2. **First-Pass Overlap / Semantic Distraction**: The query `"What is the maximum debt to income ratio allowed?"` retrieved `POL-LTV-005` (Loan-to-Value & Leverage Ratio) as the Top-1 result, with the correct document (`POL-DTI-001`) ranked Top-2. This occurred because `POL-LTV-005` contains phrases like `Credit-to-Income ratio (total credit amount requested / gross annual income)` which semantic embeddings mapped closely to `debt to income ratio`.
3. **Chunk Boundary Alignment**: Standard fixed-size word chunking (baseline of 80 words) successfully captured individual policy clauses without cutting sentences mid-sentence since the synthetic policies are relatively concise. However, in larger documents, fixed-size windows risk separating a rule threshold from its definitions.

---

## 3. Limitations of the Baseline Approach

• **Lack of Structural Chunking**: The fixed-word chunking does not understand logical structure. For instance, when policies contain tabular rules (e.g. "DTI between 40% and 50% routes to review"), fixed chunking can easily segment the table across chunk borders, making half of the table unretrievable in isolation.
• **No Keyword Guardrails**: Pure dense embeddings struggle when distinguishing highly similar terms that represent different business concepts (e.g., "Credit-to-Income" vs. "Debt-to-Income").
• **Cold-Start Sensitivity**: Queries with non-standard phrasing or vocabulary (e.g., "Under what conditions can we lend to active duty army?") could result in a lower rank score if the embedding model fails to equate "military" with "army" in a narrow context.

---

## 4. Next-Phase Improvements

To transition into the Week 16 build, we will implement the following refinements to guarantee 100% Top-1 policy adherence:

1. **Rule-Based Structural Chunking**: Instead of fixed word counts, we will transition to **Rule-per-Chunk** slicing. Each policy rule will be treated as an atomic Markdown section, ensuring it retains its stable clause ID (e.g., `POL-DTI-001`) and context.
2. **Hybrid Search Configuration**: We will integrate **BM25 keyword matching** alongside the `all-MiniLM-L6-v2` dense embeddings, combining them using a Reciprocal Rank Fusion (RRF) algorithm. This will prevent "semantic distractions" (like DTI vs. Credit-to-Income) by placing strict emphasis on specific keywords.
3. **Self-RAG-Lite / Query Reformulation**: We will implement a lightweight query reformulation step in the Policy compliance agent. If the retriever's confidence/distance score is below a predefined threshold, the agent will reformulate the query once (e.g., using LLM cheap tier) and run a secondary search.
4. **Hard-Stop Metadata Filtering**: Enable metadata filtering on document categories (e.g., filtering search space to collections-only documents when checking collection fields) to prevent cross-contamination.
