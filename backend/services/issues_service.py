import logging
from typing import Dict, Any

from .dataset_service import get_dataset
from ..ml_core.Module3 import detect_issues

logger = logging.getLogger(__name__)


def get_dataset_issues(dataset_id: str, target_column: str) -> Dict[str, Any]:
    """Get data quality issues for a dataset."""
    try:
        df = get_dataset(dataset_id)

        # Validate target column
        if not target_column or not isinstance(target_column, str):
            raise ValueError("Invalid target column name")

        target_column = target_column.strip()
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset. Available columns: {list(df.columns)}")

        # Validate target column suitability
        target_series = df[target_column]

        # Check if target column has data
        if target_series.isnull().all():
            return {
                "target_column_validation": f"Target column '{target_column}' contains only null values",
                "recommendations": ["Choose a different target column with actual values"],
                "severity": "critical"
            }

        # Check if target column has enough unique values for classification
        unique_values = target_series.dropna().nunique()
        if unique_values < 2:
            return {
                "target_column_validation": f"Target column '{target_column}' has only {unique_values} unique values (need at least 2 for classification)",
                "recommendations": ["Choose a target column with more varied values"],
                "severity": "critical"
            }

        # Check for extremely imbalanced classes (if categorical)
        if target_series.dtype == 'object' or unique_values <= 10:
            value_counts = target_series.value_counts()
            if len(value_counts) > 1:
                majority_ratio = value_counts.max() / value_counts.sum()
                if majority_ratio > 0.95:
                    return {
                        "target_column_validation": f"Majority class ratio is {majority_ratio:.2%} (>95%)",
                        "recommendations": ["Consider resampling or choosing a different target"],
                        "severity": "warning"
                    }

        # Run the actual issues detection
        try:
            issues = detect_issues(df, target_column)

            # Add target column validation status
            issues["target_column_validated"] = True
            issues["target_column_info"] = {
                "name": target_column,
                "dtype": str(target_series.dtype),
                "unique_values": int(unique_values),
                "null_count": int(target_series.isnull().sum()),
                "null_percentage": float(target_series.isnull().sum() / len(target_series) * 100)
            }

            logger.info(f"Issues detection completed for {dataset_id}, target: {target_column}")
            return issues

        except Exception as e:
            logger.error(f"Issues detection failed for {dataset_id}: {e}")
            # Provide basic fallback analysis
            return {
                "detection_error": f"Issues detection failed: {str(e)}",
                "basic_analysis": {
                    "total_rows": len(df),
                    "total_columns": len(df.columns),
                    "null_percentage": float(df.isnull().sum().sum() / (len(df) * len(df.columns)) * 100),
                    "duplicate_rows": int(df.duplicated().sum())
                },
                "recommendations": ["Manual data quality review recommended"],
                "severity": "warning"
            }

    except ValueError as e:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in issues detection for {dataset_id}: {e}")
        raise ValueError(f"Failed to analyze dataset issues: {str(e)}")
