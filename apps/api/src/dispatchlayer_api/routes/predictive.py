from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, Any
import logging

from dispatchlayer_predictive.signal_state import Signal, SignalState
from dispatchlayer_predictive.evidence_graph import EvidenceGraph
from dispatchlayer_predictive.confidence import compute_confidence
from dispatchlayer_predictive.residuals import compute_residual
from dispatchlayer_predictive.reconciliation import reconcile_forecast
from dispatchlayer_predictive.causal_attribution import attribute_wind_turbine_underproduction, attribute_solar_underproduction
from dispatchlayer_predictive.forecast_bounds import compute_forecast_bounds
from dispatchlayer_predictive.decision_trace import AuditTrace

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predictive", tags=["predictive"])


class SignalInput(BaseModel):
    name: str
    value: Optional[Any] = None
    unit: Optional[str] = None
    source: str = "api"
    confidence: float = 1.0


class SignalStateRequest(BaseModel):
    signals: list[SignalInput]


@router.post("/signal-state")
async def normalize_signal_state(req: SignalStateRequest) -> dict:
    trace = AuditTrace(model_versions={"predictive_core": "0.1.0"})
    now = datetime.now(timezone.utc)
    raw_signals = {
        s.name: Signal(
            name=s.name,
            value=s.value,
            unit=s.unit,
            source=s.source,
            timestamp_utc=now,
            confidence=s.confidence,
        )
        for s in req.signals
    }
    state = SignalState(signals=raw_signals)
    normalized = state.normalize()

    trace.add_step(
        "normalize_signals",
        inputs={"signal_count": len(raw_signals)},
        output={"normalized_count": len(normalized.signals)},
        method="signal_range_validation",
    )

    return {
        "signals": {
            name: {
                "value": sig.value,
                "confidence": sig.confidence,
                "is_missing": sig.is_missing,
                "is_anomalous": sig.is_anomalous,
            }
            for name, sig in normalized.signals.items()
        },
        "audit_trace": trace.to_dict(),
    }


class ResidualRequest(BaseModel):
    expected: float
    actual: float
    capacity: float
    threshold_pct: float = 10.0


@router.post("/residual")
async def residual(req: ResidualRequest) -> dict:
    trace = AuditTrace(model_versions={"predictive_core": "0.1.0"})
    result = compute_residual(req.expected, req.actual, req.capacity, req.threshold_pct)
    trace.add_step(
        "compute_residual",
        inputs={"expected": req.expected, "actual": req.actual},
        output={"percent_delta": result.percent_delta, "direction": result.direction},
        method=f"residual_{result.percent_delta:.1f}pct",
    )
    return {
        "absolute_delta": result.absolute_delta,
        "percent_delta": result.percent_delta,
        "direction": result.direction,
        "is_significant": result.is_significant,
        "audit_trace": trace.to_dict(),
    }


class ForecastBoundsRequest(BaseModel):
    point_forecast: float
    historical_errors: Optional[list[float]] = None
    uncertainty_factors: Optional[dict[str, float]] = None


@router.post("/forecast-bounds")
async def forecast_bounds(req: ForecastBoundsRequest) -> dict:
    trace = AuditTrace(model_versions={"predictive_core": "0.1.0"})
    bounds = compute_forecast_bounds(req.point_forecast, req.historical_errors, req.uncertainty_factors)
    trace.add_step(
        "compute_bounds",
        inputs={"point_forecast": req.point_forecast, "has_historical": bool(req.historical_errors)},
        output={"p10": bounds.p10, "p50": bounds.p50, "p90": bounds.p90},
        method=f"uncertainty_{bounds.uncertainty_score:.2f}",
    )
    return {
        "p10": bounds.p10,
        "p50": bounds.p50,
        "p90": bounds.p90,
        "uncertainty_score": bounds.uncertainty_score,
        "audit_trace": trace.to_dict(),
    }


class ReconcileRequest(BaseModel):
    raw_forecast_mwh: float
    historical_errors: Optional[list[float]] = None
    telemetry_deviation_pct: Optional[float] = None


@router.post("/reconcile")
async def reconcile(req: ReconcileRequest) -> dict:
    trace = AuditTrace(model_versions={"predictive_core": "0.1.0"})
    result = reconcile_forecast(req.raw_forecast_mwh, req.historical_errors, telemetry_deviation_pct=req.telemetry_deviation_pct)
    trace.add_step(
        "reconcile",
        inputs={"raw_forecast_mwh": req.raw_forecast_mwh},
        output={"adjusted_forecast_mwh": result.adjusted_forecast_mwh, "confidence": result.confidence},
        method=f"bias_correction_{result.basis}",
    )
    return {
        "raw_forecast_mwh": result.raw_forecast_mwh,
        "adjusted_forecast_mwh": result.adjusted_forecast_mwh,
        "bias_correction": result.bias_correction,
        "confidence": result.confidence,
        "basis": result.basis,
        "audit_trace": trace.to_dict(),
    }


class CausalAttributionRequest(BaseModel):
    asset_type: str
    residual_pct: float
    signals: list[SignalInput]


@router.post("/causal-attribution")
async def causal_attribution(req: CausalAttributionRequest) -> dict:
    trace = AuditTrace(model_versions={"predictive_core": "0.1.0"})
    now = datetime.now(timezone.utc)

    raw_signals = {
        s.name: Signal(
            name=s.name,
            value=s.value,
            unit=s.unit,
            source=s.source,
            timestamp_utc=now,
            confidence=s.confidence,
        )
        for s in req.signals
    }
    state = SignalState(signals=raw_signals).normalize()

    if req.asset_type == "wind_turbine":
        hypotheses = attribute_wind_turbine_underproduction(state, req.residual_pct)
    elif req.asset_type == "solar_inverter":
        hypotheses = attribute_solar_underproduction(state, req.residual_pct)
    else:
        return {"error": f"Unknown asset_type: {req.asset_type}"}

    trace.add_step(
        "causal_attribution",
        inputs={"asset_type": req.asset_type, "residual_pct": req.residual_pct},
        output=[h.cause for h in hypotheses],
        method="evidence_confidence_ranking",
    )

    return {
        "hypotheses": [
            {"cause": h.cause, "confidence": h.confidence, "evidence": h.evidence}
            for h in hypotheses
        ],
        "audit_trace": trace.to_dict(),
    }


class ConfidenceRequest(BaseModel):
    hypothesis: str
    evidence_nodes: list[dict]


@router.post("/confidence")
async def confidence_score(req: ConfidenceRequest) -> dict:
    trace = AuditTrace(model_versions={"predictive_core": "0.1.0"})
    graph = EvidenceGraph(hypothesis=req.hypothesis)
    for node in req.evidence_nodes:
        graph.add_evidence(
            signal_name=node.get("signal_name", "unknown"),
            weight=float(node.get("weight", 0.5)),
            description=node.get("description", ""),
        )
    score = graph.aggregate_confidence()
    trace.add_step(
        "compute_confidence",
        inputs={"hypothesis": req.hypothesis, "evidence_count": len(graph.nodes)},
        output=score,
        method=f"evidence_graph_{len(graph.nodes)}_nodes",
    )
    return {
        "hypothesis": req.hypothesis,
        "confidence": score,
        "evidence_count": len(graph.nodes),
        "audit_trace": trace.to_dict(),
    }
