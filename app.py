import streamlit as st
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import plotly.express as px

st.set_page_config(page_title="Forecasting Post-Modeling Analysis", layout="wide")




################################################################# Post MOdelling ###############################################################################
################################################################# Post MOdelling ###############################################################################
################################################################# Post MOdelling ###############################################################################
################################################################# Post MOdelling ###############################################################################
################################################################# Post MOdelling ###############################################################################

st.title("📊 Post-Modeling Analysis")

dataset_file = st.sidebar.file_uploader(
    "Upload Modeling Dataset", type=["csv", "xlsx"]
)
elasticity_file = st.sidebar.file_uploader(
    "Upload Elasticity File", type=["csv", "xlsx"]
)
growth_file = st.sidebar.file_uploader(
    "Upload Growth Rate File", type=["csv", "xlsx"]
)


# -----------------------------------------------------
# Generic loader
# -----------------------------------------------------
@st.cache_data
def load_file(file_or_path):

    if isinstance(file_or_path, str):

        if file_or_path.endswith(".csv"):
            return pd.read_csv(file_or_path)

        elif file_or_path.endswith(".xlsx"):
            return pd.read_excel(file_or_path)

    else:

        if file_or_path.name.endswith(".csv"):
            return pd.read_csv(file_or_path)

        elif file_or_path.name.endswith(".xlsx"):
            return pd.read_excel(file_or_path)

    return None


# -----------------------------------------------------
# Dataset loader (handles Region → Segment)
# -----------------------------------------------------
# def data_load_file(file_or_path):

#     if isinstance(file_or_path, str):

#         if file_or_path.endswith(".csv"):
#             df = pd.read_csv(file_or_path)
#         else:
#             df = pd.read_excel(file_or_path)

#         df.rename(columns={"Region": "Segment"}, inplace=True)

#         if "Segment" not in df.columns:
#             st.error("Required column 'Segment' not found.")
#             st.stop()

#         return df

#     # Uploaded file case
#     if file_or_path.name.endswith(".csv"):

#         df = pd.read_csv(file_or_path)

#     else:

#         excel_file = pd.ExcelFile(file_or_path)
#         sheet_names = excel_file.sheet_names
#         df_list = []

#         for sheet in sheet_names:

#             temp = pd.read_excel(file_or_path, sheet_name=sheet)
#             temp.rename(columns={"Region": "Segment"}, inplace=True)

#             if "Segment" not in temp.columns:
#                 st.error(f"'Segment' column missing in sheet: {sheet}")
#                 st.stop()

#             temp["SourceSheet"] = sheet
#             df_list.append(temp)

#         df = pd.concat(df_list, ignore_index=True)

#     return df


def data_load_file(file_or_path):

    # ---------------------------
    # If file path string
    # ---------------------------
    if isinstance(file_or_path, str):

        if file_or_path.endswith(".csv"):

            df = pd.read_csv(file_or_path)
            df.rename(columns={"Region": "Segment"}, inplace=True)

            if "Segment" not in df.columns:
                st.error("Required column 'Segment' not found.")
                st.stop()

            return df

        else:

            excel_file = pd.ExcelFile(file_or_path)
            sheet_names = excel_file.sheet_names

            df_list = []

            for sheet in sheet_names:

                temp = pd.read_excel(file_or_path, sheet_name=sheet)
                temp.rename(columns={"Region": "Segment"}, inplace=True)

                if "Segment" not in temp.columns:
                    st.error(f"'Segment' column missing in sheet: {sheet}")
                    st.stop()

                temp["SourceSheet"] = sheet
                df_list.append(temp)

            return pd.concat(df_list, ignore_index=True)

    # ---------------------------
    # Uploaded file case
    # ---------------------------
    if file_or_path.name.endswith(".csv"):

        df = pd.read_csv(file_or_path)
        df.rename(columns={"Region": "Segment"}, inplace=True)

        if "Segment" not in df.columns:
            st.error("Required column 'Segment' not found.")
            st.stop()

        return df

    else:

        excel_file = pd.ExcelFile(file_or_path)
        sheet_names = excel_file.sheet_names

        df_list = []

        for sheet in sheet_names:

            temp = pd.read_excel(file_or_path, sheet_name=sheet)
            temp.rename(columns={"Region": "Segment"}, inplace=True)

            if "Segment" not in temp.columns:
                st.error(f"'Segment' column missing in sheet: {sheet}")
                st.stop()

            temp["SourceSheet"] = sheet
            df_list.append(temp)

        return pd.concat(df_list, ignore_index=True)

# -----------------------------------------------------
# Default file names (same folder as app)
# -----------------------------------------------------
DEFAULT_DATASET = "dataset_df.xlsx"
DEFAULT_ELASTICITY = "elasticity_df.xlsx"
DEFAULT_GROWTH = "growth_df.xlsx"


# -----------------------------------------------------
# Load Dataset
# -----------------------------------------------------
if dataset_file is not None:
    dataset_df = data_load_file(dataset_file)
    st.sidebar.success("Custom dataset uploaded")
else:
    dataset_df = data_load_file(DEFAULT_DATASET)
    st.sidebar.info("Using default modeling dataset")
    # st.dataframe(dataset_df, use_container_width=True)


# -----------------------------------------------------
# Load Elasticity
# -----------------------------------------------------
if elasticity_file is not None:
    elasticity_df = load_file(elasticity_file)
    st.sidebar.success("Custom elasticity uploaded")
else:
    elasticity_df = load_file(DEFAULT_ELASTICITY)
    st.sidebar.info("Using default elasticity file")


# -----------------------------------------------------
# Load Growth
# -----------------------------------------------------
if growth_file is not None:
    growth_df = load_file(growth_file)
    st.sidebar.success("Custom growth uploaded")
else:
    growth_df = load_file(DEFAULT_GROWTH)
    st.sidebar.info("Using default growth file")

# st.title("📊 Post-Modeling Analysis")

# dataset_file = st.sidebar.file_uploader(
#     "Upload Modeling Dataset", type=["csv", "xlsx"]
# )
# elasticity_file = st.sidebar.file_uploader(
#     "Upload Elasticity File", type=["csv", "xlsx"]
# )
# growth_file = st.sidebar.file_uploader(
#     "Upload Growth Rate File", type=["csv", "xlsx"]
# )

# @st.cache_data
# def load_file(file):
#     if file is None:
#         return None

#     if file.name.endswith(".csv"):
#         return pd.read_csv(file)

#     elif file.name.endswith(".xlsx"):
#         return pd.read_excel(file)

