import streamlit as st
import pandas as pd

st.set_page_config(page_title="CSV Analyzer", layout="wide")
st.title("📊 CSV Upload & Metadata Viewer")

common_encodings = ["utf-8", "latin1", "cp1252", "ISO-8859-1"]
uploaded_file = st.file_uploader("Upload your CSV file", type=["csv"])

if uploaded_file is not None:

    # Try multiple encodings
    df = None
    for enc in common_encodings:
        try:
            df = pd.read_csv(uploaded_file, encoding=enc)
            break
        except:
            df = None

    if df is None:
        st.error("Could not decode file with common encodings. Try saving as UTF-8.")
        st.stop()

    # Show preview 
    st.subheader("📝 Data Preview")
    st.dataframe(df.head(), use_container_width=True)

    # Basic Metadata
    rows, cols = df.shape

    col1, col2, col3 = st.columns(3)
    col1.metric("Rows", rows)
    col2.metric("Columns", cols)
    col3.metric("Memory Usage (KB)", f"{df.memory_usage().sum() / 1024:.2f}")

    # Display Column Types
    st.subheader("🔤 Column Data Types")
    st.dataframe(pd.DataFrame(df.dtypes, columns=["dtype"]))


    # Show Statistics for numeric columns
    numeric_df = df.select_dtypes(include=["number"])
    if not numeric_df.empty:
        st.subheader("📈 Summary Statistics (Numerical Columns)")
        st.dataframe(numeric_df.describe(), use_container_width=True)
    else:
        st.info("No numerical columns found.")



    # Class Distribution (only for categorical columns)
    categorical_df = df.select_dtypes(exclude=["number"])
    st.subheader("🎯 Class Distribution (Optional)")
    target_column = st.selectbox("Select target column (if classification task)", ["None", "All"] + categorical_df.columns.tolist())

    if target_column == "All":
        for col in categorical_df.columns:
            st.write(f"### 🔸 {col}")
            value_counts = df[col].value_counts()

            # Display table
            st.write(value_counts.to_frame("count"))

            # Chart
            st.bar_chart(value_counts)
        
    elif target_column != "None":
        st.write(f"Class distribution for **{target_column}**:")
        value_counts = df[target_column].value_counts()
        st.write(value_counts.to_frame("count"))
        
        st.bar_chart(df[target_column].value_counts())
