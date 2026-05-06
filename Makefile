.PHONY: install install-connectors test lint-language frontend api docker verify

PYTHONPATH := packages/domain/src:packages/predictive/src:packages/forecasting/src:packages/anomaly/src:packages/dispatch/src:packages/signals/src:packages/simulation/src:packages/adapters/open_meteo/src:packages/adapters/noaa_nws/src:packages/adapters/nasa_power/src:packages/adapters/nrel/src:packages/adapters/eia/src:packages/adapters/entsoe/src:packages/connectors/opentelemetry/src:packages/connectors/opcua/src:packages/connectors/mqtt/src:packages/connectors/sitewise/src:packages/connectors/parquet/src:apps/api/src

install:
	pip install \
		-e packages/domain \
		-e packages/predictive \
		-e packages/forecasting \
		-e packages/anomaly \
		-e packages/dispatch \
		-e packages/signals \
		-e packages/simulation \
		-e packages/adapters/open_meteo \
		-e packages/adapters/noaa_nws \
		-e packages/adapters/nasa_power \
		-e packages/adapters/nrel \
		-e packages/adapters/eia \
		-e packages/adapters/entsoe \
		-e packages/connectors/opentelemetry \
		-e packages/connectors/opcua \
		-e packages/connectors/mqtt \
		-e packages/connectors/sitewise \
		-e packages/connectors/parquet \
		-e apps/api
	cd apps/dashboard && npm install

install-connectors:
	pip install \
		-e packages/connectors/opentelemetry \
		-e packages/connectors/opcua \
		-e packages/connectors/mqtt \
		-e packages/connectors/sitewise \
		-e packages/connectors/parquet

test:
	PYTHONPATH=$(PYTHONPATH) python3 -m pytest --import-mode=importlib -q

# ── Forbidden-term check ────────────────────────────────────────────────────
# Dispatch Layer is instrumentation-only.  These terms indicate language
# generation / recommendation / narrative behaviour and must not appear in
# production code or UI copy.
lint-language:
	@echo "lint-language: scanning for forbidden instrumentation boundary violations..."
	@if grep -RniE \
		"recommendation|recommended|finding|insight|suggest|advice|next step|what this means|generated report|chatbot|assistant|task card|action item|risk if ignored|operator note|narrative|why_now" \
		README.md API.md ARCHITECTURE.md DOMAIN_MODEL.md QUICKSTART.md docs apps packages \
		--include="*.md" --include="*.ts" --include="*.tsx" \
		--include="*.py" --include="*.json" \
		--exclude-dir=node_modules \
		--exclude-dir=dist \
		--exclude-dir=.venv \
		--exclude-dir=__pycache__ \
		--exclude-dir=.git \
		--exclude="product-boundary.md" \
		--exclude="connector-strategy.md" \
		--exclude="proofs-method.md" \
		--exclude="test_evaluator.py" \
		2>/dev/null; then \
		echo ""; \
		echo "lint-language: FAIL — forbidden terms found (see above)"; \
		exit 1; \
	else \
		echo "lint-language: OK — no forbidden terms found"; \
	fi

frontend:
	cd apps/dashboard && npm run build

api:
	uvicorn dispatchlayer_api.main:app --reload --port 8000

dashboard:
	cd apps/dashboard && npm run dev

docker:
	docker compose up --build

verify: test lint-language frontend
	@echo ""
	@echo "verify: all checks passed"
