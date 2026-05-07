# Domain Model

This model describes the core concepts used by API and dashboard.

---

## Core Value Types (`packages/domain/models.py`)

### GeoPoint

- latitude: float
- longitude: float

### ForecastWindow

- start_utc: datetime (UTC)
- end_utc: datetime (UTC)
- resolution_minutes: int

---

## Asset Types

### AssetType (enum)

Values: `wind_turbine`, `solar_inverter`, `battery`, `meter`

---

## Weather and Resource Samples

### WeatherSample

- timestamp_utc: datetime (UTC)
- temperature_c: Optional[float]
- wind_speed_mps: Optional[float]
- wind_direction_deg: Optional[float]
- cloud_cover_pct: Optional[float]
- shortwave_radiation_wm2: Optional[float]
- direct_radiation_wm2: Optional[float]
- diffuse_radiation_wm2: Optional[float]
- source: str

### SolarResourceSample

- timestamp_utc: datetime
- ghi_wm2: Optional[float]
- dni_wm2: Optional[float]
- dhi_wm2: Optional[float]
- temperature_c: Optional[float]
- source: str

### GridDemandSample

- timestamp_utc: datetime
- balancing_authority: str
- demand_mw: Optional[float]
- demand_forecast_mw: Optional[float]
- net_generation_mw: Optional[float]
- source: str

### MarketSignal

- timestamp_utc: datetime
- region: str
- price_per_mwh: Optional[float]
- source: str

---

## Asset Telemetry

### AssetTelemetry

- timestamp_utc: datetime
- asset_id: str
- site_id: str
- asset_type: AssetType
- output_kw: Optional[float]
- capacity_kw: float
- curtailment_flag: bool
- auxiliary_data: dict

---

## Aggregate / Forecast Types

### WeatherForecast

- location: GeoPoint
- window: ForecastWindow
- samples: tuple[WeatherSample, ...]
- source: str

### SolarResource

- location: GeoPoint
- window: ForecastWindow
- samples: tuple[SolarResourceSample, ...]
- source: str

### GridDemand

- balancing_authority: str
- window: ForecastWindow
- samples: tuple[GridDemandSample, ...]
- source: str

### GenerationMix

- timestamp_utc: datetime
- balancing_authority: str
- wind_mw, solar_mw, natural_gas_mw, coal_mw, nuclear_mw, hydro_mw, other_mw: Optional[float]
- source: str

### PortfolioSummary

- portfolio_id: str
- window: ForecastWindow
- expected_generation_mwh: float
- p10_generation_mwh, p50_generation_mwh, p90_generation_mwh: float
- primary_constraints: tuple[str, ...]
- forecast_basis: tuple[str, ...]

---

## Dashboard-Facing Forecast Entities

### Site (catalog record)

- site_id
- name
- asset_type (solar or wind)
- region, latitude, longitude
- capacity_mw

### TimeseriesSample

- ts (UTC)
- weather/resource signals (temperature, wind, irradiance, cloud, humidity, precipitation, pressure)
- unit metadata via hourly_units

### ModeledOutput

- observed_mw (weather-to-power estimate for dashboard analysis)
- expected baseline per hour
- residual = observed - expected

### ProjectionPoint

- ts
- p10
- p50
- p90

### HoldoutEvaluation

- holdout_year (forced to 2025 when available)
- training_months and holdout_months
- monthly projected vs actual
- error_pct
- hit flag (true when error <= 6%)

### SpectralSignal

- label
- period_h
- amplitude
- variance_share_pct
- interpretation

### PipelineArtifact

- current_signals
- normalized_signals
- residuals
- structural_drift
- recommendations
- audit_trace

---

## Telemetry Models (`packages/domain/telemetry.py`)

### Quality (enum)

Values: `GOOD`, `UNCERTAIN`, `BAD`, `MISSING`, `STALE`

Maps OPC UA / IEC quality codes to a canonical five-state enum.

### TelemetrySample

Unified connector output (timestamp-quality-value). All connector adapters
produce this type.

- source_id: str
- channel_id: str
- asset_id: Optional[str]
- timestamp_utc: datetime
- value: float | str | bool | None
- unit: Optional[str]
- quality: Quality
- source_timestamp_utc: Optional[datetime]
- ingest_timestamp_utc: datetime
- tags: dict[str, str]
- audit_hash: str (auto-computed SHA-256 truncated to 16 hex chars)

### TelemetryPoint

Single timestamped, typed signal value as received from an asset.

- timestamp_utc: datetime
- site_id, asset_id: str
- asset_type: `solar_inverter` | `wind_turbine` | `bess` | `meter` | `weather_station`
- signal: str (field name)
- value: float | str | bool | None
- unit: Optional[str]
- quality: `good` | `suspect` | `bad` | `missing`
- source: str

### AssetTelemetrySnapshot

Normalised per-asset operational snapshot. Combines generation, health, and
asset-type-specific signals. All signal fields are Optional so a snapshot can
be partially populated.

- timestamp_utc, site_id, asset_id, asset_type: str
- capacity_kw: float
- power_kw, expected_power_kw, availability_pct: Optional[float]
- Solar inverter: dc_voltage_v, dc_current_a, ac_power_kw, inverter_efficiency_pct, frequency_hz, string_current_a
- Wind turbine: rotor_rpm, wind_speed_mps, wind_direction_deg, nacelle_direction_deg, yaw_error_deg, blade_pitch_deg, gearbox_temperature_c, generator_temperature_c, vibration_mm_s
- BESS: state_of_charge_pct, state_of_health_pct, charge_power_kw, discharge_power_kw, cell_temperature_c, pack_voltage_v, pack_current_a, cycle_count, thermal_derate_flag, inverter_status
- Meter/grid: reactive_power_kvar, voltage_v, power_factor, export_limit_kw, curtailment_signal
- Common: temperature_c, fault_code, curtailment_flag, quality_score, data_source

---

## Relationships

- Site has many TimeseriesSample
- Site has many ProjectionPoint
- HoldoutEvaluation is derived from Site monthly aggregates
- SpectralSignal is derived from modeled output history
- PipelineArtifact links projection and explainability outputs
- AssetTelemetrySnapshot is the normalised form of multiple TelemetryPoint records
- TelemetrySample is the universal connector output used by all industrial-protocol connectors

