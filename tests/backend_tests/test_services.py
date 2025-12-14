import pytest
import pandas as pd
from io import BytesIO

from backend.services import dataset_service, eda_service


def test_upload_dataset():
    csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0"
    file_bytes = csv_content.encode('utf-8')

    dataset_id, target_candidates = dataset_service.upload_dataset(file_bytes)

    assert isinstance(dataset_id, str)
    assert len(dataset_id) > 0
    assert isinstance(target_candidates, list)
    assert "target" in target_candidates


def test_get_dataset():
    csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0"
    file_bytes = csv_content.encode('utf-8')

    dataset_id, _ = dataset_service.upload_dataset(file_bytes)
    df = dataset_service.get_dataset(dataset_id)

    assert isinstance(df, pd.DataFrame)
    assert df.shape == (3, 3)
    assert list(df.columns) == ["feature1", "feature2", "target"]


def test_get_dataset_summary():
    csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0"
    file_bytes = csv_content.encode('utf-8')

    dataset_id, _ = dataset_service.upload_dataset(file_bytes)
    summary = dataset_service.get_dataset_summary(dataset_id)

    assert "shape" in summary
    assert "dtypes" in summary
    assert "stats" in summary
    assert summary["shape"] == [3, 3]


def test_eda_service():
    csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0\n7,8,1"
    file_bytes = csv_content.encode('utf-8')

    dataset_id, _ = dataset_service.upload_dataset(file_bytes)
    eda_data = eda_service.get_eda_data(dataset_id)

    assert "missing" in eda_data
    assert "correlation" in eda_data
    assert "outliers_iqr" in eda_data
    assert "outliers_zscore" in eda_data
    assert "numerical_distributions" in eda_data
    assert "categorical_distributions" in eda_data


def test_invalid_dataset_id():
    with pytest.raises(ValueError):
        dataset_service.get_dataset("invalid-id")

    with pytest.raises(ValueError):
        dataset_service.get_dataset_summary("invalid-id")

    with pytest.raises(ValueError):
        eda_service.get_eda_data("invalid-id")
