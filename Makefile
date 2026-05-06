.PHONY: install test frontend api docker verify

install:
	pip install \
		-e packages/domain \
		-e packages/predictive \
		-e packages/forecasting \
		-e packages/anomaly \
		-e packages/dispatch \
		-e packages/recommendations \
		-e packages/simulation \
		-e packages/adapters/open_meteo \
		-e packages/adapters/noaa_nws \
		-e packages/adapters/nasa_power \
		-e packages/adapters/nrel \
		-e packages/adapters/eia \
		-e packages/adapters/entsoe \
		-e apps/api
	cd apps/dashboard && npm install

test:
	pytest --import-mode=importlib -q

frontend:
	cd apps/dashboard && npm run build

api:
	uvicorn dispatchlayer_api.main:app --reload --port 8000

dashboard:
	cd apps/dashboard && npm run dev

docker:
	docker compose up --build

verify: test frontend
	@echo ""
	@echo "verify: all checks passed"
