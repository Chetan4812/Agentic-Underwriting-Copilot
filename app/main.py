from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, Any, Union

from app.models import ApplicationInput, DecisionRecord, ReferralPackage
from app.pipeline import UnderwritingPipeline

app = FastAPI(
    title="Agentic Underwriting Copilot API",
    description="FastAPI service for the Halcyon Credit underwriting orchestrator pipeline.",
    version="1.0"
)

# Instantiate the orchestration pipeline
pipeline = UnderwritingPipeline(db_path="app_chroma_db", chunk_strategy="rule_based")

class IndexDocumentPayload(BaseModel):
    doc_id: str
    content: str

@app.get("/health")
def health_check():
    """Simple API status checks."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "project": "Agentic Underwriting Copilot for Halcyon Credit"
    }

@app.post("/assess", response_model=Union[DecisionRecord, ReferralPackage])
def assess_application(payload: ApplicationInput):
    """
    Executes the 9-agent LangGraph underwriting pipeline.
    Ingests applicant details, scores default risk, parses credit history, check compliance rules,
    audits fairness metrics, reviews decision via the critic, and drafts a structured card.
    """
    try:
        result = pipeline.run(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Underwriting pipeline execution failure: {str(e)}")

@app.post("/admin/index-document")
def index_policy_document(payload: IndexDocumentPayload):
    """
    Index a new compliance or policy document into the vector database dynamically.
    Enables hot-indexing and runs automated regression tests.
    """
    try:
        pipeline.retriever.index_dynamic_document(payload.doc_id, payload.content)
        return {
            "status": "success",
            "message": f"Successfully indexed policy document: {payload.doc_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index compliance clause: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
