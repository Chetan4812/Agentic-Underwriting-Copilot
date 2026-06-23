# Agentic Underwriting Copilot: 9-Agent Architecture & Flow Guide

This guide explains the design philosophy, data flows, and individual agent operations of the **Agentic Underwriting Copilot** developed for Halcyon Credit. 

---

## 1. Why Use 9 Separate Agents?

In typical software systems, a single, massive LLM prompt (monolithic architecture) is often used for reasoning. However, in financial underwriting—especially digital consumer lending—a monolithic prompt suffers from critical failure modes:

1.  **Token Contamination & Context Dilution**: Mixing database records, credit histories, compliance checks, and formatting rules into one prompt introduces "model distraction," causing the LLM to hallucinate or miss strict numeric limits (like a 50% Debt-to-Income cap).
2.  **Lack of Auditability**: A monolithic prompt outputs a black-box decision. An agentic system creates an explicit trace, logging exactly where a check failed, which policy was matched, and how features contributed.
3.  **Strict Compliance Boundaries (Fair Lending)**: Under the Equal Credit Opportunity Act (ECOA), protected attributes (like gender or age) *must not* affect credit risk scoring. By isolating agents, the scoring engine is mathematically blind to these attributes, while the compliance agent can retrospectively run demographic audits to verify fairness.
4.  **Calibrated Hybrid Execution**: We can run non-LLM components (like LightGBM classifiers and vector database indexes) alongside LLM text generators, picking the best tool for each specific step.

---

## 2. Global Request Flow

When an applicant submits an application, the file moves through a state-graph orchestrated by LangGraph:

![Global Request Flow Diagram](diagrams/adgent%20waorkflowdiagram%20.png)

---

## 3. The 9 Specialists (Individual Agent Operations)

The pipeline is managed by a supervisor orchestrating 8 specialized worker nodes inside [app/pipeline.py](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py):

### 1. The Orchestrator (The Supervisor)
*   **Role**: Coordinates the execution order, routes state variables, handles API fallbacks, and executes final branching logic.
*   **Flow**: Invokes parallel workers, collects findings, checks safety flags, and routes the application to the explanation generation or human queue.
*   **Code Reference**: [pipeline.py:L394](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L394) (`run`).

### 2. Data Assembly Agent (The File Ingester)
*   **Role**: Consolidates raw applicant data.
*   **Flow**: Queries the mock databases, pulling and joining records from 7 tables (application, bureau records, installments, POS/credit-card history). It outputs a Pydantic model `ApplicantFile`.
*   **Code Reference**: [pipeline.py:L107](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L107) (`agent_data_assembly`) / [app/models.py](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/models.py).

### 3. Income & Employment Agent (The Reconciler)
*   **Role**: Reconciles self-reported income against tax, bank, and bureau records.
*   **Flow**: Evaluates job stability metrics (e.g. verifying minimum 6-month continuous employment under policy `POL-EMP-002`) and flags anomalies.
*   **Code Reference**: [pipeline.py:L144](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L144) (`agent_income_employment`).

### 4. Credit History Agent (The Bureau Analyst)
*   **Role**: Audits trade lines, delinquencies, and credit depth.
*   **Flow**: Identifies active delinquencies, outstanding collection accounts, and flags if the file is a "thin file" (lacking traditional bureau history, requiring alternative data).
*   **Code Reference**: [pipeline.py:L163](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L163) (`agent_credit_history`).

### 5. Risk Scoring Agent (The Quantitative Modeler)
*   **Role**: Evaluates statistical probability of default.
*   **Flow**: Feeds variables into the trained LightGBM machine learning classifier. It returns the Calibrated Probability of Default (PD) and extracts local feature importances (**SHAP values**) driving the score.
*   **Code Reference**: [pipeline.py:L183](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L183) (`agent_risk_scoring`) / [app/risk_scoring.py](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/risk_scoring.py).

### 6. Policy & Compliance Agent (The Legal Auditor)
*   **Role**: Audits applicant variables against the synthetic policy rulebook.
*   **Flow**: Performs hybrid vector queries on Chroma DB to retrieve relevant clauses (like Debt-to-Income ceilings or military lending caps). It attaches citations (e.g., `[POL-DTI-001]`) to matched rules.
*   **Code Reference**: [pipeline.py:L188](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L188) (`agent_policy_compliance`) / [app/retriever.py](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/retriever.py).

### 7. Fairness Auditor Agent (The Watchdog)
*   **Role**: Scans proposed decision thresholds against cohorts to prevent discrimination.
*   **Flow**: Evaluates statistical parity across demographic segments (such as age or gender). If a bias check fails, it triggers a warning flag.
*   **Code Reference**: [pipeline.py:L235](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L235) (`agent_fairness_auditor`).

### 8. Adjudication Critic Agent (The Quality Controller)
*   **Role**: Reviews outputs for logical coherence before final decisions are written.
*   **Flow**: Executes a self-correcting prompt evaluation loop. If it finds conflicting data (e.g., risk scoring claims "Low Risk" but policy compliance indicates multiple hard-stop violations), it rejects the draft and triggers a revision.
*   **Code Reference**: [pipeline.py:L256](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L256) (`agent_adjudication_critic`).

### 9. Explanation Writer OR Human Escalation (The Outbox)
*   **Role**: Compiles the final underwriter-facing output.
*   **Flow (Decision)**: If the critic passes the file, the **Explanation Writer** uses an LLM to write a formal, audit-ready adverse-action or approval notice, mapping SHAP factors to regulatory reason codes and bracketed policy citations.
*   **Flow (Escalation)**: If any safety flag is triggered (thin-file, demographic discrepancy, low model confidence, or critic failure), the **Human Escalation Agent** is called. It compiles a "Referral Package" detailing what was resolved, what was uncertain, and why human review is required.
*   **Code Reference**: [pipeline.py:L306](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L306) (`agent_explanation_writer`) / [pipeline.py:L371](file:///Users/anirudhsharma/Desktop/Agentic-Underwriting-Copilot/app/pipeline.py#L371) (`agent_human_escalation`).
