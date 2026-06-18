import os
import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict, Any, Tuple

# 15 Credit Policies Corpus
POLICIES = {
    "POL-DTI-001": """
    Debt-to-Income (DTI) Limits and Calculation Policy.
    This policy defines how Halcyon Credit assesses an applicant's monthly debt payments relative to gross income.
    The primary metric is the Debt-to-Income (DTI) ratio, calculated as (monthly credit payment + other recurring monthly debt payments) / gross monthly income.
    The maximum allowable DTI ratio for any personal loan is 50%.
    Any application with a DTI ratio exceeding 50% must be flagged as a hard stop and recommended for decline.
    If the DTI is between 40% and 50%, the application must be routed for manual underwriter review.
    """,
    "POL-EMP-002": """
    Employment Tenure and Income Stability Guidelines.
    Halcyon Credit requires applicants to demonstrate stable employment to ensure repayment capacity.
    Standard applicants must have a minimum of six (6) months of continuous employment with their current employer.
    Exceptions apply for pensioners and retirees. Unemployed applicants or those receiving pension benefits must have their income verified through bank deposits showing at least three consecutive monthly pension disbursements.
    If a sentinel value of DAYS_EMPLOYED = 365243 is detected, it indicates a pensioner or unemployed applicant.
    Underwriters must manually review these accounts to verify their source of income and must not apply standard employment duration checks.
    """,
    "POL-CRD-003": """
    Credit History and Bankruptcy Policy.
    This policy governs the treatment of negative credit history events, including bankruptcies, charge-offs, and defaults.
    Any applicant with an active or open bankruptcy filing within the last seven (7) years is ineligible for credit and must be auto-declined.
    Applicants with a settled bankruptcy more than three (3) years ago may be approved, subject to thin-file alternative verification.
    Any applicant with a credit default or charge-off event on any trade line in the last twelve (12) months must be flagged as a high credit risk and referred to a senior underwriter.
    """,
    "POL-THN-004": """
    Thin-File and Alternative Credit Data Policy.
    Halcyon Credit serves digital consumer applicants, many of whom have thin or non-traditional credit files (fewer than two credit bureau trade lines).
    Thin-file applicants must not be auto-declined solely due to a lack of traditional bureau history.
    Instead, alternative credit indicators must be verified. This includes verifying consistent utility bill payments, cell phone bill payments, or rental payment history for the past twelve (12) consecutive months.
    If alternative verification succeeds, the applicant may be assigned a synthetic risk tier and considered for approval with a capped loan amount.
    """,
    "POL-LTV-005": """
    Loan-to-Value (LTV) and Leverage Ratio Limits.
    This policy caps the amount of credit extended based on the applicant's income.
    The Credit-to-Income ratio (total credit amount requested / gross annual income) must not exceed 4.0 for standard applicants.
    For thin-file applicants, the Credit-to-Income ratio must not exceed 2.0.
    Any request exceeding these leverage ratios must be truncated to the maximum allowed limit or escalated for senior underwriter sign-off.
    """,
    "POL-INC-006": """
    Income Verification and Income Discrepancy Reconciliation.
    Halcyon Credit mandates verification of gross monthly income prior to loan disbursal.
    Applicants must provide at least two (2) consecutive recent paystubs from the last 60 days, or three (3) consecutive months of bank statements showing regular direct deposit income.
    If the difference between self-reported income on the application and verified direct deposit income exceeds 15%, an income discrepancy flag is triggered.
    The Income & Employment Agent must route such cases for manual document verification by a frontline underwriter.
    """,
    "POL-FAR-007": """
    Fair Lending Compliance and Anti-Discrimination Policy.
    Halcyon Credit complies fully with the Equal Credit Opportunity Act (ECOA).
    Decisions must be based solely on credit risk indicators and repayment capacity.
    No underwriting agent, human or automated, may use protected attributes—including gender (CODE_GENDER), age (DAYS_BIRTH), race, religion, or marital status—as inputs to credit scoring models or underwriting decisions.
    Gender and age fields must be redacted during data ingestion and only used retrospectively by the Fairness Agent to compute segment approval rates and audit for statistical bias.
    """,
    "POL-ADV-008": """
    Adverse Action Notification and Reason Code Taxonomy.
    Under the Fair Credit Reporting Act (FCRA), when an applicant is declined, Halcyon Credit must provide specific adverse action reasons.
    Explanations must not use vague or boilerplate reason codes.
    The Explanation Writer must map the decision to one of the approved regulatory codes:
    - Code 'ADV-DTI': Monthly debt payments too high relative to income.
    - Code 'ADV-DEL': Unresolved recent delinquency or credit default.
    - Code 'ADV-EMP': Insufficient or unverifiable employment history.
    - Code 'ADV-THN': Lack of established credit history with insufficient alternative data.
    Each code must cite the primary SHAP factor driving the risk score.
    """,
    "POL-FRA-009": """
    Fraud Detection and Identity Consistency Safeguards.
    This policy details controls for detecting identity fraud, synthetic fraud, and application manipulation.
    If the applicant's name on the application does not match the name on the credit bureau record, the application is flagged for high fraud risk.
    Similarly, any active mismatch in Social Security Number (SSN) or national identifier records between the application and the bureau database must trigger an immediate freeze and manual verification.
    """,
    "POL-AMT-010": """
    Loan Amount Limits and Underwriter Approval Limits.
    The maximum personal loan amount offered by Halcyon Credit is $50,000.
    Frontline underwriters have authority to approve loans up to $25,000.
    Loans between $25,001 and $50,000 require senior underwriter approval.
    Any recommendation by the copilot for a loan exceeding $25,000 must be routed to the senior underwriter escalation queue, even if the model risk assessment is low.
    """,
    "POL-COL-011": """
    Collections, Charge-offs, and Active Disputes.
    Active collection accounts indicate significant credit distress.
    Any applicant with an active, unresolved collection account exceeding $500 is ineligible for auto-approval.
    Active medical collections are exempt from this limit.
    Applicants with active trade disputes must be referred to a human underwriter to verify the dispute resolution status.
    """,
    "POL-MIL-012": """
    Military Lending Act (MLA) Compliance Policy.
    The Military Lending Act protects active-duty service members, their spouses, and dependents.
    Halcyon Credit is prohibited from charging service members a Military Annual Percentage Rate (MAPR) exceeding 36%.
    All active-duty applications must pass an automated database check against the Defense Manpower Data Center (DMDC) registry.
    If verified as active military, the application must be assigned a maximum MAPR cap of 36% and must not include mandatory arbitration clauses.
    """,
    "POL-REF-013": """
    Refinance and Loan Modification Guidelines.
    Applicants seeking to refinance an existing loan with Halcyon Credit must meet specific tenure rules.
    Refinancing is permitted only if the original loan has been active for at least twelve (12) consecutive months.
    The applicant must have no late payments (defined as >30 DPD) on the current loan during the last nine (9) months.
    """,
    "POL-COI-014": """
    Conflict of Interest and Employee Lending.
    Lending to Halcyon Credit employees, directors, or major shareholders requires independent oversight.
    All employee loan applications must bypass the standard automated recommendation flow.
    These applications must be routed to the Internal Audit and Compliance committee for board-level review and manual sign-off.
    """,
    "POL-KYC-015": """
    Know Your Customer (KYC) and Anti-Money Laundering (AML) Compliance.
    To comply with BSA and AML regulations, Halcyon Credit must verify the identity of all applicants.
    Verifications require a valid government-issued photo ID (driver's license or passport) and an automated comparison against the OFAC sanctions list.
    Any positive match on the OFAC registry triggers an immediate compliance hold and referral to the AML Officer.
    """
}

