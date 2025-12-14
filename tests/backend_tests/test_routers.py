import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "AutoML   API" in response.json()["message"]


def test_upload_csv():
    # Test with valid CSV content
    csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0"
    files = {"file": ("test.csv", csv_content, "text/csv")}

    response = client.post("/api/upload", files=files)
    assert response.status_code == 200
    assert "dataset_id" in response.json()
    assert "target_candidates" in response.json()


def test_upload_invalid_file():
    # Test with invalid file type
    files = {"file": ("test.txt", "not csv content", "text/plain")}

    response = client.post("/api/upload", files=files)
    assert response.status_code == 400


def test_get_summary():
    # First upload a dataset
    csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    upload_response = client.post("/api/upload", files=files)
    dataset_id = upload_response.json()["dataset_id"]

    # Then get summary
    response = client.get(f"/api/summary/{dataset_id}")
    assert response.status_code == 200
    assert "shape" in response.json()
    assert "dtypes" in response.json()


def test_get_summary_invalid_id():
    response = client.get("/api/summary/invalid-id")
    assert response.status_code == 404


def test_rate_limiting():
    # Make multiple requests quickly
    for i in range(110):  # Exceed the 100 requests per minute limit
        response = client.get("/")
        if i > 100:
            assert response.status_code == 429
