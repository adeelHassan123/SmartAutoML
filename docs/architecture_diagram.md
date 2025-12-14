# AutoML   Architecture

## System Overview

```
┌─────────────────┐    HTTP/JSON    ┌─────────────────┐
│                 │◄────────────────►│                 │
│   React Frontend│                  │ FastAPI Backend │
│                 │                  │                 │
└─────────────────┘                  └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                  ┌─────────────────┐
│  Browser Router │                  │   API Routers   │
│ - Upload        │                  │ - /api/upload   │
│ - Summary       │                  │ - /api/summary  │
│ - EDA          │                  │ - /api/eda      │
│ - Issues       │                  │ - /api/issues   │
│ - Preprocess   │                  │ - /api/preprocess│
│ - Train        │                  │ - /api/train    │
│ - Results      │                  │ - /api/results  │
│ - Report       │                  │ - /api/report   │
└─────────────────┘                  └─────────────────┘
                                             │
                                             ▼
                                   ┌─────────────────┐
                                   │    Services     │
                                   │ - dataset_svc   │
                                   │ - eda_svc       │
                                   │ - issues_svc    │
                                   │ - preprocess_svc│
                                   │ - train_svc     │
                                   │ - results_svc   │
                                   │ - report_svc    │
                                   └─────────────────┘
                                             │
                                             ▼
                                   ┌─────────────────┐
                                   │   ML Core       │
                                   │ - Module1       │
                                   │ - Module2       │
                                   │ - Module3       │
                                   │ - Module4       │
                                   │ - Module5       │
                                   │ - Module6       │
                                   │ - Module7       │
                                   └─────────────────┘
                                             │
                                             ▼
                                   ┌─────────────────┐
                                   │   Utilities     │
                                   │ - cleanup       │
                                   │ - rate_limiter  │
                                   └─────────────────┘
```

## Data Flow

1. **Upload Phase**: User uploads CSV → Dataset stored in memory with UUID
2. **EDA Phase**: Statistical analysis, missing values, outliers, correlations
3. **Issues Phase**: Data quality checks and target validation
4. **Preprocessing Phase**: Imputation, scaling, encoding, outlier handling
5. **Training Phase**: Background model training with hyperparameter optimization
6. **Results Phase**: Model comparison, ranking, and evaluation metrics
7. **Report Phase**: Comprehensive markdown report generation

## Key Features

- **Background Processing**: Model training runs asynchronously
- **Model Versioning**: Timestamp-based model storage and retrieval
- **Auto Cleanup**: Inactive datasets removed after 1 hour
- **Rate Limiting**: 100 requests per minute per IP
- **Dark Mode**: Frontend theme toggle with localStorage persistence
- **Responsive Design**: Mobile-friendly UI components

## Technology Stack

- **Backend**: FastAPI, Pydantic, scikit-learn, pandas, numpy
- **Frontend**: React, React Router, Axios, CSS Variables
- **Testing**: pytest (backend), Jest (frontend)
- **Deployment**: Uvicorn (backend), static hosting (frontend)
