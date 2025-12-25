# 🤖 AutoML - Automated Machine Learning Platform

## Overview

**AutoML** is an end-to-end machine learning automation platform that simplifies the process of building predictive models. Whether you're a data scientist or a beginner, AutoML handles the entire ML pipeline from data upload to model training and evaluation.

### What It Does

AutoML provides a complete, user-friendly workflow for machine learning:

1. **📤 Dataset Upload** - Upload CSV files and get instant insights about your data
2. **📊 Data Profiling** - View dataset dimensions, column types, numerical statistics, and class distributions with interactive visualizations
3. **🔍 Exploratory Data Analysis (EDA)** - Analyze missing data, correlations, outliers, and distributions
4. **⚙️ Data Preprocessing** - Handle missing values, scale numeric features, and encode categorical variables
5. **🎯 Model Training** - Automatically train multiple ML models and select the best performer
6. **📈 Results & Evaluation** - Compare model performance, view predictions, and download reports

### Key Features

- **Interactive Charts & Graphs** - Beautiful visualizations of data distributions and model performance
- **Real-time Data Insights** - Summary statistics for numerical columns and class distributions for categorical columns
- **Automated Preprocessing** - Configure and apply data cleaning strategies with one click
- **Multiple Models** - Train and compare various ML algorithms automatically
- **Professional UI** - Dark/Light theme support with responsive design

## Architecture

```
Frontend (React) ←→ API (FastAPI) ←→ Services ←→ ML Core (Modules 1-7)
```

## Quick Start

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   cd ..
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000  
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`