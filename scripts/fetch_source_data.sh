#!/usr/bin/env bash
# =============================================================================
# fetch_source_data.sh
#
# Downloads real historical weather data for the DispatchLayer demo backtest.
#
# What this script does, step by step:
#   1. Calls the Open-Meteo Historical Weather API (https://open-meteo.com).
#      No API key is required. The API is free and open-source.
#      Data comes from ERA5 reanalysis produced by ECMWF.
#      License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
#
#   2. Downloads hourly data for Dallas, TX (latitude 32.7767, longitude -96.7970).
#      Dallas is in the ERCOT grid region — the context for this demo.
#      Variables downloaded:
#        - shortwave_radiation  : Global Horizontal Irradiance (GHI), W/m²
#        - direct_radiation     : Direct Normal Irradiance (DNI), W/m²
#        - temperature_2m       : Air temperature at 2m height, °C
#      Period: 2020-01-01 to 2024-12-31 (5 years, hourly resolution).
#      Total rows: ~43,800 hourly observations.
#
#   3. Saves the raw JSON response to:
#        data/open_meteo_archive_dallas.json
#      This file is ~8 MB. It is not committed to the repository.
#
# What this data is used for:
#   The DispatchLayer API endpoint GET /api/v1/forecasts/envelope reads this
#   file and applies a PVWatts-style solar model to compute p10/p50/p90 output
#   bounds for a hypothetical 100 MW solar array.
#
#   Training window: 2020-2022 (3 years of real hourly GHI + temperature).
#   The inter-year variance for each calendar hour drives the p10/p90 spread.
#
#   Holdout window: 2023-2024 (applies the same model to real 2023-2024 weather).
#   The holdout uses real weather inputs — it is NOT a forecast of unknown future
#   conditions. It demonstrates what the model would have computed given the
#   actual 2023-2024 weather that was recorded.
#
# What this is NOT:
#   - This does not download actual plant generation data. No SCADA or meter
#     data is present. The model output is compared only to itself (different
#     years of real weather), not to real plant output.
#   - No invented numbers are added. If a data point is missing (null in the
#     API response), it is treated as zero irradiance.
#
# Requirements: curl, jq (optional, for pretty-printing check only)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_DIR="${REPO_ROOT}/data"
OUT_FILE="${OUT_DIR}/open_meteo_archive_dallas.json"

LAT="32.7767"
LON="-96.7970"
START="2020-01-01"
END="2024-12-31"
VARS="shortwave_radiation,direct_radiation,temperature_2m"
TIMEZONE="UTC"

URL="https://archive-api.open-meteo.com/v1/archive"

echo ""
echo "DispatchLayer — fetch_source_data.sh"
echo "====================================="
echo ""
echo "Source  : Open-Meteo Historical Weather API (https://open-meteo.com)"
echo "Dataset : ERA5 reanalysis (ECMWF). License: CC BY 4.0."
echo "Location: Dallas, TX  lat=${LAT}  lon=${LON}"
echo "Period  : ${START} to ${END} (hourly)"
echo "Variables: ${VARS}"
echo "Output  : ${OUT_FILE}"
echo ""
echo "This download is approximately 8 MB and may take 30–60 seconds."
echo "No API key is required."
echo ""

mkdir -p "${OUT_DIR}"

echo "Downloading..."
curl \
  --fail \
  --silent \
  --show-error \
  --max-time 120 \
  --output "${OUT_FILE}" \
  "${URL}?latitude=${LAT}&longitude=${LON}&start_date=${START}&end_date=${END}&hourly=${VARS}&timezone=${TIMEZONE}"

# Verify the file looks like a valid Open-Meteo response.
if ! grep -q '"hourly"' "${OUT_FILE}"; then
  echo ""
  echo "ERROR: Downloaded file does not appear to be a valid Open-Meteo response."
  echo "Check ${OUT_FILE} for error details."
  exit 1
fi

HOUR_COUNT=$(python3 -c "
import json, sys
with open('${OUT_FILE}') as f:
    d = json.load(f)
print(len(d['hourly']['time']))
" 2>/dev/null || echo "unknown")

echo ""
echo "Download complete."
echo "  File   : ${OUT_FILE}"
echo "  Hourly rows: ${HOUR_COUNT}"
echo ""
echo "Next step: start the API server and the envelope endpoint will load this data."
echo "  make api           # starts uvicorn on :8000"
echo "  curl http://localhost:8000/api/v1/forecasts/envelope | python3 -m json.tool"
echo ""
