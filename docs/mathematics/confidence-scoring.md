# Confidence Scoring

Confidence scoring summarizes uncertainty and calibration quality.

## Components

Total uncertainty score can be composed from:

- structural error
- predictive error
- observational noise
- calibration error

A simple additive form is:

U = ws*Es + wp*Ep + wn*En + wc*Ec

where ws + wp + wn + wc = 1.

## Coverage Calibration

Given forecast interval [P10, P90] and observed value y:

- P10 hit: y >= P10
- P90 hit: y <= P90

Empirical coverage targets:

- lower bound near 90% for P10 rule
- upper bound near 90% for P90 rule

## Dashboard Context

Coverage is displayed alongside holdout hits.

High holdout hit with weak coverage indicates calibration issues.

