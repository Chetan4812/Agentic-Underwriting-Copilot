Technical Design Document

Agentic Underwriting Copilot for Halcyon Credit

Version: 1.0

Author: Anirudh, Chetan

Date: June 2026

Engagement: Capstone Project

# 1. Architecture Overview

The system is a nine-agent LangGraph pipeline fronted by a LiteLLM gateway. A single application assessment passes through six specialist agents in a directed graph, reviewed by an Adjudication Critic before the Explanation Writer produces the final decision record. Any case that fails the critic twice, is flagged as thin-file, or triggers a fairness flag is routed to a Human Escalation agent that produces a referral package rather than a decision.

## 1.1 Pipeline Flow

Ingestion → feature assembly → embedding (policy docs) → vector store (Chroma) → retriever → prompt assembly → LLM → answer with citations → bounded action (DecisionRecord or ReferralPackage).

## 1.2 Agent Topology


| Agent | Single Responsibility | Model Tier | Key Output |
| --- | --- | --- | --- |
| Orchestrator | Receives application, plans sequence, assembles final package | Cheap | Assessment plan |
| Data Assembly | Pulls & normalises all 7 data tables into ApplicantFile | Cheap | ApplicantFile (typed) |
| Income & Employment Verification | DTI check, income consistency, document plausibility | Cheap | IncomeVerificationResult |
| Credit History | Summarises bureau records, sets thin-file flag | Cheap | BureauSummary |
| Risk Scoring | Calls LightGBM model, extracts SHAP factors | Local (no LLM) | RiskScoringResult |
| Policy & Compliance | RAG over policy corpus, checks applicable rules | Mid | PolicyComplianceResult |
| Fairness & Bias Check | Compares decision to segment baseline, flags gaps | Cheap | FairnessCheckResult |
| Adjudication Critic | Evaluator-optimizer: checks faithfulness, approves or revises | Strong | CriticVerdict |
| Explanation Writer | Produces grounded narrative + structured DecisionRecord | Strong | DecisionRecord / ReferralPackage |


# 2. Pydantic Data Contracts

Every inter-agent handoff is typed. No agent consumes free-form text from another agent — all inputs and outputs conform to the schemas below. These schemas are the source of truth for integration; any agent can be swapped without breaking the system so long as it conforms to its contract.

## 2.1 ApplicationInput

Typed input to the pipeline.

class ApplicationInput(BaseModel):     sk_id_curr: int     requested_at: datetime     raw_fields: dict  # normalised by Data Assembly Agent

## 2.2 ApplicantFile

Normalised applicant record produced by the Data Assembly Agent.

class ApplicantFile(BaseModel):     sk_id_curr: int     age_years: float     employment_tenure_years: Optional[float]     income_total: float     credit_amount: float     dti_ratio: float                # annuity / income     credit_to_income_ratio: float     thin_file: bool                 # True = no bureau history     days_employed_anomaly: bool     # True = sentinel value detected     bureau: BureauSummary     prior_applications: PriorApplicationSummary     ext_source_scores: List[Optional[float]]

## 2.3 RiskScoringResult

class RiskScoringResult(BaseModel):     probability_of_default: float          # calibrated 0-1     risk_tier: Literal["low","medium","high","very_high"]     confidence_band: tuple[float, float]   # 90% interval     low_confidence: bool                   # True = route to human     top_shap_factors: List[ShapFactor]     # top 5 signed

## 2.4 DecisionRecord (Final Output)

class DecisionRecord(BaseModel):     sk_id_curr: int     decision: Literal["recommend_approve","recommend_decline","refer_to_human"]     confidence: float     top_reasons: List[str]          # max 5, each citing SHAP or policy clause     policy_citations: List[str]     # clause IDs cited     explanation_narrative: str      # human-readable explanation     fairness_flag: bool     thin_file_flag: bool     audit_trail: dict               # full agent step log     total_cost_usd: float

# 3. Model & Embedding Choices


| Component | Choice | Justification |
| --- | --- | --- |
| Risk model | LightGBM + class weights | Best-in-class on tabular; calibrated probability; native SHAP support |
| Calibration | Isotonic regression | Better than Platt for non-symmetric class distributions |
| Explainability | SHAP TreeExplainer | Per-application local explanations in <100ms; native to LightGBM |
| Embeddings (policy docs) | all-MiniLM-L6-v2 | Free, local, strong semantic retrieval; no API cost during iteration |
| Vector store | Chroma | Free, local, direct LangGraph integration |
| LLM — cheap tier | DeepSeek / Qwen / Gemini Flash | Structured-output tasks where instruction-following is sufficient |
| LLM — strong tier | Claude Sonnet / GPT-4o-mini | Eval and final runs only; faithfulness-critical reasoning |
| LLM gateway | LiteLLM | Unified routing, fallback chain, per-call cost logging |


# 4. The Bounded Action

The agent's single bounded action is producing a structured DecisionRecord or ReferralPackage — a typed JSON artifact written to the decision-record store, which triggers the underwriter's queue notification.

Explicit boundaries: the agent does not submit a final decision, does not modify the application, does not communicate with the applicant, and does not call any external financial system. Human sign-off remains mandatory for all declines and escalations.

# 5. Deployment & Re-Index Sketch

Where it runs: FastAPI service on a free-tier cloud host (Render / Railway / HF Spaces). Chroma vector store persisted to a volume mount.

How a new document gets indexed: a /admin/index-document endpoint accepts a new policy document, chunks and embeds it via the same pipeline, upserts into Chroma, and runs the 10-query retrieval regression suite automatically before the document goes live.