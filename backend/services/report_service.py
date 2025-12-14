from io import BytesIO
from typing import Dict, Any

from .dataset_service import get_dataset
from .results_service import get_model_results
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

    # Get training results if available
    try:
        results_data = get_model_results(dataset_id)
        results = results_data.get('comparison', []) if results_data.get('status') == 'done' else []
    except Exception as e:
        logger.warning(f"Failed to retrieve training results for report: {e}")
        results = []

    # Build report sections
    report_sections: Dict[str, Any] = {}

    # Dataset overview
    try:
        schema = get_dataset_schema(df)
        shape = get_shape(df)
        report_sections["Dataset Overview"] = {
            "Shape": f"{shape[0]} rows × {shape[1]} columns",
            "Columns": schema.to_dict('records') if hasattr(schema, 'to_dict') else schema,
            "Data Types": df.dtypes.to_dict()
        }
    except Exception as e:
        logger.warning(f"Failed to build dataset overview for report: {e}")
        report_sections["Dataset Overview"] = {
            "Shape": f"{len(df)} rows × {len(df.columns)} columns",
            "Columns": list(df.columns),
            "Data Types": df.dtypes.to_dict()
        }

    # Training results if available
    if results:
        report_sections["Model Comparison"] = results
        if isinstance(results_data.get('ranked'), list):
            report_sections["Model Ranking"] = results_data['ranked']

    # Generate report based on format
    fmt = (format_type or 'markdown').lower()
    try:
        if fmt == 'markdown':
            return export_report_as_markdown_bytes(report_sections)
        elif fmt == 'pdf':
            return export_report_as_pdf_bytes(report_sections)
        else:
            return export_report_as_markdown_bytes(report_sections)
    except Exception as e:
        logger.error(f"Report generation failed for {dataset_id}: {e}")
        raise
