import streamlit as st
import pandas as pd

st.title("CSV Upload ML App")

uploaded_file = st.file_uploader("Upload your CSV file", type=["csv"])

if uploaded_file is not None:
    df = pd.read_csv(uploaded_file)
    st.write("Preview of your data:")
    st.dataframe(df)

    # Example ML placeholder
    st.write("Running model...")
    # your ML code here