#     return None

# # -----------------------------------------------------
# # STOP if files not uploaded
# # -----------------------------------------------------
# if not (dataset_file or elasticity_file or growth_file):
#     st.info("Upload all required files to proceed.")
#     st.stop()

# def data_load_file(file):

#     if file is None:
#         return None

#     # ---------------------------
#     # CSV case
#     # ---------------------------
#     if file.name.endswith(".csv"):

#         df = pd.read_csv(file)
#         df.rename(columns={"Region": "Segment"}, inplace=True)

#         if "Segment" not in df.columns:
#             st.error("Required column 'Segment' not found.")
#             st.stop()

#         return df

#     # ---------------------------
#     # Excel case
#     # ---------------------------
#     else:

#         excel_file = pd.ExcelFile(file)
#         sheet_names = excel_file.sheet_names

#         df_list = []

#         for sheet in sheet_names:

#             temp = pd.read_excel(file, sheet_name=sheet)
#             temp.rename(columns={"Region": "Segment"}, inplace=True)
#             # st.dataframe(temp)

#             if "Segment" not in temp.columns:
#                 st.error(f"'Segment' column missing in sheet: {sheet}")
#                 st.stop()

#             temp["SourceSheet"] = sheet
#             df_list.append(temp)

#         return pd.concat(df_list, ignore_index=True)

# segment_map = {
#     "Deluxe": "Value",
#     "Premium": "Deluxe",
#     "SPIB": "Premium",
#     "SPBIO+": "Super-premium"
# }

# # ----------------------------------
# # Load data
# # ----------------------------------
# dataset_df = data_load_file(dataset_file)
# # st.write(dataset_df["Segment"].unique())

# # -----------------------------------------------------
# # LOAD FILES
# # -----------------------------------------------------
# # dataset_df = load_file(dataset_file)
# # if elasticity_file is not None:
# elasticity_df = load_file(elasticity_file)
# # if growth_file is not None:
# growth_df = load_file(growth_file)

# dataset_df["Segment"] = dataset_df["Segment"].replace(segment_map)
# elasticity_df["Segment"] = elasticity_df["Segment"].replace(segment_map)

if elasticity_df is None:
    st.info("Upload Elasticity file to continue")
    st.stop()

if growth_df is None:
    st.info("Upload Growth rate file to continue")
    st.stop()


# Create indicator column
presence_df = elasticity_df.copy()
presence_df["Present"] = "✓"

# Pivot table
presence_table = (
    presence_df
    .pivot_table(
        index="Variable",
        columns="Segment",
        values="Present",
        aggfunc="first"
    )
    .fillna("✗")
    .reset_index()
)

# Styling function
def color_marks(val):
    if val == "✓":
        return "color: green; font-weight: bold;"
    elif val == "✗":
        return "color: red; font-weight: bold;"
    return ""

styled_table = presence_table.style.applymap(color_marks)

st.dataframe(
    styled_table,
    use_container_width=True,
    hide_index=True
)

# ----------------------------------
# Segment selector AFTER concat
# ----------------------------------
if dataset_df is not None:

    seg_list = sorted(dataset_df["Segment"].dropna().unique())

    selected_segment = st.selectbox(
        "Select Segment",
        seg_list
    )
    # st.write(seg_list)

    dataset_df = dataset_df[dataset_df["Segment"] == selected_segment].copy()

# dataset_df.rename(columns={"Region": "Segment"}, inplace=True)

seg_list = dataset_df["Segment"].unique()

elasticity_df = elasticity_df[
    elasticity_df["Segment"].isin(seg_list)
]

# with st.expander("Growth Rate Data"):

# Rename Feature column if exists
if "Feature" in growth_df.columns:
    growth_df.rename(columns={"Feature": "Variable"}, inplace=True)

segments = elasticity_df["Segment"].unique()

# ---------------------------------------------
# Clean variable names
# ---------------------------------------------
def clean_var_name(var):
    return (
        var.replace("Res_", "")
        .replace("Lag_", "")
        .replace("lag_", "")
        .strip()
    )

elasticity_df["CleanVar"] = elasticity_df["Variable"].apply(clean_var_name)
growth_df["CleanVar"] = growth_df["Variable"].apply(clean_var_name)

clean_to_original = dict(
    zip(elasticity_df["CleanVar"], elasticity_df["Variable"])
)

growth_df = growth_df[
    growth_df["CleanVar"].isin(clean_to_original.keys())
].copy()

growth_df["Variable"] = growth_df["CleanVar"].map(clean_to_original)
valid_segments = elasticity_df["Segment"].unique()
growth_df['Segment'] = valid_segments[0]

growth_df.drop(columns=["CleanVar"], inplace=True)
elasticity_df.drop(columns=["CleanVar"], inplace=True)

# edited_growth_df = st.data_editor(growth_df, hide_index=True)

segment_key = f"growth_df_{selected_segment}"

if segment_key not in st.session_state:
    st.session_state[segment_key] = growth_df.copy()

growth_df = st.session_state[segment_key]

