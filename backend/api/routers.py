from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

from ..services import (
    dataset_service,
    eda_service,
    issues_service,
    preprocess_service,
    train_service,
    results_service,
    report_service
)
from ..schemas.models import (
    UploadResponse,
    SummaryResponse,
    EdaResponse,
    IssuesResponse,
    PreprocessRequest,
    PreprocessResponse,
    TrainRequest,
    TrainResponse,
    ResultsResponse,
    StatusResponse
)

router = APIRouter()


@router.get('/datasets')
async def list_datasets():
    """Return list of available dataset IDs (for debugging/local inspection)."""
    try:
        ids = list(dataset_service.datasets.keys())
        return {"datasets": ids}
    except Exception as e:
        logger.error(f"Failed to list datasets: {e}")
        raise HTTPException(status_code=500, detail="Failed to list datasets")


@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a CSV dataset."""
    try:
        # Validate filename
        if not file.filename or not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are supported")

        # Read file content
        file_bytes = await file.read()

        # Validate file size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10MB
        if len(file_bytes) > max_size:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")

        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file provided")

        # Process the dataset
        dataset_id, target_candidates = dataset_service.upload_dataset(file_bytes)

        logger.info(f"Dataset uploaded: {dataset_id}, size: {len(file_bytes)} bytes")
        return UploadResponse(
            dataset_id=dataset_id,
            target_candidates=target_candidates
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@router.get("/summary/{dataset_id}", response_model=SummaryResponse)
async def get_summary(dataset_id: str):
    """Get dataset summary."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        summary = dataset_service.get_dataset_summary(dataset_id)
        return SummaryResponse(**summary)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summary retrieval error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get summary: {str(e)}")


@router.get("/eda/{dataset_id}", response_model=EdaResponse)
async def get_eda(dataset_id: str):
    """Get EDA data for dataset."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        eda_data = eda_service.get_eda_data(dataset_id)
        return EdaResponse(**eda_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"EDA retrieval error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get EDA: {str(e)}")


@router.get("/issues/{dataset_id}", response_model=IssuesResponse)
async def get_issues(dataset_id: str, target_column: str | None = None):
    """Get data quality issues."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")
        
        # Validate target_column parameter
        if target_column is None or target_column.strip() == "":
            raise HTTPException(status_code=400, detail="Missing or invalid target column. Provide ?target_column=<column_name>")

        issues = issues_service.get_dataset_issues(dataset_id, target_column.strip())
        return IssuesResponse(issues=issues)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Issues retrieval error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get issues: {str(e)}")


@router.post("/preprocess/{dataset_id}", response_model=PreprocessResponse)
async def apply_preprocessing(dataset_id: str, request: PreprocessRequest):
    """Apply preprocessing to dataset."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        result = preprocess_service.apply_preprocessing(dataset_id, request)
        return PreprocessResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preprocessing error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to preprocess: {str(e)}")


@router.post("/train/{dataset_id}", response_model=TrainResponse)
async def start_training(
    dataset_id: str,
    request: TrainRequest,
    background_tasks: BackgroundTasks
):
    """Start model training in background."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        # Check if preprocessing was done
        preprocess_service.get_preprocessed_data(dataset_id)

        # Start background training
        background_tasks.add_task(
            train_service.start_training_background,
            dataset_id,
            request
        )

        logger.info(f"Training started for dataset {dataset_id}")
        return TrainResponse(
            message="Training started in background",
            status="running"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Training start error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")


@router.get("/status/{dataset_id}", response_model=StatusResponse)
async def get_status(dataset_id: str):
    """Get training status."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        status = train_service.get_training_status(dataset_id)
        return StatusResponse(status=status)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.get("/results/{dataset_id}", response_model=ResultsResponse)
async def get_results(dataset_id: str, version: str = None):
    """Get model training results."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        results = results_service.get_model_results(dataset_id, version)
        return ResultsResponse(**results)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Results retrieval error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get results: {str(e)}")


@router.get("/report/{dataset_id}")
async def get_report(dataset_id: str, format: str = 'markdown'):
    """Download dataset report."""
    try:
        if not dataset_id or not isinstance(dataset_id, str):
            raise HTTPException(status_code=400, detail="Invalid dataset ID")

        # Validate format
        valid_formats = ['markdown', 'pdf']
        if format not in valid_formats:
            raise HTTPException(status_code=400, detail=f"Invalid format. Supported: {', '.join(valid_formats)}")

        report_bytes = report_service.generate_dataset_report(dataset_id, format)

        if not report_bytes or len(report_bytes) == 0:
            raise HTTPException(status_code=500, detail="Generated report is empty")

        filename = f"automl_report_{dataset_id}.{format}"
        media_type = 'application/octet-stream'
        if format == 'pdf':
            media_type = 'application/pdf'
        elif format == 'markdown':
            media_type = 'text/markdown'

        return StreamingResponse(
            BytesIO(report_bytes),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report generation error for {dataset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
