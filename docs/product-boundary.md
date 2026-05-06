# Product Boundary

Dispatch Layer is an instrumentation and visualization console for utility-grade
SCADA telemetry, forecast envelopes, residual fields, spectral transforms,
temporal playback, source integrity, and audit metadata.

## What Dispatch Layer renders

```
values              — numeric measurements with units
series              — time-ordered sequences
bands               — p10 / p50 / p90 forecast envelopes
deltas              — observed − expected
states              — NOMINAL / WATCH / HIGH / CRITICAL / STALE / MISSING / CONFLICT
timestamps          — source, server, ingest
threshold crossings — band violations, z-score thresholds
source status       — freshness, quality code, latency, integrity %
residuals           — signed error field
spectra             — harmonic amplitude by frequency
coherence           — frequency-domain agreement
coverage            — fraction of actuals inside forecast band
calibration         — bias, MAE, RMSE, MAPE
latency             — p50 / p95 / p99 ingest and API latency
integrity           — freshness, missingness, duplicate, conflict rates
audit hashes        — SHA-256 of data + config + model version
playback frames     — replayable historical state snapshots
```

## What Dispatch Layer does not produce

```
recommendations
findings
insights
summaries
reports
suggested actions
next steps
task cards
operator instructions
advice
generated explanations
narrative descriptions
"what this means" sections
risk-if-ignored prose
chatbot behavior
assistant behavior
natural-language generated reporting
```

## Language constraint

Every text string in the UI must behave like one of:

- instrument label
- table header
- field name
- unit
- route title
- status enum
- audit key
- timestamp
- axis label

No paragraph-style interpretation.  No helpful prose.  No generated English-language reporting.

## Read-only boundary

All industrial connectors are read-only.  Dispatch Layer implements:

- subscribe / read / query / replay

It does not implement:

- write
- command
- setpoint
- control action
- dispatch instruction
- breaker operation

This is a deliberate architectural constraint, not a gap.

## Correct data model

```ts
type TelemetrySample = {
  source_id:             string;
  channel_id:            string;
  asset_id?:             string;
  timestamp_utc:         string;
  value:                 number | string | boolean | null;
  unit?:                 string;
  quality:               "GOOD" | "UNCERTAIN" | "BAD" | "MISSING" | "STALE";
  source_timestamp_utc?: string;
  ingest_timestamp_utc:  string;
  tags?:                 Record<string, string>;
  audit_hash:            string;
};

type SignalEvent = {
  signal_id:      string;
  timestamp_utc:  string;
  source:         string;
  channel:        string;
  metric:         string;
  observed_value: number;
  expected_value: number | null;
  lower_band?:    number;
  upper_band?:    number;
  delta?:         number;
  unit:           string;
  state:          "NOMINAL" | "WATCH" | "HIGH" | "CRITICAL" | "STALE" | "MISSING" | "CONFLICT";
  audit_hash:     string;
};
```

No `message`.  No `summary`.  No `recommendation`.  No `why`.  No `action`.

## Threshold state enum

```python
class ThresholdState(str, Enum):
    NOMINAL  = "NOMINAL"
    WATCH    = "WATCH"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"
    MISSING  = "MISSING"
    STALE    = "STALE"
    CONFLICT = "CONFLICT"
```

That is not advice.  It is instrumentation state.

## Product sentence

> Dispatch Layer is a utility-grade instrumentation console for SCADA telemetry,
> forecast envelopes, residual fields, spectral transforms, temporal playback,
> source integrity, and audit metadata.