with st.expander("Growth Rate Data", expanded=True):

    col1, col2 = st.columns([1,1])

    # -----------------------------------------
    # LEFT SIDE → MAIN TABLE
    # -----------------------------------------
    with col1:

        # Copy dataframe for display only
        display_df = growth_df.copy()

        growth_cols = [c for c in display_df.columns if "Growth Rate" in c]

        # Rename column so users know where to click
        display_df = display_df.rename(columns={"Variable": "👉 Variable (Click to Select)"})

        for col in growth_cols:
            display_df[col] = display_df[col].map(lambda x: f"{x:.1f}%" if pd.notnull(x) else "")

        # Reorder columns
        ordered_cols = ["👉 Variable (Click to Select)", "Segment"] + growth_cols
        display_df = display_df[ordered_cols]

        event = st.dataframe(
            display_df,
            use_container_width=True,
            selection_mode="single-row",
            on_select="rerun",
            hide_index=True
        )

    # -----------------------------------------
    # RIGHT SIDE → CHART + EDITOR
    # -----------------------------------------
    with col2:

        if event.selection.rows:

            selected_index = event.selection.rows[0]
            selected_variable = growth_df.iloc[selected_index]["Variable"]

            # st.subheader(selected_variable)
            # Dynamic heading
            st.markdown(f"#### Line Plot of **{selected_variable}**")

            growth_cols = [c for c in growth_df.columns if "Growth Rate" in c]

            # -----------------------------------------
            # Growth Chart
            # -----------------------------------------
            chart_df = pd.DataFrame({
                "Year": growth_cols,
                "Growth Rate": growth_df.iloc[selected_index][growth_cols].values
            })

            fig = px.line(
                chart_df,
                x="Year",
                y="Growth Rate",
                markers=True
            )

            st.plotly_chart(fig, use_container_width=True)

            # -----------------------------------------
            # EDIT FUTURE GROWTH (A26 onwards)
            # -----------------------------------------
            st.markdown("#### Edit Future Growth Rates")

            future_cols = [
                c for c in growth_cols 
                if int(c.split()[0][1:]) >= 26
            ]

            edit_df = pd.DataFrame({
                "Year": future_cols,
                "Growth Rate": growth_df.iloc[selected_index][future_cols].values
            })

            edited_future = st.data_editor(
                edit_df,
                use_container_width=True,
                num_rows="fixed",
                hide_index=True
            )

            # -----------------------------------------
            # UPDATE ORIGINAL TABLE
            # -----------------------------------------
            for i, col in enumerate(future_cols):
                st.session_state[segment_key].iloc[
                    selected_index,
                    st.session_state[segment_key].columns.get_loc(col)
                ] = edited_future.loc[i, "Growth Rate"]
                

            st.markdown("#### Comment")

            # Initialize comment storage
            if "growth_comments" not in st.session_state:
                st.session_state["growth_comments"] = {}

            # Get existing comment if present
            existing_comment = st.session_state["growth_comments"].get(selected_variable, "")

            comment = st.text_area(
                "Add comment for this variable",
                value=existing_comment,
                key=f"comment_{selected_variable}"
            )

            # Save comment
            st.session_state["growth_comments"][selected_variable] = comment

        else:
            st.info("Select a variable to view growth trend and edit future growth.")

st.write("### Final Growth Rate Table")

cols_to_show = ["Segment", "Variable"] + [
    c for c in st.session_state[segment_key].columns
    if c.startswith("A") and int(c.split()[0][1:]) >= 25
]

st.dataframe(
    st.session_state[segment_key][cols_to_show],
    use_container_width=True
)

edited_growth_df = st.session_state[segment_key].copy()
# edited_growth_df["Segment"] = edited_growth_df["Segment"].replace(segment_map)


# dataset_df["date"] = pd.to_datetime(dataset_df["date"])

beta_rows = []

for _, row in elasticity_df.iterrows():
    seg = row["Segment"]
    var = row["Variable"]
    elasticity = row["Elasticity"]

    seg_df = dataset_df[dataset_df["Segment"] == seg]

    y_mean = seg_df["Volume"].mean()
    x_mean = seg_df[var].mean()
    x_std  = seg_df[var].std()

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

beta_df = pd.DataFrame(beta_rows)
# st.dataframe(beta_df)

# Ensure datetim
dataset_df["date"] = pd.to_datetime(dataset_df["date"], errors="coerce")

# --------------------------------------------------
# 1️⃣ Remove original 2024 data
# --------------------------------------------------
dataset_df_filter = dataset_df[
    dataset_df["date"].dt.year != 2024
].copy()

# --------------------------------------------------
# 2️⃣ Rename years (hard replace)
# 2025 → 2024
# 2026 → 2025
# --------------------------------------------------
mask_2025 = dataset_df_filter["date"].dt.year == 2025
mask_2026 = dataset_df_filter["date"].dt.year == 2026

dataset_df_filter.loc[mask_2025, "date"] = (
    dataset_df_filter.loc[mask_2025, "date"] - pd.DateOffset(years=1)
)

dataset_df_filter.loc[mask_2026, "date"] = (
    dataset_df_filter.loc[mask_2026, "date"] - pd.DateOffset(years=1)
)

# --------------------------------------------------
# 3️⃣ Recreate date-derived columns
# --------------------------------------------------
dataset_df_filter["Year"] = dataset_df_filter["date"].dt.year
dataset_df_filter["Month"] = dataset_df_filter["date"].dt.month

dataset_df_filter["Fiscal Year"] = (
    "FY" +
    (dataset_df_filter["date"].dt.year + (dataset_df_filter["date"].dt.month >= 7))
    .astype(str).str[-2:]
)

dataset_df_filter["FY_num"] = dataset_df_filter["Fiscal Year"].str.extract(r"(\d+)").astype(int)

recent_fy_num = dataset_df_filter["FY_num"].max() -1
recent_fy = f"FY{recent_fy_num}"
# st.write(f"Most recent fiscal year in dataset: {recent_fy}")

elasticity_vars = (
    elasticity_df["Variable"]
    .dropna()
    .unique()
    .tolist()
)

available_vars = [
    v for v in elasticity_vars
    if v in dataset_df.columns
]
# st.dataframe(dataset_df)
# st.dataframe(elasticity_df)
# st.write("Available variables for modeling:", available_vars)

cols_to_avg = ["Segment", "Volume"] + available_vars

fy_avg = (
    dataset_df_filter
    .loc[dataset_df_filter["Fiscal Year"] == recent_fy, cols_to_avg]
    .groupby("Segment", as_index=False)
    .mean()
)

# st.dataframe(fy_avg)

future_year = "A26 Growth Rate (%)"

future_rows = []

for _, row in edited_growth_df.iterrows():
    seg = row["Segment"]
    var = row["Variable"]
    growth = row[future_year] / 100

    base_val = fy_avg.loc[fy_avg["Segment"] == seg, var].values[0]
    future_val = base_val * (1 + growth)

    future_rows.append({
        "Segment": seg,
        "Variable": var,
        "FutureValue": future_val
    })

future_df = pd.DataFrame(future_rows)
# st.dataframe(future_df)

scaled_future = []

for _, row in future_df.iterrows():
    seg = row["Segment"]
    var = row["Variable"]

    base_df = dataset_df_filter[
        (dataset_df_filter["Segment"] == seg) &
        (dataset_df_filter["Fiscal Year"] == recent_fy)
    ]

    mean_x = dataset_df_filter[var].mean()
    std_x = dataset_df_filter[var].std()

    scaled_val = (row["FutureValue"] - mean_x) / std_x

    scaled_future.append({
        "Segment": seg,
        "Variable": var,
        "ScaledFutureValue": scaled_val
    })

scaled_future_df = pd.DataFrame(scaled_future)
# st.dataframe(scaled_future_df)

predictions = []

