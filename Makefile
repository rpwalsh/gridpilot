# Proprietary (c) Ryan Walsh / Walsh Tech Group
# All rights reserved. Professional preview only.

.PHONY: install install-connectors test lint-language frontend api docker verify snapshots-recommended

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
	python3 -m pytest --import-mode=importlib -q

# â”€â”€ Forbidden-term check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Dispatch Layer is instrumentation-only.  These terms indicate language
# generation / recommendation / narrative behaviour and must not appear in
# production code or UI copy.
lint-language:
	@echo "lint-language: scanning for forbidden instrumentation boundary violations..."
	@if grep -RniE \
		"recommendation|recommended|finding|insight|suggest|advice|next step|what this means|generated report|chatbot|assistant|task card|action item|risk if ignored|operator note|narrative" \
		docs apps packages \
		--include="*.md" --include="*.ts" --include="*.tsx" \
		--include="*.py" --include="*.json" \
		--exclude-dir=node_modules \
		--exclude-dir=.venv \
		--exclude-dir=__pycache__ \
		--exclude-dir=.git \
		--exclude-dir=mathematics \
		--exclude-dir=recommendations \
		--exclude="product-boundary.md" \
		--exclude="connector-strategy.md" \
		--exclude="decision_ranker.py" \
		--exclude="proofs-method.md" \
		--exclude="test_evaluator.py" \
		2>/dev/null; then \
		echo ""; \
		echo "lint-language: FAIL â€” forbidden terms found (see above)"; \
		exit 1; \
	else \
		echo "lint-language: OK â€” no forbidden terms found"; \
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
	@echo "verify: all checks passed âœ“"

snapshots-recommended:
	python scripts/capture_all_recommended_sources.py --years 5