class UnderwritingRetriever:
    def __init__(self, db_path: str = "app_chroma_db", chunk_strategy: str = "rule_based", chunk_size: int = 512):
        self.db_path = db_path
        self.chunk_strategy = chunk_strategy
        self.chunk_size = chunk_size
        self.client = chromadb.PersistentClient(path=db_path)
        self.emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        self.collection_name = f"halcyon_policies_{chunk_strategy}_{chunk_size}"
        
        # Initialize or get collection
        try:
            self.collection = self.client.get_collection(name=self.collection_name, embedding_function=self.emb_fn)
        except Exception:
            self.collection = self.client.create_collection(name=self.collection_name, embedding_function=self.emb_fn)
            self._index_corpus()
            
    def _chunk_text(self, doc_id: str, text: str) -> List[Dict[str, Any]]:
        """Splits document text based on chunk strategy."""
        chunks = []
        if self.chunk_strategy == "rule_based":
            # Slices rule-per-chunk: treating the whole rule as an intact, stable unit
            chunks.append({
                "id": f"{doc_id}_chunk_0",
                "text": text.strip(),
                "metadata": {"doc_id": doc_id, "chunk_index": 0}
            })
        elif self.chunk_strategy == "fixed_window":
            # Fixed word chunking (used in comparative experiments)
            words = text.split()
            overlap = int(self.chunk_size * 0.2)
            i = 0
            chunk_idx = 0
            while i < len(words):
                chunk_words = words[i:i + self.chunk_size]
                chunk_text = " ".join(chunk_words)
                chunks.append({
                    "id": f"{doc_id}_chunk_{chunk_idx}",
                    "text": chunk_text,
                    "metadata": {"doc_id": doc_id, "chunk_index": chunk_idx}
                })
                chunk_idx += 1
                i += self.chunk_size - overlap
                if i >= len(words) - overlap:
                    break
        return chunks

    def _index_corpus(self):
        """Processes and indexes the policy corpus into Chroma."""
        ids = []
        documents = []
        metadatas = []
        
        for doc_id, text in POLICIES.items():
            chunks = self._chunk_text(doc_id, text)
            for chunk in chunks:
                ids.append(chunk["id"])
                documents.append(chunk["text"])
                metadatas.append(chunk["metadata"])
                
        if ids:
            self.collection.add(ids=ids, documents=documents, metadatas=metadatas)

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Queries the vector database and returns top-k matching policy snippets."""
        res = self.collection.query(query_texts=[query], n_results=top_k)
        retrieved = []
        if res and res["documents"] and len(res["documents"][0]) > 0:
            for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
                # Convert distance to a similarity score (closer to 1 = better)
                score = max(0.0, min(1.0, 1.0 - (dist / 2.0)))
                retrieved.append({
                    "doc_id": meta["doc_id"],
                    "text": doc,
                    "score": score
                })
        return retrieved

    def index_dynamic_document(self, doc_id: str, content: str):
        """Indexes a single new compliance document dynamically (admin endpoint support)."""
        chunks = self._chunk_text(doc_id, content)
        ids = [c["id"] for c in chunks]
        docs = [c["text"] for c in chunks]
        metas = [c["metadata"] for c in chunks]
        self.collection.add(ids=ids, documents=docs, metadatas=metas)
        print(f"Dynamically indexed new document: {doc_id}")

if __name__ == "__main__":
    # Smoke test index building
    retriever = UnderwritingRetriever(db_path="test_chroma_db", chunk_strategy="rule_based")
    results = retriever.retrieve("What is the maximum debt to income ratio allowed?", top_k=3)
    print("Smoke Test Retrieval:")
    for r in results:
        print(f"[{r['doc_id']}] (Score: {r['score']:.4f}): {r['text'][:100]}...")