for seg in beta_df["Segment"].unique():
    seg_betas = beta_df[beta_df["Segment"] == seg]
    seg_x = scaled_future_df[scaled_future_df["Segment"] == seg]

    y_hat = seg_betas["ScaledBeta0"].iloc[0]

    for _, b in seg_betas.iterrows():
        x_val = seg_x.loc[
            seg_x["Variable"] == b["Variable"],
            "ScaledFutureValue"
        ].values[0]

        y_hat += b["ScaledBeta"] * x_val

    predictions.append({
        "Segment": seg,
        "PredictedVolume": y_hat
    })

prediction_df = pd.DataFrame(predictions)

base_vol = (
    dataset_df_filter[dataset_df_filter["Fiscal Year"] == recent_fy]
    .groupby("Segment")["Volume"]
    .mean()
    .reset_index()
)

final_df = prediction_df.merge(base_vol, on="Segment", suffixes=("_Future", "_Base"))

final_df["VolumeGrowth_%"] = (
    (final_df["PredictedVolume"] - final_df["Volume"]) /
    final_df["Volume"]
) * 100

# st.dataframe(final_df[["Segment", "Volume", "PredictedVolume", "VolumeGrowth_%"]])

future_year_cols = [
    c for c in edited_growth_df.columns
    if "Growth Rate" in c
]

elasticity_vars = beta_df["Variable"].unique().tolist()

global_stats = {}

for seg in dataset_df["Segment"].unique():
    seg_df = dataset_df[dataset_df["Segment"] == seg]

    global_stats[seg] = {
        var: {
            "mean": seg_df[var].mean(),
            "std": seg_df[var].std()
        }
        for var in elasticity_vars
        if var in seg_df.columns
    }

    global_stats[seg]["Volume"] = seg_df["Volume"].mean()

base_fy = "FY25"

fy24_avg = (
    dataset_df_filter[dataset_df_filter["Fiscal Year"] == base_fy]
    .groupby("Segment", as_index=False)
    .mean(numeric_only=True)
)
# st.dataframe(fy24_avg)

target_years = ["A26", "A27", "A28","A29"]#
base_vol_map = dict(
    zip(base_vol["Segment"], base_vol["Volume"])
)


############################################################## Historical growth calculation ##############################################################

# -----------------------------------------
# Prepare dataset
# -----------------------------------------
dataset_df["date"] = pd.to_datetime(dataset_df["date"])

dataset_df["FiscalYear"] = (
    "FY" +
    (dataset_df["date"].dt.year + (dataset_df["date"].dt.month >= 7))
    .astype(str).str[-2:]
)

# -----------------------------------------
# Aggregate Volume by Segment & FY
# -----------------------------------------
hist_vol = (
    dataset_df
    .groupby(["Segment", "FiscalYear"])["Volume"]
    .mean()
    .reset_index()
)

# -----------------------------------------
# Sort FY correctly
# -----------------------------------------
hist_vol["FY_num"] = hist_vol["FiscalYear"].str.extract(r"(\d+)").astype(int)

hist_vol = hist_vol.sort_values(["Segment", "FY_num"])

# -----------------------------------------
# Calculate YoY Growth
# -----------------------------------------
hist_vol["VolumeGrowth_%"] = (
    hist_vol
    .groupby("Segment")["Volume"]
    .pct_change() * 100
)

# -----------------------------------------
# Rename column to match forecast_df
# -----------------------------------------
historical_growth_df = hist_vol.rename(
    columns={"Volume": "PredictedVolume"}
).drop(columns="FY_num")

# -----------------------------------------
# Result
# -----------------------------------------
st.subheader("📊 Historical Volume Growth")

st.dataframe(historical_growth_df, use_container_width=True)

# ############################################################## variable growth and contribution calculation ##############################################################
# ############################################################## Funtion to run forecast with edited growth ##############################################################

# growth_cols = [c for c in edited_growth_df.columns if "Growth Rate" in c]

# Base scenario (user edited)
base_growth_df = edited_growth_df.copy()

# # +10% growth scenario
# growth_up_df = edited_growth_df.copy()
# growth_up_df[growth_cols] = growth_up_df[growth_cols] * 1.10

# # -10% growth scenario
# growth_down_df = edited_growth_df.copy()
# growth_down_df[growth_cols] = growth_down_df[growth_cols] * 0.90

# def run_forecast(edited_growth_df):

#     all_forecasts = []
#     all_x_contributions = []

#     last_volume = base_vol_map.copy()

#     last_x_values = {}

#     for seg in fy24_avg["Segment"].unique():
#         last_x_values[seg] = {
#             var: fy24_avg.loc[fy24_avg["Segment"] == seg, var].values[0]
#             for var in elasticity_vars
#             if var in fy24_avg.columns
#         }

#     for fy in target_years:

#         growth_col = f"{fy} Growth Rate (%)"

#         for seg in last_x_values.keys():

#             new_x = {}

#             for var, prev_val in last_x_values[seg].items():

#                 g = edited_growth_df.loc[
#                     (edited_growth_df["Segment"] == seg) &
#                     (edited_growth_df["Variable"] == var),
#                     growth_col
#                 ]

#                 if g.empty:
#                     new_x[var] = prev_val
#                     continue

#                 growth = g.values[0] / 100
#                 new_x[var] = prev_val * (1 + growth)

#             y_hat = beta_df.loc[
#                 beta_df["Segment"] == seg,
#                 "ScaledBeta0"
#             ].iloc[0]

#             seg_betas = beta_df[beta_df["Segment"] == seg]

#             for _, b in seg_betas.iterrows():

#                 var = b["Variable"]

#                 mean_x = dataset_df[var].mean()
#                 std_x  = dataset_df[var].std()

#                 if std_x == 0 or pd.isna(std_x):
#                     continue

#                 x_scaled = (new_x[var] - mean_x) / std_x
#                 y_hat += b["ScaledBeta"] * x_scaled

#             prev_vol = last_volume[seg]
#             yoy_growth = ((y_hat - prev_vol) / prev_vol) * 100

#             all_forecasts.append({
#                 "FiscalYear": f"FY{fy[1:]}",
#                 "Segment": seg,
#                 "PredictedVolume": y_hat,
#                 "VolumeGrowth_%": yoy_growth
#             })

#             last_x_values[seg] = new_x
#             last_volume[seg] = y_hat

#     return pd.DataFrame(all_forecasts)

# forecast_base = run_forecast(base_growth_df)
# forecast_up10 = run_forecast(growth_up_df)
# forecast_down10 = run_forecast(growth_down_df)

