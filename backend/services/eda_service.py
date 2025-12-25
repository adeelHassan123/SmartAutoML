import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List

from .dataset_service import get_dataset
from ..ml_core import Module2

logger = logging.getLogger(__name__)

def get_eda_data(dataset_id: str) -> Dict[str, Any]:
    """
    Generate EDA data for the given dataset.
    Returns dictionary matching EdaResponse schema.
    """
    try:
        df = get_dataset(dataset_id)
        
        # 1. Missing Values
        missing_df = Module2.missing_value_analysis(df)
        missing_dict = missing_df['missing_pct'].to_dict() if not missing_df.empty else {}

        # 2. Correlation Matrix
        corr_df = Module2.correlation_matrix(df)
        # Handle NaN/Inf in correlation matrix (JSON compliant)
        corr_df = corr_df.fillna(0)
        correlation_dict = corr_df.to_dict() if not corr_df.empty else {}

        # 3. Outliers (IQR)
        outliers_iqr_df = Module2.outlier_summary_iqr(df)
        outliers_iqr = outliers_iqr_df.to_dict('records') if not outliers_iqr_df.empty else []

        # 4. Outliers (Z-score)
        outliers_zscore_df = Module2.outlier_summary_zscore(df)
        outliers_zscore = outliers_zscore_df.to_dict('records') if not outliers_zscore_df.empty else []

        # 5. Numerical Distributions (Histograms)
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        numerical_distributions = {}
        for col in numeric_cols:
            try:
                series = df[col].dropna()
                if series.empty:
                    continue
                # Simple histogram with 20 bins
                counts, bin_edges = np.histogram(series, bins=min(20, len(series.unique()) + 1 if len(series.unique()) < 20 else 20))
                numerical_distributions[col] = {
                    'counts': counts.tolist(),
                    'bins': bin_edges.tolist()
                }
            except Exception as e:
                logger.warning(f"Failed to compute histogram for {col}: {e}")

        # 6. Categorical Distributions (Value Counts)
        cat_cols = df.select_dtypes(exclude=['number']).columns.tolist()
        categorical_distributions = {}
        for col in cat_cols:
            try:
                # Top 10 categories
                val_counts = df[col].value_counts(dropna=False).head(10)
                categorical_distributions[col] = {
                    'labels': [str(x) for x in val_counts.index],
                    'counts': val_counts.values.tolist()
                }
            except Exception as e:
                logger.warning(f"Failed to compute value counts for {col}: {e}")

        return {
            "missing": missing_dict,
            "correlation": correlation_dict,
            "outliers_iqr": outliers_iqr,
            "outliers_zscore": outliers_zscore,
            "numerical_distributions": numerical_distributions,
            "categorical_distributions": categorical_distributions
        }

    except Exception as e:
        logger.error(f"Error generating EDA data: {e}")
        raise ValueError(str(e))
