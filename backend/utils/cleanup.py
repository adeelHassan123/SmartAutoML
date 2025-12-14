import time
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def cleanup_inactive_sessions(
    datasets: Dict[str, Any],
    preprocessed: Dict[str, Any],
    trained_models: Dict[str, Any],
    last_access: Dict[str, float],
    max_age_hours: int = 1
) -> int:
    """
    Remove datasets and associated data that haven't been accessed for more than max_age_hours.

    Args:
        datasets: Dict of dataset_id -> DataFrame
        preprocessed: Dict of dataset_id -> preprocessed data
        trained_models: Dict of dataset_id -> trained models
        last_access: Dict of dataset_id -> timestamp
        max_age_hours: Maximum age in hours before cleanup

    Returns:
        Number of datasets cleaned up
    """
    try:
        # Validate inputs
        if max_age_hours <= 0:
            logger.warning(f"Invalid max_age_hours: {max_age_hours}, using default of 24")
            max_age_hours = 24

        current_time = time.time()
        max_age_seconds = int(max_age_hours * 3600)
        to_remove = []

        # Find datasets to remove (iterate over snapshot to allow safe mutation)
        for dataset_id, last_access_time in list(last_access.items()):
            try:
                # Validate timestamp
                if not isinstance(last_access_time, (int, float)) or last_access_time <= 0:
                    logger.warning(f"Invalid timestamp for dataset {dataset_id}: {last_access_time}")
                    to_remove.append(dataset_id)
                    continue
                # Remove if older than or equal to max age
                if current_time - last_access_time >= max_age_seconds:
                    to_remove.append(dataset_id)
            except Exception as e:
                logger.error(f"Error checking dataset {dataset_id}: {e}")
                # Add to removal list to be safe
                to_remove.append(dataset_id)

        # Remove datasets and associated data
        removed_count = 0
        for dataset_id in to_remove:
            try:
                datasets.pop(dataset_id, None)
                preprocessed.pop(dataset_id, None)
                trained_models.pop(dataset_id, None)
                last_access.pop(dataset_id, None)
                removed_count += 1
                logger.info(f"Removed inactive dataset: {dataset_id}")
            except Exception as e:
                logger.error(f"Error removing dataset {dataset_id}: {e}")

        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} inactive sessions")

        return removed_count

    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        return 0
