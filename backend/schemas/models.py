from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Tuple, Any


class UploadResponse(BaseModel):
    dataset_id: str = Field(..., min_length=1, pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$')
    target_candidates: List[str] = Field(..., min_items=0)

    @validator('target_candidates')
    def validate_target_candidates(cls, v):
        if not all(isinstance(candidate, str) and candidate.strip() for candidate in v):
            raise ValueError('All target candidates must be non-empty strings')
        return v


class SummaryResponse(BaseModel):
    shape: Tuple[int, int]
    dtypes: Dict[str, str] = Field(..., min_items=1)
    numerical_stats: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    categorical_distributions: Dict[str, Dict[str, Any]] = Field(default_factory=dict)

    @validator('shape')
    def validate_shape(cls, v):
        if not isinstance(v, (list, tuple)) or len(v) != 2:
            raise ValueError('shape must be a tuple of two integers')
        rows, cols = int(v[0]), int(v[1])
        if rows <= 0 or cols <= 0:
            raise ValueError('shape dimensions must be positive integers')
        return (rows, cols)


class EdaResponse(BaseModel):
    missing: Dict[str, float]
    correlation: Dict[str, Dict[str, float]]
    outliers_iqr: List[Dict[str, Any]]
    outliers_zscore: List[Dict[str, Any]]
    numerical_distributions: Dict[str, Dict[str, Any]]
    categorical_distributions: Dict[str, Dict[str, Any]]


class IssuesResponse(BaseModel):
    issues: Dict[str, Any]


class PreprocessRequest(BaseModel):
    numeric_impute: str = Field('median', pattern=r'^(median|mean|constant)$')
    categorical_impute: str = Field('most_frequent', pattern=r'^(most_frequent|constant)$')
    numeric_fill_value: Optional[float] = None
    categorical_fill_value: Optional[str] = None
    scaling: str = Field('standard', pattern=r'^(standard|minmax|robust|none)$')
    encoding: str = Field('onehot', pattern=r'^(onehot|label|ordinal)$')
    outlier_action: str = Field('no_action', pattern=r'^(no_action|remove|capping)$')
    outlier_method: str = Field('iqr', pattern=r'^(iqr|zscore)$')
    target_column: str = Field(..., min_length=1)
    test_size: float = Field(0.2, ge=0.1, le=0.5, description="Fraction of dataset to use for testing (0.1-0.5)")

    @validator('numeric_fill_value')
    def validate_numeric_fill_value(cls, v, values):
        if values.get('numeric_impute') == 'constant' and v is None:
            raise ValueError('numeric_fill_value required when numeric_impute is constant')
        return v

    @validator('categorical_fill_value')
    def validate_categorical_fill_value(cls, v, values):
        if values.get('categorical_impute') == 'constant' and v is None:
            raise ValueError('categorical_fill_value required when categorical_impute is constant')
        return v


class PreprocessResponse(BaseModel):
    message: str
    preview: List[Dict[str, Any]]
    diff_data: Dict[str, Any]


VALID_MODELS = [
    'Logistic Regression', 'Random Forest', 'SVM', 'Gradient Boosting',
    'XGBoost', 'LightGBM', 'K-Neighbors', 'Decision Tree', 'Naive Bayes'
]

VALID_SCORING_METRICS = [
    'accuracy', 'precision', 'recall', 'f1',
    'precision_weighted', 'recall_weighted', 'f1_weighted',
    'roc_auc', 'roc_auc_weighted'
]

class TrainRequest(BaseModel):
    models: List[str] = Field(['Logistic Regression', 'Random Forest'], min_items=1)
    search_type: str = Field('grid', pattern=r'^(grid|random)$')
    cv: int = Field(5, gt=0, le=20)  # Cross-validation folds: 1 < cv <= 20
    scoring: Optional[str] = Field('f1_weighted', pattern=r'^(' + '|'.join(VALID_SCORING_METRICS) + r')(_weighted)?$')
    class_weight_auto: bool = True

    @validator('models')
    def validate_models(cls, v):
        if not v:
            raise ValueError('At least one model must be selected')
        invalid_models = [model for model in v if model not in VALID_MODELS]
        if invalid_models:
            raise ValueError(f'Invalid models: {invalid_models}. Valid options: {VALID_MODELS}')
        return v


class TrainResponse(BaseModel):
    message: str
    status: str


class ResultsResponse(BaseModel):
    status: str
    comparison: List[Dict[str, Any]]
    ranked: List[Dict[str, Any]]
    versions: List[str]


class StatusResponse(BaseModel):
    status: str
