# GridForge Domain Model

## Core Entities

### GeoPoint
Immutable geographic coordinate (latitude, longitude).

### ForecastWindow
Time window with start/end UTC timestamps and resolution in minutes.

### WeatherSample
Single-interval weather observation with temperature, wind speed/direction, cloud cover, and radiation components.

### AssetTelemetry
Real-time asset output reading with asset/site ID, type, output_kw, capacity_kw, and curtailment flag.

### AssetType
Enum: `wind_turbine`, `solar_inverter`, `battery`, `meter`

### PortfolioSummary
Aggregated portfolio generation forecast with p10/p50/p90 bounds.

## Provider Protocols

All weather/grid data access is through typed Protocol interfaces:
- `WeatherForecastProvider` → `get_forecast(location, window)`
- `SolarResourceProvider` → `get_solar_resource(location, window)`
- `GridDemandProvider` → `get_grid_demand(balancing_authority, window)`
- `MarketSignalProvider` → `get_market_signals(region, window)`

## Error Hierarchy

```
ProviderError
├── ProviderAuthError
├── ProviderRateLimitError
├── ProviderUnavailableError
├── ProviderSchemaError
└── ProviderDataGapError
```
