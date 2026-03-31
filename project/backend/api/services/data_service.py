import pandas as pd
import numpy as np
import io


def load_dataframe(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        return pd.read_csv(io.BytesIO(file_bytes))
    return pd.read_excel(io.BytesIO(file_bytes))


def load_dataset(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Load dataset and rename Region -> Segment, handle multi-sheet xlsx."""
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
        df.rename(columns={"Region": "Segment"}, inplace=True)
        return df

    excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
    df_list = []
    for sheet in excel_file.sheet_names:
        temp = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet)
        temp.rename(columns={"Region": "Segment"}, inplace=True)
        temp["SourceSheet"] = sheet
        df_list.append(temp)
    return pd.concat(df_list, ignore_index=True)


def load_default_dataset(path: str) -> pd.DataFrame:
    if path.endswith(".csv"):
        df = pd.read_csv(path)
    else:
        excel_file = pd.ExcelFile(path)
        df_list = []
        for sheet in excel_file.sheet_names:
            temp = pd.read_excel(path, sheet_name=sheet)
            temp.rename(columns={"Region": "Segment"}, inplace=True)
            temp["SourceSheet"] = sheet
            df_list.append(temp)
        return pd.concat(df_list, ignore_index=True)
    df.rename(columns={"Region": "Segment"}, inplace=True)
    return df


def build_presence_table(elasticity_df: pd.DataFrame) -> dict:
    presence_df = elasticity_df.copy()
    presence_df["Present"] = "✓"
    table = (
        presence_df
        .pivot_table(index="Variable", columns="Segment", values="Present", aggfunc="first")
        .fillna("✗")
        .reset_index()
    )
    # Enforce segment column order
    desired_order = ["Variable", "Value", "Deluxe", "Premium", "Super-premium"]
    ordered_cols = [c for c in desired_order if c in table.columns] + \
                   [c for c in table.columns if c not in desired_order]
    return table[ordered_cols].to_dict(orient="records")


def clean_var_name(var: str) -> str:
    return var.replace("Res_", "").replace("Lag_", "").replace("lag_", "").strip()


def prepare_growth_df(elasticity_df: pd.DataFrame, growth_df: pd.DataFrame) -> pd.DataFrame:
    if "Feature" in growth_df.columns:
        growth_df = growth_df.rename(columns={"Feature": "Variable"})

    elasticity_df = elasticity_df.copy()
    growth_df = growth_df.copy()

    elasticity_df["CleanVar"] = elasticity_df["Variable"].apply(clean_var_name)
    growth_df["CleanVar"] = growth_df["Variable"].apply(clean_var_name)

    clean_to_original = dict(zip(elasticity_df["CleanVar"], elasticity_df["Variable"]))

    growth_df = growth_df[growth_df["CleanVar"].isin(clean_to_original.keys())].copy()
    growth_df["Variable"] = growth_df["CleanVar"].map(clean_to_original)

    valid_segments = elasticity_df["Segment"].unique()
    growth_df["Segment"] = valid_segments[0]
    growth_df.drop(columns=["CleanVar"], inplace=True)

    return growth_df


def compute_beta_df(elasticity_df: pd.DataFrame, dataset_df: pd.DataFrame) -> pd.DataFrame:
    beta_rows = []
    for _, row in elasticity_df.iterrows():
        seg = row["Segment"]
        var = row["Variable"]
        elasticity = row["Elasticity"]

        seg_df = dataset_df[dataset_df["Segment"] == seg]
        y_mean = seg_df["Volume"].mean()
        x_mean = seg_df[var].mean()
        x_std = seg_df[var].std()

        non_scaled_beta = elasticity * (y_mean / x_mean)
        scaled_beta = non_scaled_beta * x_std

        beta_rows.append({
            "Segment": seg,
            "Variable": var,
            "Elasticity": elasticity,
            "x_mean": x_mean,
            "x_std": x_std,
            "y_mean": y_mean,
            "NonScaledBeta": non_scaled_beta,
            "ScaledBeta": scaled_beta,
            "ScaledBeta0": row["Scaled beta0"]
        })
    return pd.DataFrame(beta_rows)


def prepare_dataset_filter(dataset_df: pd.DataFrame) -> pd.DataFrame:
    """Remove 2024 data and shift 2025->2024, 2026->2025."""
    df = dataset_df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df[df["date"].dt.year != 2024].copy()

    mask_2025 = df["date"].dt.year == 2025
    mask_2026 = df["date"].dt.year == 2026
    df.loc[mask_2025, "date"] = df.loc[mask_2025, "date"] - pd.DateOffset(years=1)
    df.loc[mask_2026, "date"] = df.loc[mask_2026, "date"] - pd.DateOffset(years=1)

    df["Year"] = df["date"].dt.year
    df["Month"] = df["date"].dt.month
    df["Fiscal Year"] = (
        "FY" + (df["date"].dt.year + (df["date"].dt.month >= 7)).astype(str).str[-2:]
    )
    df["FY_num"] = df["Fiscal Year"].str.extract(r"(\d+)").astype(int)
    return df


def compute_historical_growth(dataset_df: pd.DataFrame) -> list:
    df = dataset_df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["FiscalYear"] = (
        "FY" + (df["date"].dt.year + (df["date"].dt.month >= 7)).astype(str).str[-2:]
    )
    df["FiscalYear"] = df["FiscalYear"].str.replace("FY", "A")

    hist_vol = df.groupby(["Segment", "FiscalYear"])["Volume"].mean().reset_index()
    hist_vol["FY_num"] = hist_vol["FiscalYear"].str.extract(r"(\d+)").astype(int)
    hist_vol = hist_vol.sort_values(["Segment", "FY_num"])
    hist_vol["VolumeGrowth_%"] = hist_vol.groupby("Segment")["Volume"].pct_change() * 100
    hist_vol = hist_vol.rename(columns={"Volume": "PredictedVolume"})

    max_fy = hist_vol["FY_num"].max()
    cutoff = 25 if max_fy <= 100 else 2025
    hist_vol = hist_vol[hist_vol["FY_num"] <= cutoff].drop(columns="FY_num")

    hist_vol["Scenario"] = "Historical"

    # Convert to records and replace float nan with None so JSON serializes cleanly
    records = hist_vol.to_dict(orient="records")
    import math
    for row in records:
        for k, v in row.items():
            if isinstance(v, float) and math.isnan(v):
                row[k] = None
    return records