# forecast_base["Scenario"] = "Base"
# forecast_up10["Scenario"] = "+10% Growth"
# forecast_down10["Scenario"] = "-10% Growth"

# forecast_df = pd.concat(
#     [forecast_base, forecast_up10, forecast_down10],
#     ignore_index=True
# )

# st.write("### Forecast Comparison")
# st.dataframe(forecast_df)

############################################################## variable growth and contribution calculation ##############################################################
############################################################## Funtion to run forecast with edited growth ##############################################################

growth_cols = [c for c in edited_growth_df.columns if "Growth Rate" in c]

beta_base = beta_df.copy()

beta_up10 = beta_df.copy()
beta_up10["ScaledBeta"] = beta_up10["ScaledBeta"] * 1.10

beta_down10 = beta_df.copy()
beta_down10["ScaledBeta"] = beta_down10["ScaledBeta"] * 0.90

def run_forecast(edited_growth_df, beta_df_input):

    all_forecasts = []

    last_volume = base_vol_map.copy()
    last_x_values = {}

    for seg in fy24_avg["Segment"].unique():
        last_x_values[seg] = {
            var: fy24_avg.loc[fy24_avg["Segment"] == seg, var].values[0]
            for var in elasticity_vars
            if var in fy24_avg.columns
        }

    for fy in target_years:

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

            y_hat = beta_df_input.loc[
                beta_df_input["Segment"] == seg,
                "ScaledBeta0"
            ].iloc[0]

            seg_betas = beta_df_input[beta_df_input["Segment"] == seg]

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

forecast_base = run_forecast(base_growth_df, beta_base)
forecast_up10 = run_forecast(base_growth_df, beta_up10)
forecast_down10 = run_forecast(base_growth_df, beta_down10)

forecast_base["Scenario"] = "Base Elasticity"
forecast_up10["Scenario"] = "+10% Elasticity"
forecast_down10["Scenario"] = "-10% Elasticity"

forecast_df = pd.concat(
    [forecast_base, forecast_up10, forecast_down10],
    ignore_index=True
)

st.write("### Forecast Comparison (Elasticity Scenarios)")
st.dataframe(forecast_df, use_container_width=True)


all_forecasts = []
all_x_contributions = []

# track last year's volume per segment
last_volume = base_vol_map.copy()

# store last computed X values per segment
last_x_values = {}

for seg in fy24_avg["Segment"].unique():
    last_x_values[seg] = {
        var: fy24_avg.loc[fy24_avg["Segment"] == seg, var].values[0]
        for var in elasticity_vars
        if var in fy24_avg.columns
    }

for fy in target_years:

    growth_col = f"{fy} Growth Rate (%)"

    for seg in last_x_values.keys():

        # ---- STEP 1: apply growth on last FY ----
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
            # st.write(new_x[var],prev_val,growth)

        # ---- STEP 2: scale using GLOBAL stats ----
        y_hat = beta_df.loc[
            beta_df["Segment"] == seg,
            "ScaledBeta0"
        ].iloc[0]
        # st.write(y_hat)
        seg_betas = beta_df[beta_df["Segment"] == seg]

        beta0 = seg_betas["ScaledBeta0"].iloc[0]

        seg_betas = beta_df[beta_df["Segment"] == seg]

        var_contributions = {}

        for _, b in seg_betas.iterrows():
            var = b["Variable"]

            mean_x = dataset_df[var].mean()
            std_x  = dataset_df[var].std()

            if std_x == 0 or pd.isna(std_x):
                continue

            x_scaled = (new_x[var] - mean_x) / std_x
            x_contrib = b["ScaledBeta"] * x_scaled
            beta = b['ScaledBeta']
            var_contributions[var] = x_contrib
            y_hat += b["ScaledBeta"] * x_scaled
            

        base_vol = fy_avg["Volume"]

        # ---- YoY growth calculation (THIS is the change) ----
        prev_vol = last_volume[seg]
        yoy_growth = ((y_hat - prev_vol) / prev_vol) * 100
        # st.write(f"Segment: {seg}, FY: {fy}, Predicted Volume: {y_hat:.2f}, previous vol: {prev_vol:.2f}, YoY Growth: {yoy_growth:.2f}%")

        all_forecasts.append({
            "FiscalYear": f"FY{fy[1:]}",
            "Segment": seg,
            "PredictedVolume": y_hat,
            "VolumeGrowth_%": yoy_growth
        })

        # ---------------------------------------------------
        # STEP 4: Store Contribution Data
        # ---------------------------------------------------
        total_prediction = y_hat if y_hat != 0 else 1

    

        # Variable contributions
        for var, contrib in var_contributions.items():

            contribution_pct = (contrib / total_prediction)

            all_x_contributions.append({
                "FiscalYear": f"FY{fy[1:]}",
                "Segment": seg,
                "Variable": var,
                # "beta": beta,
                # 'Scaled_var': x_scaled,
                "Contribution_Value": contrib,
                "Contribution_%": contribution_pct,
                "PredictedVolume": y_hat
            })

        # ---------------------------------------------------
        # STEP 5: Carry Forward Values
        # ---------------------------------------------------
        last_x_values[seg] = new_x
        last_volume[seg] = y_hat

        # # ---- STEP 3: carry forward X values ----
        # last_x_values[seg] = new_x

# forecast_df = pd.DataFrame(all_forecasts)
# st.write(forecast_df)
x_contribution_df = pd.DataFrame(all_x_contributions)
# st.write(x_contribution_df)
#-----------------------------------------
# Create Year Label (A26 format)
# -----------------------------------------
x_contribution_df["YearLabel"] = (
    "A" + x_contribution_df["FiscalYear"].str.replace("FY", "", regex=False)
)

# -----------------------------------------
# Pivot to Wide Format
# -----------------------------------------
wide_contribution_df = (
    x_contribution_df
    .pivot_table(
        index=["Segment", "Variable"],
        columns="YearLabel",
        values="Contribution_Value",
        aggfunc="sum"
    )
    .reset_index()
)

# -----------------------------------------
# Rename columns properly
# -----------------------------------------
wide_contribution_df.columns = [
    f"{col} Contribution" if col.startswith("A") else col
    for col in wide_contribution_df.columns
]



dataset_df_filter["Fiscal Year"] = (
    dataset_df_filter["Fiscal Year"]
    .str.replace("FY", "A", regex=False)
)
recent_fy = recent_fy.replace("FY", "A")




