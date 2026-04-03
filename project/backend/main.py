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
DEFAULT_VOLUME_FORECAST = "Volume_forecast_df.xlsx"
DEFAULT_FEATURE_LIST = "Feature list for forecasting tool.xlsx"
DEFAULT_CONSOLIDATED = "Consolidated_Features.xlsx"

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
    if os.path.exists(DEFAULT_VOLUME_FORECAST):
        _store["volume_forecast_df"] = pd.read_excel(DEFAULT_VOLUME_FORECAST)
    if os.path.exists(DEFAULT_FEATURE_LIST):
        _store["feature_list_df"] = pd.read_excel(DEFAULT_FEATURE_LIST)
    if os.path.exists(DEFAULT_CONSOLIDATED):
        _store["consolidated_df"] = pd.read_excel(DEFAULT_CONSOLIDATED)


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


# ─────────────────────────────────────────────
# Volume Overview endpoints
# ─────────────────────────────────────────────

@app.get("/volume-overview/segments")
def get_volume_overview_segments():
    df = _store.get("volume_forecast_df")
    if df is None:
        raise HTTPException(404, "Volume forecast file not loaded")
    order = ["Value", "Deluxe", "Premium", "Super-premium"]
    segs = df["Segment"].dropna().unique().tolist()
    segs_sorted = [s for s in order if s in segs] + [s for s in segs if s not in order]
    return {"segments": segs_sorted}


@app.get("/volume-overview/data")
def get_volume_overview_data(segment: str):
    df = _store.get("volume_forecast_df")
    if df is None:
        raise HTTPException(404, "Volume forecast file not loaded")

    seg_df = df[df["Segment"] == segment].copy()
    seg_df["Date"] = pd.to_datetime(seg_df["Date"])
    seg_df = seg_df.sort_values("Date")

    # Detect forecast columns (all except Segment, Date, Actual)
    model_cols = [c for c in seg_df.columns if c not in ["Segment", "Date", "Actual"]]

    # Determine forecast start: first row where Actual is NaN
    forecast_start_idx = seg_df["Actual"].isna().idxmax() if seg_df["Actual"].isna().any() else None
    forecast_start_date = seg_df.loc[forecast_start_idx, "Date"].isoformat() if forecast_start_idx is not None else None

    import math
    records = []
    for _, row in seg_df.iterrows():
        r = {"Date": row["Date"].strftime("%Y-%m-%d")}
        r["Actual"] = None if (row["Actual"] is None or (isinstance(row["Actual"], float) and math.isnan(row["Actual"]))) else round(float(row["Actual"]), 0)
        for col in model_cols:
            val = row[col]
            r[col] = None if (val is None or (isinstance(val, float) and math.isnan(val))) else round(float(val), 0)
        records.append(r)

    return {
        "data": records,
        "model_cols": model_cols,
        "forecast_start_date": forecast_start_date
    }


# ─────────────────────────────────────────────
# Feature Overview endpoints
# ─────────────────────────────────────────────

@app.get("/feature-overview/variable")
def get_feature_variable(variable: str):
    df = _store.get("consolidated_df")
    if df is None:
        raise HTTPException(404, "Consolidated features not loaded")
    if variable not in df.columns:
        raise HTTPException(404, f"Variable '{variable}' not found")
    import math
    records = []
    for _, row in df.iterrows():
        val = row[variable]
        records.append({
            "date": pd.to_datetime(row["date"]).strftime("%Y-%m-%d"),
            "value": None if (val is None or (isinstance(val, float) and math.isnan(val))) else float(val)
        })
    return {"data": records, "variable": variable}


@app.get("/feature-overview/correlation-matrix")
def get_correlation_matrix(segment: str):
    vol_df = _store.get("volume_forecast_df")
    feat_df = _store.get("consolidated_df")
    feat_list = _store.get("feature_list_df")
    if any(x is None for x in [vol_df, feat_df, feat_list]):
        raise HTTPException(404, "Required files not loaded")

    seg_vol = vol_df[vol_df["Segment"] == segment][["Date", "Actual"]].dropna().copy()
    seg_vol["ym"] = pd.to_datetime(seg_vol["Date"]).dt.to_period("M").astype(str)

    feat_df = feat_df.copy()
    feat_df["ym"] = pd.to_datetime(feat_df["date"]).dt.to_period("M").astype(str)

    # Build merged dataframe: Volume + all available features
    merged = seg_vol[["ym", "Actual"]].rename(columns={"Actual": "Volume"})
    display_map = {"Volume": "Volume"}

    for _, frow in feat_list.iterrows():
        var = frow["Variable name"]
        display = frow["Edited variable name"]
        if var not in feat_df.columns:
            continue
        tmp = feat_df[["ym", var]].dropna()
        merged = merged.merge(tmp, on="ym", how="left")
        display_map[var] = display

    merged = merged.drop(columns=["ym"]).dropna()
    if merged.shape[0] < 5:
        raise HTTPException(400, "Not enough data for correlation matrix")

    corr = merged.corr().round(3)
    cols = corr.columns.tolist()
    display_cols = [display_map.get(c, c) for c in cols]

    import math
    matrix = []
    for row_col in cols:
        row = []
        for col_col in cols:
            v = corr.loc[row_col, col_col]
            row.append(None if (isinstance(v, float) and math.isnan(v)) else v)
        matrix.append(row)

    return {"columns": cols, "display_columns": display_cols, "matrix": matrix}


@app.get("/feature-overview/correlations")
def get_feature_correlations(segment: str):
    vol_df = _store.get("volume_forecast_df")
    feat_df = _store.get("consolidated_df")
    feat_list = _store.get("feature_list_df")
    if any(x is None for x in [vol_df, feat_df, feat_list]):
        raise HTTPException(404, "Required files not loaded")

    # Get actual volume for segment
    seg_vol = vol_df[vol_df["Segment"] == segment][["Date", "Actual"]].dropna()
    seg_vol = seg_vol.copy()
    seg_vol["ym"] = pd.to_datetime(seg_vol["Date"]).dt.to_period("M").astype(str)

    feat_df = feat_df.copy()
    feat_df["ym"] = pd.to_datetime(feat_df["date"]).dt.to_period("M").astype(str)

    import math
    results = []
    for _, frow in feat_list.iterrows():
        var = frow["Variable name"]
        display = frow["Edited variable name"]
        cat = frow["Category"]
        if var not in feat_df.columns:
            continue
        merged = seg_vol.merge(feat_df[["ym", var]], on="ym", how="inner").dropna()
        if len(merged) < 5:
            continue
        vol_vals = merged["Actual"].values
        feat_vals = merged[var].values
        n = len(vol_vals)
        mv = vol_vals.mean(); mf = feat_vals.mean()
        num = ((vol_vals - mv) * (feat_vals - mf)).sum()
        dv = ((vol_vals - mv) ** 2).sum() ** 0.5
        df2 = ((feat_vals - mf) ** 2).sum() ** 0.5
        corr = round(num / (dv * df2), 3) if dv * df2 != 0 else 0
        results.append({"variable": var, "display_name": display, "category": cat, "correlation": corr})

    results.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return {"correlations": results}


@app.get("/feature-overview/categories")
def get_feature_categories():
    df = _store.get("feature_list_df")
    if df is None:
        raise HTTPException(404, "Feature list not loaded")
    result = {}
    for _, row in df.iterrows():
        cat = row["Category"]
        if cat not in result:
            result[cat] = []
        result[cat].append({
            "variable_name": row["Variable name"],
            "display_name": row["Edited variable name"],
            "description": row.get("Description", "")
        })
    return {"categories": result}
