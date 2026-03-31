import pandas as pd
import numpy as np


def compute_waterfall(
    edited_growth_df: pd.DataFrame,
    elasticity_df: pd.DataFrame,
    final_df: pd.DataFrame,
    start_fy: str,
    end_fy: str,
    selected_vars: list,
    variable_scale: float,
    segment: str
) -> dict:
    start_year = int(start_fy.replace("A", ""))
    end_year = int(end_fy.replace("A", ""))

    selected_years = [f"A{y}" for y in range(start_year + 1, end_year + 1)]

    contrib_rows = []
    for _, row in edited_growth_df.iterrows():
        seg = row["Segment"]
        var = row["Variable"]
        if var not in selected_vars:
            continue

        elasticity = elasticity_df.loc[
            (elasticity_df["Segment"] == seg) & (elasticity_df["Variable"] == var),
            "Elasticity"
        ]
        if elasticity.empty:
            continue
        elasticity = elasticity.values[0]

        for fy in selected_years:
            growth_col = f"{fy} Growth Rate (%)"
            if growth_col not in edited_growth_df.columns:
                continue
            g = row[growth_col]
            contrib_rows.append({
                "Segment": seg,
                "Variable": var,
                "FiscalYear": fy,
                "Contribution": elasticity * g
            })

    contrib_df = pd.DataFrame(contrib_rows)
    total_contrib = (
        contrib_df.groupby(["Segment", "Variable"], as_index=False)["Contribution"].sum()
    )

    seg_final = final_df[final_df["Segment"] == segment]
    start_vol = seg_final.loc[seg_final["FiscalYear"] == start_fy, "PredictedVolume"].values[0]
    end_vol = seg_final.loc[seg_final["FiscalYear"] == end_fy, "PredictedVolume"].values[0]

    wf_rows = [{"Label": start_fy, "Value": start_vol, "Type": "start"}]

    seg_contrib = total_contrib[total_contrib["Segment"] == segment]
    for _, row in seg_contrib.iterrows():
        wf_rows.append({"Label": row["Variable"], "Value": row["Contribution"], "Type": "variable"})

    wf_rows.append({"Label": end_fy, "Value": end_vol, "Type": "end"})

    wf_df = pd.DataFrame(wf_rows)

    total_variable_contrib = wf_df.loc[wf_df["Type"] == "variable", "Value"].sum()

    wf_df["Pct_Normalized"] = np.where(
        wf_df["Type"] == "variable",
        wf_df["Value"] / (total_variable_contrib if total_variable_contrib != 0 else 1),
        wf_df["Value"] / (start_vol if start_vol != 0 else 1)
    )

    end_pct = end_vol / start_vol if start_vol != 0 else 1
    delta_pct = end_pct - 1.0

    wf_df["Waterfall_Value"] = np.where(
        wf_df["Type"] == "variable",
        wf_df["Pct_Normalized"] * delta_pct,
        wf_df["Pct_Normalized"]
    )

    START_END_SCALE = 0.25
    wf_df["DisplayValue"] = np.where(
        wf_df["Type"].isin(["start", "end"]),
        wf_df["Waterfall_Value"] * START_END_SCALE,
        wf_df["Waterfall_Value"] * variable_scale
    )

    wf_df["LabelText"] = wf_df["Waterfall_Value"].apply(lambda x: f"{x*100:.1f}%")

    return wf_df.to_dict(orient="records")
