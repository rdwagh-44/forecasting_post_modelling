import pandas as pd
import numpy as np


TARGET_YEARS = ["A26", "A27", "A28", "A29"]
BASE_FY = "FY25"


def run_forecast(edited_growth_df: pd.DataFrame, beta_df: pd.DataFrame,
                 dataset_df: pd.DataFrame, fy24_avg: pd.DataFrame,
                 base_vol_map: dict, elasticity_vars: list) -> pd.DataFrame:
    all_forecasts = []
    last_volume = base_vol_map.copy()
    last_x_values = {}

    for seg in fy24_avg["Segment"].unique():
        last_x_values[seg] = {
            var: fy24_avg.loc[fy24_avg["Segment"] == seg, var].values[0]
            for var in elasticity_vars
            if var in fy24_avg.columns
        }

    for fy in TARGET_YEARS:
        growth_col = f"{fy} Growth Rate (%)"

        for seg in last_x_values.keys():
            new_x = {}
            for var, prev_val in last_x_values[seg].items():
                g = edited_growth_df.loc[
                    (edited_growth_df["Segment"] == seg) &
                    (edited_growth_df["Variable"] == var),
                    growth_col
                ]
                if g.empty:
                    new_x[var] = prev_val
                    continue
                growth = g.values[0] / 100
                new_x[var] = prev_val * (1 + growth)

            y_hat = beta_df.loc[beta_df["Segment"] == seg, "ScaledBeta0"].iloc[0]
            seg_betas = beta_df[beta_df["Segment"] == seg]

            for _, b in seg_betas.iterrows():
                var = b["Variable"]
                mean_x = dataset_df[var].mean()
                std_x = dataset_df[var].std()
                if std_x == 0 or pd.isna(std_x):
                    continue
                x_scaled = (new_x[var] - mean_x) / std_x
                y_hat += b["ScaledBeta"] * x_scaled

            prev_vol = last_volume[seg]
            yoy_growth = ((y_hat - prev_vol) / prev_vol) * 100

            all_forecasts.append({
                "FiscalYear": f"FY{fy[1:]}",
                "Segment": seg,
                "PredictedVolume": y_hat,
                "VolumeGrowth_%": yoy_growth
            })

            last_x_values[seg] = new_x
            last_volume[seg] = y_hat

    return pd.DataFrame(all_forecasts)


def run_forecast_with_contributions(edited_growth_df: pd.DataFrame, beta_df: pd.DataFrame,
                                     dataset_df: pd.DataFrame, fy24_avg: pd.DataFrame,
                                     base_vol_map: dict, elasticity_vars: list):
    all_forecasts = []
    all_x_contributions = []
    last_volume = base_vol_map.copy()
    last_x_values = {}

    for seg in fy24_avg["Segment"].unique():
        last_x_values[seg] = {
            var: fy24_avg.loc[fy24_avg["Segment"] == seg, var].values[0]
            for var in elasticity_vars
            if var in fy24_avg.columns
        }

    for fy in TARGET_YEARS:
        growth_col = f"{fy} Growth Rate (%)"

        for seg in last_x_values.keys():
            new_x = {}
            for var, prev_val in last_x_values[seg].items():
                g = edited_growth_df.loc[
                    (edited_growth_df["Segment"] == seg) &
                    (edited_growth_df["Variable"] == var),
                    growth_col
                ]
                if g.empty:
                    new_x[var] = prev_val
                    continue
                growth = g.values[0] / 100
                new_x[var] = prev_val * (1 + growth)

            y_hat = beta_df.loc[beta_df["Segment"] == seg, "ScaledBeta0"].iloc[0]
            seg_betas = beta_df[beta_df["Segment"] == seg]
            var_contributions = {}

            for _, b in seg_betas.iterrows():
                var = b["Variable"]
                mean_x = dataset_df[var].mean()
                std_x = dataset_df[var].std()
                if std_x == 0 or pd.isna(std_x):
                    continue
                x_scaled = (new_x[var] - mean_x) / std_x
                x_contrib = b["ScaledBeta"] * x_scaled
                var_contributions[var] = x_contrib
                y_hat += b["ScaledBeta"] * x_scaled

            prev_vol = last_volume[seg]
            yoy_growth = ((y_hat - prev_vol) / prev_vol) * 100

            all_forecasts.append({
                "FiscalYear": f"FY{fy[1:]}",
                "Segment": seg,
                "PredictedVolume": y_hat,
                "VolumeGrowth_%": yoy_growth
            })

            total_prediction = y_hat if y_hat != 0 else 1
            for var, contrib in var_contributions.items():
                all_x_contributions.append({
                    "FiscalYear": f"FY{fy[1:]}",
                    "Segment": seg,
                    "Variable": var,
                    "Contribution_Value": contrib,
                    "Contribution_%": contrib / total_prediction,
                    "PredictedVolume": y_hat
                })

            last_x_values[seg] = new_x
            last_volume[seg] = y_hat

    return pd.DataFrame(all_forecasts), pd.DataFrame(all_x_contributions)


def compute_cagr_table(final_df: pd.DataFrame, cagr_years: int) -> dict:
    final_growth_df = final_df.copy()
    final_growth_df["YearLabel"] = final_growth_df["FiscalYear"]
    final_growth_df["growth_dec"] = final_growth_df["VolumeGrowth_%"] / 100

    pivot_growth = (
        final_growth_df
        .pivot_table(index=["Scenario", "Segment"], columns="YearLabel",
                     values="growth_dec", aggfunc="mean")
        .reset_index()
    )

    year_cols = sorted(
        [c for c in pivot_growth.columns if c.startswith("A")],
        key=lambda x: int(x[1:])
    )

    selected_years = year_cols[-cagr_years:]

    pivot_growth[f"{cagr_years}-yr CAGR"] = (
        np.prod(1 + pivot_growth[selected_years], axis=1) ** (1 / cagr_years) - 1
    )

    display_cols = selected_years + [f"{cagr_years}-yr CAGR"]
    for col in display_cols:
        pivot_growth[col] = (pivot_growth[col] * 100).round(1)

    return {
        "table": pivot_growth[["Scenario", "Segment"] + display_cols].to_dict(orient="records"),
        "year_cols": year_cols,
        "max_years": len(year_cols)
    }
