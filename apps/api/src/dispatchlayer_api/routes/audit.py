from fastapi import APIRouter

router = APIRouter(tags=["audit"])


@router.get("/audit/trace/{trace_id}")
async def get_trace(trace_id: str) -> dict:
    """Retrieve an audit trace by ID. Traces are embedded inline with each API response.
    This endpoint is a placeholder for future persistent trace storage."""
    return {
        "trace_id": trace_id,
        "status": "not_persisted",
        "note": "Traces are embedded in each API response. Persistent trace storage requires a database backend.",
    }
