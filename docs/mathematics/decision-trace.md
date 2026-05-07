# Decision Trace

Decision trace captures how a forecast or recommendation was produced.

## Trace Elements

- trace_id
- created_utc
- ordered steps
- model versions and hashes
- key intermediate outputs

## Required Characteristics

- deterministic ordering
- machine-readable fields
- stable identifiers for audit and replay

## Forecast Workflow Example

1. ingest latest site row
2. normalize signals
3. compute baseline and residual profile
4. generate p10/p50/p90 projection
5. compute confidence and recommendations
6. return artifacts and trace

