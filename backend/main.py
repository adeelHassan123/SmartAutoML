from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

try:
    from .api.routers import router
    from .utils.rate_limiter import RateLimitMiddleware
    from .utils.cleanup import cleanup_inactive_sessions
    from .services.dataset_service import datasets, last_access
    from .services.preprocess_service import preprocessed
    from .services.train_service import trained_models
except Exception as e:
    # Log import errors but allow app to start in degraded mode
    import traceback
    logging.getLogger(__name__).error(f"CRITICAL: Backend modules failed to import: {e}")
    logging.getLogger(__name__).error(f"Traceback: {traceback.format_exc()}")
    router = None
    RateLimitMiddleware = None
    cleanup_inactive_sessions = None
    datasets = {}
    last_access = {}
    preprocessed = {}
    trained_models = {}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AutoML API",
    description="FastAPI backend for AutoML dataset processing and model training",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
if RateLimitMiddleware is not None:
    app.add_middleware(RateLimitMiddleware)

# Include API router
if router is not None:
    app.include_router(router, prefix="/api", tags=["automl"])
    logger.info("API router successfully registered")
else:
    logger.error("CRITICAL: API router is None - no routes will be available!")

# Periodic cleanup (in production, use a proper scheduler)
@app.middleware("http")
async def cleanup_middleware(request: Request, call_next):
    # Run cleanup on every request (simplified - in production use background task)
    try:
        if cleanup_inactive_sessions is not None:
            cleaned_count = cleanup_inactive_sessions(datasets, preprocessed, trained_models, last_access, max_age_hours=24)
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} inactive sessions")
    except Exception as e:
        # Don't let cleanup errors break the request
        logger.error(f"Cleanup middleware error: {e}")

    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # If the inner call raised an HTTPException (eg. rate limiting),
        # convert it into a proper JSON response so test clients receive
        # an HTTP response instead of an unhandled exception.
        if isinstance(e, HTTPException):
            logger.info(f"Handled HTTPException in cleanup middleware: {e.detail}")
            return JSONResponse(status_code=e.status_code, content={"detail": e.detail})

        logger.error(f"Request processing error: {e}")
        raise

@app.get("/")
async def root():
    """Root endpoint to check API status."""
    try:
        # Basic health check
        stats = {
            "datasets_count": len(datasets),
            "preprocessed_count": len(preprocessed),
            "trained_models_count": len(trained_models)
        }
        return {
            "message": "AutoML   API",
            "status": "running",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "message": "AutoML   API",
            "status": "running",
            "error": "Stats unavailable"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
