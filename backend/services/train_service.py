import time
import logging
from typing import Dict, Any
from threading import Lock

from .preprocess_service import get_preprocessed_data
from ..ml_core.Module4 import split_train_test_stratified
from ..ml_core.Module5 import train_and_optimize_models, evaluate_models
from ..schemas.models import TrainRequest

logger = logging.getLogger(__name__)

# In-memory storage for training status and results
training_status: Dict[str, str] = {}  # dataset_id -> 'running' | 'done' | 'error'
trained_models: Dict[str, Dict[str, Any]] = {}  # dataset_id -> {timestamp: results}

# Locks for thread-safety
training_lock = Lock()


def start_training_background(dataset_id: str, request: TrainRequest):
    """Background task to train models."""
    try:
        with training_lock:
            training_status[dataset_id] = 'running'

        # Get preprocessed data
        processed_data = get_preprocessed_data(dataset_id)
        df_processed = processed_data['data']
        target_column = processed_data['target_column']
        test_size = processed_data.get('test_size', 0.2)

        # Split data (attempt stratified split; fall back to random split on failure)
        try:
            X_train, X_test, y_train, y_test = split_train_test_stratified(
                df_processed,
                target_column,
                test_size=test_size,
                random_state=42
            )
        except Exception as e:
            logger.warning(f"Stratified split failed for {dataset_id}: {e}. Falling back to random split.")
            # Shuffle and split manually
            df_shuffled = df_processed.sample(frac=1, random_state=42)
            split_idx = int(len(df_shuffled) * 0.8)
            train = df_shuffled.iloc[:split_idx]
            test = df_shuffled.iloc[split_idx:]
            X_train = train.drop(columns=[target_column])
            y_train = train[target_column]
            X_test = test.drop(columns=[target_column])
            y_test = test[target_column]

        # Train and optimize models
        results = train_and_optimize_models(
            X_train, y_train,
            search_type=request.search_type,
            cv=request.cv,
            scoring=request.scoring,
            include_models=request.models,
            class_weight_auto=request.class_weight_auto
        )

        # Evaluate on test set
        evaluation_results = evaluate_models(results, X_test, y_test)

        # Store results with timestamp
        timestamp = int(time.time())
        with training_lock:
            if dataset_id not in trained_models:
                trained_models[dataset_id] = {}

            trained_models[dataset_id][str(timestamp)] = {
                'results': results,
                'evaluation': evaluation_results,
                'timestamp': str(timestamp),
                'models_trained': request.models,
                'cv_folds': request.cv
            }
            training_status[dataset_id] = 'done'

    except Exception as e:
        with training_lock:
            training_status[dataset_id] = 'error'
        logger.error(f"Training failed for dataset {dataset_id}: {str(e)}")


def get_training_status(dataset_id: str) -> str:
    """Get current training status for a dataset."""
    return training_status.get(dataset_id, 'not_started')


def get_training_results(dataset_id: str, version: str = None) -> Dict[str, Any]:
    """Get training results for a dataset."""
    if dataset_id not in trained_models:
        return None
    # Sort versions by timestamp (most recent first)
    versions = list(trained_models[dataset_id].keys())
    try:
        versions_sorted = sorted(versions, key=lambda x: int(x), reverse=True)
    except Exception:
        versions_sorted = sorted(versions, reverse=True)

    if version and version in trained_models[dataset_id]:
        result = trained_models[dataset_id][version]
    elif versions_sorted:
        result = trained_models[dataset_id][versions_sorted[0]]  # Most recent
    else:
        return None

    return {
        'results': result,
        'versions': versions_sorted
    }
