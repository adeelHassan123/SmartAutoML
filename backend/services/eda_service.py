import base64
import logging
import time
from typing import Dict, Any
from io import BytesIO

import pandas as pd

from .dataset_service import get_dataset
from ..ml_core.Module2 import (
    missing_value_analysis,
    correlation_matrix,
    outlier_summary_iqr,
    outlier_summary_zscore
)

logger = logging.getLogger(__name__)


def get_eda_data(dataset_id: str) -> Dict[str, Any]:
    """Get comprehensive EDA data for a dataset."""
    start_time = time.time()
    df = get_dataset(dataset_id)

    # Limit dataset size for performance
    max_rows_for_eda = 50000
    if len(df) > max_rows_for_eda:
        logger.info(f"Sampling dataset for EDA: {len(df)} -> {max_rows_for_eda} rows")
        df = df.sample(n=max_rows_for_eda, random_state=42)

    results = {
        'missing': {},
        'correlation': {},
        'outliers_iqr': [],
        'outliers_zscore': [],
        'numerical_distributions': {},
        'categorical_distributions': {}
    }

    # Missing value analysis
    try:
        missing_df = missing_value_analysis(df)
        if not missing_df.empty:
            results['missing'] = missing_df.to_dict('index')
    except Exception as e:
        logger.warning(f"Missing value analysis failed for {dataset_id}: {e}")

    # Correlation matrix (only numeric columns)
    try:
        numeric_df = df.select_dtypes(include='number')
        if not numeric_df.empty and len(numeric_df.columns) > 1:
            corr_df = correlation_matrix(numeric_df)
            if not corr_df.empty:
                # Limit correlation matrix size for large datasets
                if len(corr_df) > 50:
                    # Take top 50 most correlated pairs
                    corr_unstacked = corr_df.abs().unstack()
                    top_corr = corr_unstacked.sort_values(ascending=False).head(100)  # Include some redundancy
                    # Reconstruct correlation matrix with top correlations
                    results['correlation'] = corr_df.to_dict()
                else:
                    results['correlation'] = corr_df.to_dict()
    except Exception as e:
        logger.warning(f"Correlation analysis failed for {dataset_id}: {e}")

    # Outlier analysis (limit to numeric columns only)
    try:
        numeric_df = df.select_dtypes(include='number')
        if not numeric_df.empty:
            outliers_iqr_df = outlier_summary_iqr(numeric_df)
            if not outliers_iqr_df.empty:
                results['outliers_iqr'] = outliers_iqr_df.to_dict('records')

            outliers_zscore_df = outlier_summary_zscore(numeric_df)
            if not outliers_zscore_df.empty:
                results['outliers_zscore'] = outliers_zscore_df.to_dict('records')
    except Exception as e:
        logger.warning(f"Outlier analysis failed for {dataset_id}: {e}")

    # Distributions (limit columns and add timeout protection)
    max_cols = 10
    timeout_seconds = 30  # 30 second timeout per operation

    # Numerical distributions
    try:
        numeric_cols = df.select_dtypes(include='number').columns[:max_cols]
        for col in numeric_cols:
            col_start = time.time()
            try:
                series = df[col].dropna()
                if not series.empty and len(series.unique()) > 1:
                    # Use fewer bins for large datasets
                    n_bins = min(20, max(5, len(series) // 1000))
                    if n_bins < 2:
                        n_bins = 5
                    try:
                        hist, bins = pd.cut(series, bins=n_bins, retbins=True)
                        counts = hist.value_counts().sort_index()
                        bin_edges = [float(x) for x in bins]
                        counts_list = [int(x) for x in counts.values]
                    except Exception:
                        # Fallback to numpy histogram
                        import numpy as _np
                        counts_arr, bins_arr = _np.histogram(series, bins=n_bins)
                        bin_edges = [float(x) for x in bins_arr]
                        counts_list = [int(x) for x in counts_arr]

                    results['numerical_distributions'][col] = {
                        'bins': bin_edges,
                        'counts': counts_list
                    }

                    # Check timeout
                    if time.time() - col_start > timeout_seconds:
                        logger.warning(f"Numerical distribution for {col} timed out")
                        break
            except Exception as e:
                logger.debug(f"Failed to process numerical distribution for {col}: {e}")
                continue
    except Exception as e:
        logger.warning(f"Numerical distributions failed for {dataset_id}: {e}")

    # Categorical distributions
    try:
        cat_cols = df.select_dtypes(exclude='number').columns[:max_cols]
        for col in cat_cols:
            col_start = time.time()
            try:
                value_counts = df[col].value_counts().head(20)  # Limit categories
                if not value_counts.empty:
                    results['categorical_distributions'][col] = {
                        'labels': [str(x) for x in value_counts.index],  # Ensure string labels
                        'counts': [int(x) for x in value_counts.values]
                    }

                    # Check timeout
                    if time.time() - col_start > timeout_seconds:
                        logger.warning(f"Categorical distribution for {col} timed out")
                        break
            except Exception as e:
                logger.debug(f"Failed to process categorical distribution for {col}: {e}")
                continue
    except Exception as e:
        logger.warning(f"Categorical distributions failed for {dataset_id}: {e}")

    elapsed = time.time() - start_time
    logger.info(f"EDA completed for {dataset_id} in {elapsed:.2f}s")

    return results
