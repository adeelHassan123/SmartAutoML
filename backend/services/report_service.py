from io import BytesIO
from typing import Dict, Any

from .dataset_service import get_dataset, get_dataset_summary
from .results_service import get_model_results
from .eda_service import get_eda_data
from .issues_service import get_dataset_issues
from .preprocess_service import get_preprocessed_data
from ..ml_core.Module7 import export_report_as_markdown_bytes, export_report_as_pdf_bytes
from ..ml_core.Module1 import get_dataset_schema, get_shape
import logging

logger = logging.getLogger(__name__)


def generate_dataset_report(dataset_id: str, format_type: str = 'markdown') -> bytes:
    """Generate a comprehensive report for the dataset and results."""
    try:
        df = get_dataset(dataset_id)
    except Exception as e:
        logger.error(f"Failed to load dataset for report {dataset_id}: {e}")
        raise

    # Gather all available data for comprehensive report
    report_data: Dict[str, Any] = {}

    # Dataset information
    try:
        schema = get_dataset_schema(df)
        shape = get_shape(df)
        report_data["dataset"] = {
            "dataframe": df,
            "shape": f"{shape[0]} rows × {shape[1]} columns",
            "columns": schema.to_dict('records') if hasattr(schema, 'to_dict') else schema,
            "data_types": df.dtypes.to_dict()
        }
    except Exception as e:
        logger.warning(f"Failed to build dataset overview for report: {e}")
        report_data["dataset"] = {
            "dataframe": df,
            "shape": f"{len(df)} rows × {len(df.columns)} columns",
            "columns": list(df.columns),
            "data_types": df.dtypes.to_dict()
        }

    # EDA data
    try:
        eda_data = get_eda_data(dataset_id)
        report_data["eda"] = eda_data
    except Exception as e:
        logger.warning(f"Failed to retrieve EDA data for report: {e}")
        report_data["eda"] = {}

    # Data quality issues (try to get target column from preprocessing or use first categorical)
    try:
        # Try to get target column from preprocessing data
        preprocess_data = get_preprocessed_data(dataset_id)
        target_column = None

        if preprocess_data and 'target_column' in preprocess_data:
            target_column = preprocess_data['target_column']
        else:
            # Fallback: try to find a suitable target column
            cat_cols = df.select_dtypes(include=['object', 'category']).columns
            if len(cat_cols) > 0:
                target_column = cat_cols[0]  # Use first categorical column as fallback

        if target_column:
            issues_data = get_dataset_issues(dataset_id, target_column)
            report_data["issues"] = issues_data
        else:
            report_data["issues"] = {}
    except Exception as e:
        logger.warning(f"Failed to retrieve issues data for report: {e}")
        report_data["issues"] = {}

    # Preprocessing information
    try:
        preprocess_data = get_preprocessed_data(dataset_id)
        report_data["preprocessing"] = preprocess_data
    except Exception as e:
        logger.warning(f"Failed to retrieve preprocessing data for report: {e}")
        report_data["preprocessing"] = {}

    # Training results
    try:
        results_data = get_model_results(dataset_id)
        if results_data.get('status') == 'done':
            report_data["results"] = results_data
        else:
            report_data["results"] = {}
    except Exception as e:
        logger.warning(f"Failed to retrieve training results for report: {e}")
        report_data["results"] = {}

    # Generate report based on format
    fmt = (format_type or 'markdown').lower()
    try:
        if fmt == 'markdown':
            return export_report_as_markdown_bytes(report_data)
        elif fmt == 'pdf':
            return export_report_as_pdf_bytes(report_data)
        else:
            return export_report_as_markdown_bytes(report_data)
    except Exception as e:
        logger.error(f"Report generation failed for {dataset_id}: {e}")
        raise
