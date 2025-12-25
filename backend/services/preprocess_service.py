import logging
from typing import Dict, Any

import pandas as pd

from .dataset_service import get_dataset
from ..ml_core.Module4 import apply_outlier_handling, build_preprocessor
from ..schemas.models import PreprocessRequest

logger = logging.getLogger(__name__)

# In-memory storage for preprocessed data
preprocessed: Dict[str, Dict[str, Any]] = {}


def apply_preprocessing(dataset_id: str, request: PreprocessRequest) -> Dict[str, Any]:
    """Apply preprocessing pipeline to dataset."""
    try:
        df = get_dataset(dataset_id)

        # Validate target column
        if not request.target_column or request.target_column not in df.columns:
            raise ValueError(f"Target column '{request.target_column}' not found in dataset")

        # Store original stats for diff
        original_missing = int(df.isnull().sum().sum())
        original_shape = df.shape

        # Apply outlier handling first
        df_cleaned, _ = apply_outlier_handling(
            df,
            method=request.outlier_method,
            action=_map_outlier_action(request.outlier_action),
            exclude_columns=[request.target_column]
        )

        # Ensure target column still present
        if request.target_column not in df_cleaned.columns:
            raise ValueError("Target column removed during outlier handling")

        # Prepare data for preprocessing (exclude target column)
        X = df_cleaned.drop(columns=[request.target_column])
        y = df_cleaned[request.target_column]

        if X.shape[1] == 0:
            raise ValueError("No feature columns available after preprocessing")

        # Build and fit preprocessor
        preprocessor = build_preprocessor(
            X,
            numeric_impute=request.numeric_impute,
            categorical_impute=request.categorical_impute,
            numeric_fill_value=request.numeric_fill_value,
            categorical_fill_value=request.categorical_fill_value,
            scaling=request.scaling,
            encoding=request.encoding
        )

        # Fit and transform
        X_processed = preprocessor.fit_transform(X)

        # Determine column names safely
        try:
            cols = list(preprocessor.get_feature_names_out())
        except Exception:
            cols = [f"f_{i}" for i in range(X_processed.shape[1])]

        df_processed = pd.DataFrame(X_processed, columns=cols)
        df_processed[request.target_column] = y.values

        # Store preprocessed data
        preprocessed[dataset_id] = {
            'data': df_processed,
            'preprocessor': preprocessor,
            'target_column': request.target_column,
            'test_size': request.test_size
        }

        # Create preview (first 10 rows)
        preview = df_processed.head(10).to_dict('records')

        # Create diff data
        processed_missing = int(df_processed.isnull().sum().sum())
        processed_shape = df_processed.shape

        diff_data = {
            'original_missing': original_missing,
            'processed_missing': processed_missing,
            'original_shape': original_shape,
            'processed_shape': processed_shape,
            'missing_reduction': float(original_missing - processed_missing),
            'shape_change': (processed_shape[0] - original_shape[0], processed_shape[1] - original_shape[1])
        }

        return {
            'message': 'Preprocessing completed successfully',
            'preview': preview,
            'diff_data': diff_data
        }

    except Exception as e:
        import traceback
        logger.error(f"Preprocessing failed for {dataset_id}: {e}\n{traceback.format_exc()}")
        raise ValueError(f"Preprocessing failed: {str(e)}")

# Helper to map API actions to internal Module4 actions
def _map_outlier_action(action: str) -> str:
    if action == 'remove':
        return 'remove_rows'
    if action == 'capping':
        return 'cap_iqr'
    return action


def get_preprocessed_data(dataset_id: str) -> Dict[str, Any]:
    """Get preprocessed data for a dataset."""
    if dataset_id not in preprocessed:
        raise ValueError(f"No preprocessed data found for dataset {dataset_id}")

    return preprocessed[dataset_id]
