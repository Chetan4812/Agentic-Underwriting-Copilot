import os
import pandas as pd
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer

# 1. Define Synthetic Policy Corpus (15 Documents)
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

# 2. Evaluation Queries & Expected Documents
EVAL_QUERIES = [
    {
        "query": "What is the maximum debt to income ratio allowed?",
        "expected": "POL-DTI-001"
    },
    {
        "query": "Are thin file applicants with no credit history automatically declined?",
        "expected": "POL-THN-004"
    },
    {
        "query": "How do we handle DAYS_EMPLOYED anomaly or pensioner employment status?",
        "expected": "POL-EMP-002"
    },
    {
        "query": "What are the rules for applicants with a recent bankruptcy?",
        "expected": "POL-CRD-003"
    },
    {
        "query": "Can we approve a loan if the applicant is on active duty in the military?",
        "expected": "POL-MIL-012"
    },
    {
        "query": "How many paystubs are required to verify income?",
        "expected": "POL-INC-006"
    },
    {
        "query": "What should we do if the applicant's name on the application does not match their bureau record?",
        "expected": "POL-FRA-009"
    },
    {
        "query": "What are the adverse action reason codes for denial due to high credit card utilization?",
        "expected": "POL-ADV-008"
    },
    {
        "query": "Can we approve an application if there is an active collection account?",
        "expected": "POL-COL-011"
    },
    {
        "query": "Is age or gender allowed to be used when assessing credit risk?",
        "expected": "POL-FAR-007"
    }
]

def write_policy_files():
    """Writes the synthetic policies to separate text files to simulate a real corpus."""
    policy_dir = "policies"
    os.makedirs(policy_dir, exist_ok=True)
    for code, text in POLICIES.items():
        with open(os.path.join(policy_dir, f"{code}.txt"), "w", encoding="utf-8") as f:
            f.write(text.strip())
    print(f"Wrote {len(POLICIES)} policy files to '{policy_dir}/' directory.")

def fixed_size_chunking(text, max_words=80, overlap=20):
    """Splits a document text into fixed-size chunks of words with overlap."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + max_words]
        chunks.append(" ".join(chunk_words))
        i += max_words - overlap
        if i >= len(words) - overlap:
            break
    return chunks

def build_vector_store():
    """Initializes ChromaDB, loads chunks, and embeds them."""
    print("Initializing ChromaDB client and all-MiniLM-L6-v2 embedding function...")
    # Setup directories
    chroma_path = "chroma_db"
    
    # Initialize Client and Embedding Function
    # We use all-MiniLM-L6-v2 explicitly
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    client = chromadb.PersistentClient(path=chroma_path)
    
    # Create or replace collection
    collection_name = "policy_corpus"
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
    collection = client.create_collection(name=collection_name, embedding_function=emb_fn)
    
    # Process and load documents
    ids = []
    documents = []
    metadatas = []
    
    chunk_counter = 0
    policy_dir = "policies"
    for filename in sorted(os.listdir(policy_dir)):
        if filename.endswith(".txt"):
            doc_id = filename.replace(".txt", "")
            with open(os.path.join(policy_dir, filename), "r", encoding="utf-8") as f:
                text = f.read()
            
            # Simple fixed chunking (e.g. baseline fixed window size)
            chunks = fixed_size_chunking(text)
            for j, chunk in enumerate(chunks):
                ids.append(f"{doc_id}_chunk_{j}")
                documents.append(chunk)
                metadatas.append({"doc_id": doc_id, "chunk_index": j})
                chunk_counter += 1
                
    collection.add(ids=ids, documents=documents, metadatas=metadatas)
    print(f"Successfully indexed {chunk_counter} chunks across {len(POLICIES)} policy files.")
    return collection

def run_retrieval_tests(collection, top_k=3):
    """Executes the test queries and compiles hits and stats."""
    results = []
    hit_count = 0
    
    print("\nRunning Retrieval De-risk Spike Queries...")
    for item in EVAL_QUERIES:
        query = item["query"]
        expected = item["expected"]
        
        # Query Chroma collection
        res = collection.query(query_texts=[query], n_results=top_k)
        
        # Inspect top-K results
        retrieved_docs = []
        hit = "N"
        
        if res and res["metadatas"] and len(res["metadatas"][0]) > 0:
            for metadata in res["metadatas"][0]:
                retrieved_docs.append(metadata["doc_id"])
            
            # Check if expected is in retrieved Top-K
            if expected in retrieved_docs:
                hit = "Y"
                hit_count += 1
        
        top_retrieved = retrieved_docs[0] if len(retrieved_docs) > 0 else "None"
        
        results.append({
            "Question": query,
            "Expected Doc": expected,
            "Retrieved Doc": top_retrieved,
            "Top-K Retrieved": ", ".join(retrieved_docs),
            "Hit (Y/N)": hit
        })
        
    overall_hit_rate = hit_count / len(EVAL_QUERIES)
    print(f"Spike execution finished. Overall Hit Rate (Top-{top_k}): {overall_hit_rate:.1%}\n")
    
    df_results = pd.DataFrame(results)
    return df_results, overall_hit_rate

def main():
    write_policy_files()
    collection = build_vector_store()
    df_results, hit_rate = run_retrieval_tests(collection)
    
    # Print clean markdown-style table to stdout
    print("=== RETRIEVAL SPIKE SCORECARD ===")
    print(df_results.to_markdown(index=False))
    print(f"\nOverall Top-3 Hit Rate: {hit_rate:.1%}")
    print("================================")
    
    # Save results to CSV for record keeping
    df_results.to_csv("spike_results.csv", index=False)
    print("Saved spike results to 'spike_results.csv'")

if __name__ == "__main__":
    main()
