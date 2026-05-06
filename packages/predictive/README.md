# dispatchlayer-predictive

Predictive Operations Core for DispatchLayer: deterministic evidence-weighted reasoning for renewable operations intelligence.

## Four-layer architecture

```
L — LocalSignalScorer         typed temporal scoring (per-interaction-type decay)
G — PortfolioStateBuilder     structural summarization → site and portfolio state
P — PredictiveEvolutionEngine forward prediction + three-term error decomposition
D — DecisionRanker            threshold crossing evaluator with evidence and audit trace
```

## Core responsibilities

- Typed temporal signal scoring (interaction-type-specific decay rates)
- Portfolio structural state compression
- p10/p50/p90 generation forecasts
- Three-term error decomposition: ε_G (structural) + ε_P (predictive) + ε_obs (observational)
- Forecast trust score with operator-readable explanation
- Causal root-cause ranking for underperformance events
- Structural drift detection against trailing baseline
- Auditable decision traces for every threshold state output

## Design principles

1. Deterministic: same inputs produce same outputs
2. Evidence-backed: every signal event cites named inputs
3. Explicit uncertainty: three-term decomposition, not a single opaque number
4. Auditable: full decision trace for every output

## Usage

```python
from datetime import datetime, timezone
from dispatchlayer_predictive import (
    LocalSignalScorer, PortfolioStateBuilder,
    PredictiveEvolutionEngine, DecisionRanker,
    compute_trust_score, detect_residual_drift,
)

now = datetime.now(timezone.utc)
scorer = LocalSignalScorer(now=now)
scores = scorer.score_site_context(
    "my_site",
    wind_speed_mps=9.5, wind_observed_at=now,
    ghi_wm2=650.0, solar_observed_at=now,
)

builder = PortfolioStateBuilder()
site_state = builder.build_site_state(scores, asset_type="solar", capacity_mw=50.0)

engine = PredictiveEvolutionEngine()
prediction = engine.predict_site(site_state, window_hours=24)

ranker = DecisionRanker(price_per_mwh=45.0)
decisions = ranker.rank_site(prediction)

trust = compute_trust_score(
    prediction.structural_error,
    prediction.predictive_error,
    prediction.observational_noise,
)
print(f"trust={trust.trust_score:.2f}, grade={trust.grade}, dominant={trust.dominant_term}")
```