base_vol_df = (
    dataset_df_filter[dataset_df_filter["Fiscal Year"] == recent_fy.replace("FY", "A")]
    .groupby("Segment")["Volume"]
    .mean()
    .reset_index()
    .rename(columns={"Volume": "PredictedVolume"})
)
# st.write("#### A25 Volume")
st.dataframe(base_vol_df)
forecast_df["FiscalYear"] = (
    forecast_df["FiscalYear"]
    .str.replace("FY", "A", regex=False)
)


base_vol_df["FiscalYear"] = recent_fy.replace("FY", "A")
# base_vol_df["Scenario"] = "Base"
base_vol_df["Scenario"] = "Base Elasticity"


tmp = pd.concat(
    [
        base_vol_df[["FiscalYear", "Segment", "PredictedVolume","Scenario"]],
        forecast_df[["FiscalYear", "Segment", "PredictedVolume","Scenario"]]
    ],
    ignore_index=True
)

# ensure correct FY order
tmp["FY_num"] = tmp["FiscalYear"].str.extract(r"(\d+)").astype(int)

tmp = tmp.sort_values(["Segment", "FY_num"])

tmp["VolumeGrowth_%"] = (
    tmp
    .groupby("Segment")["PredictedVolume"]
    .pct_change() * 100
)

final_df = tmp[tmp["FiscalYear"] != recent_fy].drop(columns="FY_num")

final_df["FY_num"] = final_df["FiscalYear"].str.extract(r"(\d+)").astype(int)

forecast_years = sorted(
    final_df["FiscalYear"].unique(),
    key=lambda x: int(x[1:])
)

first_year = forecast_years[0]

editable_mask = final_df["FiscalYear"] == first_year

# st.write("##### A26 Model Forecast")

display_df = final_df.loc[
    editable_mask, 
    ["Segment", "FiscalYear", "VolumeGrowth_%"]
].copy()

display_df["VolumeGrowth_%"] = display_df["VolumeGrowth_%"].round(1)

# st.dataframe(display_df, use_container_width=True)

# st.write("##### A26 Growth rate edit:")
# editable_display_df = (
#     final_df.loc[editable_mask, ["Segment", "FiscalYear", "VolumeGrowth_%"]]
#     .copy()
# )

# editable_display_df["VolumeGrowth_%"] = editable_display_df["VolumeGrowth_%"].round(1)

# edited_input = st.data_editor(
#     editable_display_df,
#     key="editable_fy26_growth"
# )

for _, row in final_df.iterrows():

    seg = row["Segment"]
    edited_growth = row["VolumeGrowth_%"] / 100

    # Base (recent actual)
    base_volume = base_vol_df.loc[
        base_vol_df["Segment"] == seg,
        "PredictedVolume"
    ].values[0]

    # -------------------------
    # 1️⃣ Recalculate FY26 Volume
    # -------------------------
    new_fy26_volume = base_volume * (1 + edited_growth)

    final_df.loc[
        (final_df["Segment"] == seg) &
        (final_df["FiscalYear"] == first_year),
        "PredictedVolume"
    ] = new_fy26_volume

    final_df.loc[
        (final_df["Segment"] == seg) &
        (final_df["FiscalYear"] == first_year),
        "VolumeGrowth_%"
    ] = edited_growth * 100

    # -------------------------
    # 2️⃣ Recalculate Growth for Remaining Years
    # -------------------------
    for i in range(1, len(forecast_years)):

        prev_year = forecast_years[i - 1]
        curr_year = forecast_years[i]

        prev_vol = final_df.loc[
            (final_df["Segment"] == seg) &
            (final_df["FiscalYear"] == prev_year),
            "PredictedVolume"
        ].values[0]

        curr_vol = final_df.loc[
            (final_df["Segment"] == seg) &
            (final_df["FiscalYear"] == curr_year),
            "PredictedVolume"
        ].values[0]

        new_growth = ((curr_vol - prev_vol) / prev_vol) * 100

        final_df.loc[
            (final_df["Segment"] == seg) &
            (final_df["FiscalYear"] == curr_year),
            "VolumeGrowth_%"
        ] = new_growth

final_df.drop(columns="FY_num", inplace=True)

display_df = final_df.sort_values(["Segment", "FiscalYear"]).copy()

num_cols = display_df.select_dtypes(include="number").columns
display_df[num_cols] = display_df[num_cols].round(1)

st.subheader("📈 Forecasted Volumes & Growth Rates")
st.dataframe(display_df, use_container_width=True)


final_growth_df = final_df.copy()

# final_growth_df["FY_short"] = final_growth_df["FiscalYear"].str.replace("FY", "A")
final_growth_df["YearLabel"] = final_growth_df["FiscalYear"]
final_growth_df["growth_dec"] = final_growth_df["VolumeGrowth_%"] / 100

# pivot_growth = (
#     final_growth_df
#     .pivot(index="Segment", columns="YearLabel", values="growth_dec")
#     .reset_index()
# )

pivot_growth = (
    final_growth_df
    .pivot_table(
        index=["Scenario", "Segment"],
        columns="YearLabel",
        values="growth_dec",
        aggfunc="mean"
    )
    .reset_index()
)

# st.subheader("📊 CAGR Settings")
with st.expander("📊 CAGR Settings"):

    year_cols = sorted(
        [c for c in pivot_growth.columns if c.startswith("A")],
        key=lambda x: int(x[1:])
    )

    max_years = len(year_cols)

    cagr_years = st.slider(
        "Select number of years for CAGR",
        min_value=2,
        max_value=max_years,
        value=min(3, max_years)
    )

selected_years = year_cols[-cagr_years:]

import numpy as np

pivot_growth[f"{cagr_years}-yr CAGR"] = (
    np.prod(
        1 + pivot_growth[selected_years],
        axis=1
    ) ** (1 / cagr_years) - 1
)

display_cols = selected_years + [f"{cagr_years}-yr CAGR"]

for col in display_cols:
    pivot_growth[col] = (pivot_growth[col] * 100).round(1)

final_cagr_table = (
    pivot_growth[["Scenario", "Segment"] + display_cols]
    .set_index(["Scenario", "Segment"])
)

st.subheader("📈 Volume Forecast Growth Summary")

st.dataframe(
    final_cagr_table.style.format(
        {col: "{:.1f} %" for col in display_cols}
    ),
    use_container_width=True
)


################################################################# Historical growth calculation ##############################################################

# -----------------------------------------
# Prepare dataset
# -----------------------------------------
dataset_df["date"] = pd.to_datetime(dataset_df["date"])

