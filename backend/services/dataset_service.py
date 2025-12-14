import io
import uuid
import logging
from typing import Dict, Any

import pandas as pd
import os
from pathlib import Path

from ..ml_core.Module1 import infer_target_candidates

logger = logging.getLogger(__name__)


# In-memory storage (in production, use database)
datasets: Dict[str, pd.DataFrame] = {}
last_access: Dict[str, float] = {}

# Simple on-disk persistence for uploaded datasets to survive restarts
ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / 'data' / 'datasets'
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load_dataset_from_disk(dataset_id: str) -> pd.DataFrame | None:
    file_path = DATA_DIR / f"{dataset_id}.csv"
    if not file_path.exists():
        return None
    try:
        df = pd.read_csv(file_path, encoding='utf-8')
        return df
    except Exception:
        try:
            df = pd.read_csv(file_path, encoding='latin1')
            return df
        except Exception as e:
            logger.error(f"Failed to load dataset from disk {file_path}: {e}")
            return None


def upload_dataset(file_bytes: bytes) -> tuple[str, list[str]]:
    """
    Upload and store a CSV dataset.

    Args:
        file_bytes: Raw CSV file bytes

    Returns:
        Tuple of (dataset_id, target_candidates)

    Raises:
        ValueError: If the CSV is malformed or the dataset is invalid
    """
    try:
        # Basic validation
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Empty file provided")

        # Read CSV with error handling
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding='utf-8')
        except UnicodeDecodeError:
            # Try with different encoding
            df = pd.read_csv(io.BytesIO(file_bytes), encoding='latin1')
        except Exception as e:
            raise ValueError(f"Failed to parse CSV: {str(e)}")

        # Validate DataFrame
        if df.empty:
            raise ValueError("Dataset is empty (no rows)")

        if len(df.columns) == 0:
            raise ValueError("Dataset has no columns")

        # Check for reasonable dataset size
        max_rows = 100000  # 100k rows
        max_cols = 100     # 100 columns

        if len(df) > max_rows:
            raise ValueError(f"Dataset too large: {len(df)} rows (max: {max_rows})")

        if len(df.columns) > max_cols:
            raise ValueError(f"Dataset too wide: {len(df.columns)} columns (max: {max_cols})")

        # Check for duplicate column names
        if df.columns.duplicated().any():
            raise ValueError("Dataset contains duplicate column names")

        # Basic data quality checks
        if df.isnull().all().all():
            raise ValueError("Dataset contains only null values")

        # Check if we have at least some non-null data
        try:
            non_null_ratio = df.notna().sum().sum() / (len(df) * len(df.columns))
        except Exception:
            non_null_ratio = 0.0

        if non_null_ratio < 0.1:  # Less than 10% non-null values
            raise ValueError(f"Insufficient non-null data: {non_null_ratio:.2f}")

        # Generate unique ID
        dataset_id = str(uuid.uuid4())

        # Store dataset
        datasets[dataset_id] = df

        # Persist original CSV to disk for resilience
        try:
            file_path = DATA_DIR / f"{dataset_id}.csv"
            with open(file_path, 'wb') as f:
                f.write(file_bytes)
        except Exception as e:
            logger.warning(f"Failed to persist dataset {dataset_id} to disk: {e}")

        # Update last access time
        import time
        last_access[dataset_id] = time.time()

        # Infer target candidates
        try:
            target_candidates = infer_target_candidates(df)
        except Exception as e:
            logger.warning(f"Failed to infer target candidates for {dataset_id}: {e}")
            # Provide basic fallback
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            target_candidates = numeric_cols[:5] if numeric_cols else df.columns.tolist()[:5]

        logger.info(f"Dataset uploaded: {dataset_id}, shape: {df.shape}, size: {len(file_bytes)} bytes")
        return dataset_id, target_candidates

    except Exception as e:
        logger.error(f"Dataset upload failed: {e}")
        raise


def get_dataset(dataset_id: str) -> pd.DataFrame:
    """Get dataset by ID, updating access time."""
    if not dataset_id or not isinstance(dataset_id, str):
        raise ValueError("Invalid dataset ID")

    # Try in-memory first
    if dataset_id not in datasets:
        # Attempt to load from disk if available
        df_disk = _load_dataset_from_disk(dataset_id)
        if df_disk is not None:
            datasets[dataset_id] = df_disk
        else:
            raise ValueError(f"Dataset {dataset_id} not found")

    # Update last access time
    import time
    last_access[dataset_id] = time.time()

    df = datasets[dataset_id]

    # Additional validation - ensure DataFrame is still valid
    if df is None or df.empty:
        logger.error(f"Corrupted dataset found: {dataset_id}")
        # Remove corrupted entry
        datasets.pop(dataset_id, None)
        last_access.pop(dataset_id, None)
        raise ValueError(f"Dataset {dataset_id} is corrupted or empty")

    return df


def get_dataset_summary(dataset_id: str) -> Dict[str, Any]:
    """Get dataset summary statistics."""
    df = get_dataset(dataset_id)

    try:
        from ..ml_core.Module1 import get_shape, get_column_types, get_summary_statistics

        shape = get_shape(df)
        # Normalize shape to a list for JSON/Pydantic compatibility
        shape_list = [int(shape[0]), int(shape[1])]

        dtypes_raw = get_column_types(df).to_dict()
        # Convert dtype objects to simple strings
        dtypes = {col: str(dt) for col, dt in dtypes_raw.items()}

        stats = get_summary_statistics(df).to_dict()

        return {
            "shape": shape_list,
            "dtypes": dtypes,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to generate summary for dataset {dataset_id}: {e}")
        # Provide basic fallback summary
        return {
            "shape": (len(df), len(df.columns)),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "stats": {
                "count": len(df),
                "columns": len(df.columns),
                "memory_usage": df.memory_usage(deep=True).sum(),
                "error": f"Advanced statistics unavailable: {str(e)}"
            }
        }
