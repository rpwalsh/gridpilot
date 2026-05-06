FROM python:3.11-slim

WORKDIR /app

# Install packages in dependency order (domain first, then consumers)
COPY packages/domain /app/packages/domain
COPY packages/predictive /app/packages/predictive
COPY packages/forecasting /app/packages/forecasting
COPY packages/anomaly /app/packages/anomaly
COPY packages/dispatch /app/packages/dispatch
COPY packages/adapters /app/packages/adapters
COPY apps/api /app/apps/api

RUN pip install --no-cache-dir \
    packages/domain \
    packages/predictive \
    packages/forecasting \
    packages/anomaly \
    packages/dispatch \
    packages/adapters/open_meteo \
    packages/adapters/noaa_nws \
    packages/adapters/nasa_power \
    packages/adapters/nrel \
    packages/adapters/eia \
    packages/adapters/entsoe \
    apps/api

EXPOSE 8000

CMD ["uvicorn", "dispatchlayer_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
