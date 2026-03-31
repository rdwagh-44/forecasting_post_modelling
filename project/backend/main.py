from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
import numpy as np
import os

from api.services.data_service import (
    load_dataset, load_dataframe, load_default_dataset,
    build_presence_table, prepare_growth_df,
    compute_beta_df, prepare_dataset_filter, compute_historical_growth
)
from api.services.forecast_service import (
    run_forecast, run_forecast_with_contributions, compute_cagr_table, BASE_FY, TARGET_YEARS
)
from api.services.waterfall_service import compute_waterfall

app = FastAPI(title="Post-Modeling Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_DATASET = "dataset_df.xlsx"
DEFAULT_ELASTICITY = "elasticity_df.xlsx"
DEFAULT_GROWTH = "growth_df.xlsx"

# In-memory store (per-session state is managed on frontend; server holds last loaded data)
_store = {}


def _load_defaults():
    """Load default files if they exist."""
    if os.path.exists(DEFAULT_DATASET):
        _store["dataset_df"] = load_default_dataset(DEFAULT_DATASET)
    if os.path.exists(DEFAULT_ELASTICITY):
        _store["elasticity_df"] = pd.read_excel(DEFAULT_ELASTICITY)
    if os.path.exists(DEFAULT_GROWTH):
        _store["growth_df"] = pd.read_excel(DEFAULT_GROWTH)


_load_defaults()


# ─────────────────────────────────────────────
# Upload endpoints
# ─────────────────────────────────────────────

@app.post("/upload/dataset")
async def upload_dataset(file: UploadFile = File(...)):
    content = await file.read()
    _store["dataset_df"] = load_dataset(content, file.filename)
    return {"message": "Dataset uploaded", "rows": len(_store["dataset_df"])}


@app.post("/upload/elasticity")
async def upload_elasticity(file: UploadFile = File(...)):
    content = await file.read()
    _store["elasticity_df"] = load_dataframe(content, file.filename)
    return {"message": "Elasticity uploaded", "rows": len(_store["elasticity_df"])}


@app.post("/upload/growth")
async def upload_growth(file: UploadFile = File(...)):
    content = await file.read()
    _store["growth_df"] = load_dataframe(content, file.filename)
    return {"message": "Growth uploaded", "rows": len(_store["growth_df"])}


# ─────────────────────────────────────────────
# Data endpoints
# ─────────────────────────────────────────────

@app.get("/data/segments")
def get_segments():
    df = _store.get("dataset_df")
    if df is None:
        raise HTTPException(404, "Dataset not loaded")
    return {"segments": sorted(df["Segment"].dropna().unique().tolist())}


@app.get("/data/presence-table")
def get_presence_table():
    e = _store.get("elasticity_df")
    if e is None:
        raise HTTPException(404, "Elasticity not loaded")
    return {"table": build_presence_table(e)}


@app.get("/data/growth-table")
def get_growth_table(segment: str):
    dataset_df = _store.get("dataset_df")
    elasticity_df = _store.get("elasticity_df")
    growth_df = _store.get("growth_df")

    if any(x is None for x in [dataset_df, elasticity_df, growth_df]):
        raise HTTPException(404, "Files not loaded")

    seg_elasticity = elasticity_df[elasticity_df["Segment"] == segment].copy()
    prepared = prepare_growth_df(seg_elasticity, growth_df.copy())

    growth_cols = [c for c in prepared.columns if "Growth Rate" in c]

    # Value columns: plain year labels like A19, A20 ... A29 (no "Growth Rate" in name)
    value_cols = [
        c for c in prepared.columns
        if c not in ["Variable", "Segment"] and "Growth Rate" not in c
        and isinstance(c, str) and c.startswith("A") and c[1:].isdigit()
    ]

    all_cols = ["Variable", "Segment"] + growth_cols + value_cols
    existing_cols = [c for c in all_cols if c in prepared.columns]
    result = prepared[existing_cols].to_dict(orient="records")
    return {"growth_data": result, "growth_cols": growth_cols, "value_cols": value_cols}


@app.get("/data/historical-growth")
def get_historical_growth(segment: str = None):
    df = _store.get("dataset_df")
    if df is None:
        raise HTTPException(404, "Dataset not loaded")
    if segment:
        df = df[df["Segment"] == segment]
    return {"data": compute_historical_growth(df)}


# ─────────────────────────────────────────────
# Forecast endpoint
# ─────────────────────────────────────────────

class ForecastRequest(BaseModel):
    segment: str
    growth_data: List[dict]   # edited growth_df rows
    cagr_years: int = 3


@app.post("/calculate/forecast")
def calculate_forecast(req: ForecastRequest):
    dataset_df = _store.get("dataset_df")
    elasticity_df = _store.get("elasticity_df")

    if any(x is None for x in [dataset_df, elasticity_df]):
        raise HTTPException(404, "Files not loaded")

    seg_dataset = dataset_df[dataset_df["Segment"] == req.segment].copy()
    seg_elasticity = elasticity_df[elasticity_df["Segment"] == req.segment].copy()

    beta_df = compute_beta_df(seg_elasticity, seg_dataset)
    dataset_filter = prepare_dataset_filter(dataset_df[dataset_df["Segment"] == req.segment].copy())

    recent_fy_num = dataset_filter["FY_num"].max() - 1
    recent_fy = f"FY{recent_fy_num}"

    elasticity_vars = seg_elasticity["Variable"].dropna().unique().tolist()
    available_vars = [v for v in elasticity_vars if v in seg_dataset.columns]

    fy24_avg = (
        dataset_filter[dataset_filter["Fiscal Year"] == recent_fy]
        [["Segment", "Volume"] + available_vars]
        .groupby("Segment", as_index=False)
        .mean()
    )

    base_vol_map = (
        dataset_filter[dataset_filter["Fiscal Year"] == recent_fy]
        .groupby("Segment")["Volume"]
        .mean()
        .to_dict()
    )

    edited_growth_df = pd.DataFrame(req.growth_data)

    # Three elasticity scenarios
    beta_base = beta_df.copy()
    beta_up10 = beta_df.copy()
    beta_up10["ScaledBeta"] *= 1.10
    beta_down10 = beta_df.copy()
    beta_down10["ScaledBeta"] *= 0.90

    fc_base = run_forecast(edited_growth_df, beta_base, dataset_df, fy24_avg, base_vol_map, available_vars)
    fc_up = run_forecast(edited_growth_df, beta_up10, dataset_df, fy24_avg, base_vol_map, available_vars)
    fc_down = run_forecast(edited_growth_df, beta_down10, dataset_df, fy24_avg, base_vol_map, available_vars)

    fc_base["Scenario"] = "Base Elasticity"
    fc_up["Scenario"] = "+10% Elasticity"
    fc_down["Scenario"] = "-10% Elasticity"

    forecast_df = pd.concat([fc_base, fc_up, fc_down], ignore_index=True)
    forecast_df["FiscalYear"] = forecast_df["FiscalYear"].str.replace("FY", "A")

    # Base volume for recent FY
    dataset_filter["Fiscal Year"] = dataset_filter["Fiscal Year"].str.replace("FY", "A")
    recent_fy_a = recent_fy.replace("FY", "A")

    base_vol_df = (
        dataset_filter[dataset_filter["Fiscal Year"] == recent_fy_a]
        .groupby("Segment")["Volume"]
        .mean()
        .reset_index()
        .rename(columns={"Volume": "PredictedVolume"})
    )
    base_vol_df["FiscalYear"] = recent_fy_a
    base_vol_df["Scenario"] = "Base Elasticity"

    tmp = pd.concat(
        [base_vol_df[["FiscalYear", "Segment", "PredictedVolume", "Scenario"]],
         forecast_df[["FiscalYear", "Segment", "PredictedVolume", "Scenario"]]],
        ignore_index=True
    )
    tmp["FY_num"] = tmp["FiscalYear"].str.extract(r"(\d+)").astype(int)
    tmp = tmp.sort_values(["Segment", "FY_num"])
    tmp["VolumeGrowth_%"] = tmp.groupby("Segment")["PredictedVolume"].pct_change() * 100

    final_df = tmp[tmp["FiscalYear"] != recent_fy_a].drop(columns="FY_num")

    # CAGR
    cagr_result = compute_cagr_table(final_df, req.cagr_years)

    # Contributions (base only)
    _, x_contrib_df = run_forecast_with_contributions(
        edited_growth_df, beta_base, dataset_df, fy24_avg, base_vol_map, available_vars
    )
    x_contrib_df["FiscalYear"] = x_contrib_df["FiscalYear"].str.replace("FY", "A")

    # Historical growth
    hist_data = compute_historical_growth(dataset_df[dataset_df["Segment"] == req.segment])
    hist_df = pd.DataFrame(hist_data)

    scenarios = ["Base Elasticity", "+10% Elasticity", "-10% Elasticity"]
    hist_expanded = pd.concat(
        [hist_df.assign(Scenario=sc) for sc in scenarios], ignore_index=True
    )
    plot_df = pd.concat([hist_expanded, forecast_df], ignore_index=True)
    plot_df["FY_num"] = plot_df["FiscalYear"].str.extract(r"(\d+)").astype(int)
    plot_df = plot_df.sort_values(["Scenario", "Segment", "FY_num"]).drop(columns="FY_num")

    num_cols = final_df.select_dtypes(include="number").columns
    final_df[num_cols] = final_df[num_cols].round(1)

    return {
        "forecast_scenarios": forecast_df.round(2).to_dict(orient="records"),
        "final_df": final_df.to_dict(orient="records"),
        "cagr": cagr_result,
        "contributions": x_contrib_df.round(4).to_dict(orient="records"),
        "plot_data": plot_df.round(2).fillna(0).to_dict(orient="records"),
        "base_vol_df": base_vol_df.to_dict(orient="records"),
        "recent_fy": recent_fy_a,
        "forecast_years": sorted(final_df["FiscalYear"].unique().tolist(), key=lambda x: int(x[1:]))
    }


# ─────────────────────────────────────────────
# Waterfall endpoint
# ─────────────────────────────────────────────

class WaterfallRequest(BaseModel):
    segment: str
    start_fy: str
    end_fy: str
    selected_vars: List[str]
    variable_scale: float = 1.5
    growth_data: List[dict]
    final_df: List[dict]


@app.post("/calculate/waterfall")
def calculate_waterfall(req: WaterfallRequest):
    elasticity_df = _store.get("elasticity_df")
    if elasticity_df is None:
        raise HTTPException(404, "Elasticity not loaded")

    edited_growth_df = pd.DataFrame(req.growth_data)
    final_df = pd.DataFrame(req.final_df)

    seg_elasticity = elasticity_df[elasticity_df["Segment"] == req.segment].copy()

    result = compute_waterfall(
        edited_growth_df, seg_elasticity, final_df,
        req.start_fy, req.end_fy, req.selected_vars,
        req.variable_scale, req.segment
    )
    return {"waterfall": result}


@app.get("/data/variables")
def get_variables(segment: str):
    elasticity_df = _store.get("elasticity_df")
    if elasticity_df is None:
        raise HTTPException(404, "Elasticity not loaded")
    seg_e = elasticity_df[elasticity_df["Segment"] == segment]
    exclude = ["Seasonality", "Trend"]
    vars_ = sorted(v for v in seg_e["Variable"].unique().tolist() if v not in exclude)
    return {"variables": vars_}
