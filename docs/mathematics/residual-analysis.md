# Residual Analysis

Residual analysis evaluates model error behavior over time.

## Definitions

For timestamp t:

- observed value: y_t
- expected value: yhat_t
- residual: r_t = y_t - yhat_t

## Summary Metrics

- mean error (bias)
- MAE
- RMSE
- residual standard deviation

## Operational Interpretation

- persistent positive bias: under-forecast tendency
- persistent negative bias: over-forecast tendency
- rising variance: regime shift or signal degradation

## Link to Confidence

Residual spread informs interval width and confidence scoring.
Poor residual behavior should widen forecast bands and reduce trust score.