dataset_df["FiscalYear"] = (
    "FY" +
    (dataset_df["date"].dt.year + (dataset_df["date"].dt.month >= 7))
    .astype(str).str[-2:]
)

dataset_df["FiscalYear"] = dataset_df["FiscalYear"].str.replace("FY", "A")

hist_vol = (
    dataset_df
    .groupby(["Segment", "FiscalYear"])["Volume"]
    .mean()
    .reset_index()
)

hist_vol["FY_num"] = hist_vol["FiscalYear"].str.extract(r"(\d+)").astype(int)

hist_vol = hist_vol.sort_values(["Segment", "FY_num"])

hist_vol["VolumeGrowth_%"] = (
    hist_vol
    .groupby("Segment")["Volume"]
    .pct_change() * 100
)

historical_df = hist_vol.rename(
    columns={"Volume": "PredictedVolume"}
)

historical_df = historical_df[
    historical_df["FY_num"] <= 25
]

historical_df["Scenario"] = "Historical"

historical_df = historical_df.drop(columns="FY_num")

combined_forecast_df = pd.concat(
    [historical_df, forecast_df],
    ignore_index=True
)

st.dataframe(combined_forecast_df, use_container_width=True)

scenarios = ["Base Elasticity", "+10% Elasticity", "-10% Elasticity"]

hist_expanded = pd.concat(
    [
        historical_df.assign(Scenario=sc)
        for sc in scenarios
    ],
    ignore_index=True
)

plot_df = pd.concat(
    [hist_expanded, forecast_df],
    ignore_index=True
)

plot_df["FY_num"] = plot_df["FiscalYear"].str.extract(r"(\d+)").astype(int)

plot_df = plot_df.sort_values(["Scenario", "Segment", "FY_num"])

# import plotly.express as px

# fig = px.line(
#     plot_df,
#     x="FiscalYear",
#     y="VolumeGrowth_%",
#     color="Scenario",
#     markers=True,
#     line_dash="Scenario",
#     facet_col="Segment"
# )

# fig.update_layout(
#     title="Historical + Forecast Growth Scenarios",
#     yaxis_title="Growth Rate (%)",
#     xaxis_title="Fiscal Year"
# )

# st.plotly_chart(fig, use_container_width=True)

from plotly.subplots import make_subplots
import plotly.graph_objects as go

fig = make_subplots(specs=[[{"secondary_y": True}]])

segments = plot_df["Segment"].unique()

for sc in plot_df["Scenario"].unique():

    df_sc = plot_df[plot_df["Scenario"] == sc]

    # Growth rate line
    fig.add_trace(
        go.Scatter(
            x=df_sc["FiscalYear"],
            y=df_sc["VolumeGrowth_%"],
            mode="lines+markers",
            name=f"{sc} Growth",
        ),
        secondary_y=False
    )

    # Volume line
    fig.add_trace(
        go.Scatter(
            x=df_sc["FiscalYear"],
            y=df_sc["PredictedVolume"],
            mode="lines+markers",
            name=f"{sc} Volume",
            line=dict(dash="dot")
        ),
        secondary_y=True
    )

fig.update_layout(
    title="Historical + Forecast Growth & Volume Scenarios",
    xaxis_title="Fiscal Year",
    legend_title="Scenario"
)

fig.update_yaxes(
    title_text="Growth Rate (%)",
    secondary_y=False
)

fig.update_yaxes(
    title_text="Volume",
    secondary_y=True
)

st.plotly_chart(fig, use_container_width=True)

##################### Waterfall Charts #########################

final_df = final_df[final_df["Scenario"] == "Base Elasticity"].copy()


st.subheader("🎯 Waterfall Chart")
with st.expander("🎯 Waterfall Configuration"):

    fy_list = sorted(
        final_df["FiscalYear"].unique(),
        key=lambda x: int(x.replace("A", ""))
    )

    col1, col2 = st.columns(2)

    with col1:
        start_fy = st.selectbox(
            "Select Start Fiscal Year",
            fy_list,
            index=0
        )

        # st.write("##### 🧩 Variable Selection")

        exclude_vars = ["Seasonality", "Trend"]

        all_vars = sorted(
            v for v in elasticity_df["Variable"].unique().tolist()
            if v not in exclude_vars
        )

        selected_vars = st.multiselect(
            "Select variables to include in waterfall",
            options=all_vars,
            default=all_vars  # keep all selected by default
        )

    with col2:
        end_fy = st.selectbox(
            "Select End Fiscal Year",
            fy_list,
            index=len(fy_list) - 1
        )

        VARIABLE_SCALE = st.slider(
            "Emphasize variable contribution",
            1.0, 3.0, 1.5, 0.1
        )

st.write(f"Selected period: {start_fy} to {end_fy}")
start_year = int(start_fy.replace("A", ""))
end_year = int(end_fy.replace("A", ""))

if end_year <= start_year:
    st.error("End Fiscal Year must be greater than Start Fiscal Year")
    st.stop()

selected_years = [
    f"A{y}"
    for y in range(start_year + 1, end_year + 1)
]

# st.subheader("🧩 Variable Selection")

# all_vars = sorted(
#     elasticity_df["Variable"].unique().tolist()
# )

# selected_vars = st.multiselect(
#     "Select variables to include in waterfall",
#     options=all_vars,
#     default=all_vars  # keep all selected by default
# )

if not selected_vars:
    st.warning("Please select at least one variable")
    st.stop()



contrib_rows = []

for _, row in edited_growth_df.iterrows():
    seg = row["Segment"]
    var = row["Variable"]

    # 🔹 NEW: variable filter
    if var not in selected_vars:
        continue

    elasticity = elasticity_df.loc[
        (elasticity_df["Segment"] == seg) &
        (elasticity_df["Variable"] == var),
        "Elasticity"
    ]

    if elasticity.empty:
        continue

    elasticity = elasticity.values[0]

    for fy in selected_years:   # e.g. ["A26", "A27", "A28"]
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
# st.dataframe(contrib_df)

total_contrib = (
    contrib_df
    .groupby(["Segment", "Variable"], as_index=False)
    ["Contribution"]
    .sum()
)

# st.dataframe(total_contrib)

start_vol = (
    final_df[final_df["FiscalYear"] == start_fy]
    .set_index("Segment")["PredictedVolume"]
)

end_vol = (
    final_df[final_df["FiscalYear"] == end_fy]
    .set_index("Segment")["PredictedVolume"]
)

# st.write(start_vol,end_vol)

wf_rows = []



segments = sorted(final_df["Segment"].unique())

