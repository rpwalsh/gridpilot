<!-- Proprietary (c) Ryan Walsh / Walsh Tech Group -->
<!-- All rights reserved. Professional preview only. -->

# Predictive Core (Manager-Facing)

This document explains the predictive core in practical operational terms.

## Purpose

The predictive core helps teams estimate near-term context and confidence so planning can be adjusted when conditions change.

## Inputs Used

- weather conditions (for example wind, irradiance, temperature)
- optional grid/market context
- recent residual behavior
- site/asset metadata

## Processing Stages

1. Signal scoring
- evaluate timeliness, quality, and relevance of available inputs

2. Structural summarization
- compress current conditions into a compact site-state representation

3. Forecast context generation
- produce planning-oriented expected context across requested window

4. Confidence and drift evaluation
- compute trust/confidence signals and identify instability patterns

5. Trace capture
- record key inputs/outputs/reasoning for audit and debugging

## Outputs for Operations

- expected context values
- confidence/trust score and label
- warnings for unstable or low-quality conditions
- decision-trace metadata

## Interpretation Guidance

- Confidence supports decisions; it does not guarantee outcomes.
- Low confidence means increase operational margin and investigate source quality.
- Drift warnings indicate behavior change, not automatic fault attribution.

## Practical Limits

- output quality depends on input quality and freshness
- missing or degraded sources reduce reliability
- model output should always be read with warning/source context
