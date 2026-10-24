from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import pandas as pd
from datetime import datetime
import asyncio

app = FastAPI(title="Wind Generation Day-Ahead API")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to your Vercel URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BMRS_BASE_URL = "https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets"

async def fetch_actuals():
    """Fetch January 2026 actual wind generation."""
    url = f"{BMRS_BASE_URL}/FUELHH/stream"
    params = {
        "settlementDateFrom": "2026-01-01",
        "settlementDateTo": "2026-01-31",
        "fuelType": "WIND"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch actuals")
        return response.json()

async def fetch_forecasts():
    """Fetch forecasts from late Dec 2025 to end of Jan 2026 to ensure day-ahead availability."""
    url = f"{BMRS_BASE_URL}/WINDFOR/stream"
    params = {
        "publishDateTimeFrom": "2025-12-30T00:00:00Z",
        "publishDateTimeTo": "2026-01-31T23:59:59Z"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, params=params)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch forecasts")
        return response.json()

@app.get("/api/generation-data")
async def get_generation_data():
    try:
        # Fetch both datasets concurrently
        actuals_data, forecasts_data = await asyncio.gather(fetch_actuals(), fetch_forecasts())
        
        # 1. Process Actuals
        df_actual = pd.DataFrame(actuals_data)
        df_actual = df_actual[['startTime', 'generation']].rename(columns={'generation': 'actual_mw'})
        df_actual['startTime'] = pd.to_datetime(df_actual['startTime'])
        
        # 2. Process Forecasts & Enforce Day-Ahead Logic
        df_forecast = pd.DataFrame(forecasts_data)
        df_forecast = df_forecast[['publishTime', 'startTime', 'generation']].rename(columns={'generation': 'forecast_mw'})
        df_forecast['startTime'] = pd.to_datetime(df_forecast['startTime'])
        df_forecast['publishTime'] = pd.to_datetime(df_forecast['publishTime'])
        
        # Core Business Logic: Filter forecasts published strictly BEFORE the actual delivery date
        # This ensures the utility is looking at data they actually had when buying on the day-ahead market
        df_forecast['delivery_date'] = df_forecast['startTime'].dt.date
        df_forecast['publish_date'] = df_forecast['publishTime'].dt.date
        df_forecast = df_forecast[df_forecast['publish_date'] < df_forecast['delivery_date']]
        
        # Keep only the latest valid forecast for each startTime
        df_forecast = df_forecast.sort_values('publishTime').groupby('startTime').last().reset_index()
        
        # 3. Merge Datasets
        df_merged = pd.merge(df_actual, df_forecast[['startTime', 'forecast_mw']], on='startTime', how='inner')
        df_merged = df_merged.dropna()
        df_merged = df_merged.sort_values('startTime')
        
        # 4. Calculate Errors and Metrics
        df_merged['error_mw'] = df_merged['actual_mw'] - df_merged['forecast_mw']
        df_merged['abs_error'] = df_merged['error_mw'].abs()
        
        mae = df_merged['abs_error'].mean()
        
        # Prevent division by zero for MAPE
        mask = df_merged['actual_mw'] > 0
        mape = (df_merged.loc[mask, 'abs_error'] / df_merged.loc[mask, 'actual_mw']).mean() * 100
        
        # Format for frontend consumption
        df_merged['startTime'] = df_merged['startTime'].dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        timeseries = df_merged[['startTime', 'actual_mw', 'forecast_mw', 'error_mw']].to_dict(orient='records')
        
        return {
            "metrics": {
                "mae_mw": round(mae, 2),
                "mape_percentage": round(mape, 2)
            },
            "timeseries": timeseries
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))