# selected_segment = st.selectbox(
#     "Select Segment",
#     segments
# )


# --- Start FY ---
wf_rows.append({
    "Label": start_fy,
    "Value": start_vol[seg],
    "Type": "start"
})

# --- Variables ---
for _, row in total_contrib[total_contrib["Segment"] == seg].iterrows():
    wf_rows.append({
        "Label": row["Variable"],
        "Value": row["Contribution"],
        "Type": "variable"
    })

# --- End FY ---
wf_rows.append({
    "Label": end_fy,
    "Value": end_vol[seg],
    "Type": "end"
})

wf_df = pd.DataFrame(wf_rows)

start_volume = start_vol[seg]
end_volume = end_vol[seg]

total_variable_contrib = wf_df.loc[
    wf_df["Type"] == "variable", "Value"
].sum()
# st.dataframe(wf_df)
# st.write(total_variable_contrib)

wf_df["Pct_Normalized"] = np.where(
    wf_df["Type"] == "variable",
    wf_df["Value"] / total_variable_contrib,
    wf_df["Value"] / start_volume
)

start_pct = 1.0
end_pct = end_volume / start_volume
delta_pct = end_pct - start_pct

wf_df["Waterfall_Value"] = np.where(
    wf_df["Type"] == "variable",
    wf_df["Pct_Normalized"] * delta_pct,
    wf_df["Pct_Normalized"]
)

# st.dataframe(wf_df)


# VARIABLE_SCALE = st.slider(
#     "Emphasize variable contribution",
#     1.0, 3.0, 2.0, 0.1
# )

START_END_SCALE = 0.25   # shrink anchors
# VARIABLE_SCALE = 2.0    # amplify contributions

wf_df["DisplayValue"] = np.where(
    wf_df["Type"].isin(["start", "end"]),
    wf_df["Waterfall_Value"] * START_END_SCALE,
    wf_df["Waterfall_Value"] * VARIABLE_SCALE
)

wf_df["LabelText"] = wf_df["Waterfall_Value"].apply(
    lambda x: f"{x*100:.1f}%"
)

y_max = (wf_df["DisplayValue"] * 100).max()

import plotly.graph_objects as go

fig = go.Figure(go.Waterfall(
    orientation="v",
    measure=[
        "absolute" if t == "start"
        else "total" if t == "end"
        else "relative"
        for t in wf_df["Type"]
    ],
    x=wf_df["Label"],
    y=wf_df["DisplayValue"] * 150,   # scaled for display
    text=wf_df["LabelText"],
    textposition="outside",
    increasing={"marker": {"color": "#2ca02c"}},
    decreasing={"marker": {"color": "#d62728"}},
    totals={"marker": {"color": "#1f77b4"}}
))

fig.update_layout(
    title="Volume Growth Waterfall (Elasticity × Growth)",
    yaxis_title="Contribution (scaled for visibility)",
    showlegend=False,
    height=650,
    yaxis=dict(
        fixedrange=True,
        zeroline=True
    )
)
fig.update_layout(
    yaxis=dict(
        range=[0, y_max * 4.25],  # 👈 25% headroom
        fixedrange=True,
        zeroline=True
    )
)
fig.update_layout(
    xaxis=dict(
        showline=True,
        zeroline=False,
        showgrid=False
    ),
    yaxis=dict(
        showline=False,
        zeroline=False,
        showgrid=True
    )
)
fig.update_layout(
    yaxis=dict(
        showticklabels=False
    )
)


st.plotly_chart(fig, use_container_width=True, key="waterfall")

# Create export-ready dataframe
export_df = wf_df[[
    "Label",
    "Type",
    "Waterfall_Value"
]].copy()

# Force correct ordering index
export_df["Order"] = range(1, len(export_df) + 1)

# Reorder columns
export_df = export_df[["Order", "Label", "Type", "Waterfall_Value"]]

import io

buffer = io.BytesIO()
export_df.to_excel(buffer, index=False, engine="xlsxwriter")
buffer.seek(0)

st.download_button(
    label="⬇ Download Waterfall Template",
    data=buffer,
    file_name=f"waterfall_template_{valid_segments}.xlsx",
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)

uploaded_wf = st.file_uploader(
    "Upload Edited Waterfall File",
    type=["xlsx"]
)

if uploaded_wf:

    edited_df = pd.read_excel(uploaded_wf)

    required_cols = {"Order", "Label", "Type", "Waterfall_Value"}

    if not required_cols.issubset(edited_df.columns):
        st.error("Uploaded file does not match required format.")
    else:

        # Sort by user-defined order
        edited_df = edited_df.sort_values("Order")

        wf_df = edited_df.copy()

START_END_SCALE = 0.25
VARIABLE_SCALE = 1.5

wf_df["DisplayValue"] = np.where(
    wf_df["Type"].isin(["start", "end"]),
    wf_df["Waterfall_Value"] * START_END_SCALE,
    wf_df["Waterfall_Value"] * VARIABLE_SCALE
)

wf_df["LabelText"] = wf_df["Waterfall_Value"].apply(
    lambda x: f"{x*100:.1f}%"
)

y_max = (wf_df["DisplayValue"] * 100).max()

import plotly.graph_objects as go

fig = go.Figure(go.Waterfall(
    orientation="v",
    measure=[
        "absolute" if t == "start"
        else "total" if t == "end"
        else "relative"
        for t in wf_df["Type"]
    ],
    x=wf_df["Label"],
    y=wf_df["DisplayValue"] * 150,   # scaled for display
    text=wf_df["LabelText"],
    textposition="outside",
    increasing={"marker": {"color": "#2ca02c"}},
    decreasing={"marker": {"color": "#d62728"}},
    totals={"marker": {"color": "#1f77b4"}}
))

fig.update_layout(
    title="Volume Growth Waterfall (Elasticity × Growth)",
    yaxis_title="Contribution (scaled for visibility)",
    showlegend=False,
    height=650,
    yaxis=dict(
        fixedrange=True,
        zeroline=True
    )
)
fig.update_layout(
    yaxis=dict(
        range=[0, y_max * 4.25],  # 👈 25% headroom
        fixedrange=True,
        zeroline=True
    )
)
fig.update_layout(
    xaxis=dict(
        showline=True,
        zeroline=False,
        showgrid=False
    ),
    yaxis=dict(
        showline=False,
        zeroline=False,
        showgrid=True
    )
)
fig.update_layout(
    yaxis=dict(
        showticklabels=False
    )
)


st.plotly_chart(fig, use_container_width=True, key="updated waterfall")