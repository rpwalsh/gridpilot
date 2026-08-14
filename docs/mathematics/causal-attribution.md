# Causal Attribution

Causal attribution explains which signals most influenced a forecast decision.

## Inputs

- normalized signal values
- recent residual behavior
- asset type and capacity context
- model-specific feature contributions

## Output Shape

For each dominant factor:

- signal_name
- weight or contribution magnitude
- direction (upward or downward effect)
- short explanation

## Practical Use

- explain why P50 shifted between adjacent horizons
- explain widening or narrowing of P10-P90 bands
- separate weather-driven vs structural effects

## Guardrails

- Attribution is explanatory, not proof of true physical causality.
- Contributions should be reported with uncertainty context.

