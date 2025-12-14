import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const IssuesComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { addError } = useAppContext();
  const [issues, setIssues] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [datasetColumns, setDatasetColumns] = useState([]);
  const [fetchingColumns, setFetchingColumns] = useState(true);

  // Fetch actual columns from dataset on component mount (only once)
  useEffect(() => {
    let isMounted = true;
    
    const fetchDatasetInfo = async () => {
      setFetchingColumns(true);
      try {
        const result = await apiClient.getSummary(datasetId);
        if (isMounted) {
          if (!result.error && result.data.dtypes) {
            // Extract column names from dtypes object
            const columns = Object.keys(result.data.dtypes);
            setDatasetColumns(columns);
          } else if (result.error) {
            console.error('Failed to fetch columns:', result.message);
            addError({
              type: 'warning',
              title: 'Could not load column names',
              message: result.message || 'Unable to fetch dataset columns.'
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch dataset columns:', err);
          addError({
            type: 'warning',
            title: 'Could not load column names',
            message: 'Unable to fetch dataset columns. Please refresh the page.'
          });
        }
      } finally {
        if (isMounted) {
          setFetchingColumns(false);
        }
      }
    };

    if (datasetId) {
      fetchDatasetInfo();
    }

    // Cleanup: prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [datasetId]); // Only depend on datasetId, not addError

  const fetchIssues = useCallback(async () => {
    if (!targetColumn) return;

    setLoading(true);

    try {
      const result = await apiClient.getIssues(datasetId, targetColumn);

      if (result.error) {
        addError({
          type: 'error',
          title: 'Issues Analysis Failed',
          message: result.message
        });
        return;
      }

      setIssues(result.data.issues);
    } catch (err) {
      addError({
        type: 'error',
        title: 'Analysis Error',
        message: 'An unexpected error occurred during issues analysis'
      });
    } finally {
      setLoading(false);
    }
  }, [targetColumn, datasetId]); // Removed addError from dependencies to prevent re-running

  const handleRetry = async () => {
    setRetrying(true);
    await fetchIssues();
    setRetrying(false);
  };

  useEffect(() => {
    if (targetColumn) {
      fetchIssues();
    }
  }, [targetColumn, fetchIssues]);

  const renderIssues = () => {
    if (!issues) return null;

    const issueCount = Object.keys(issues).length;

    return (
      <div className="slide-in">
        {/* Analysis Summary */}
        <div className="info" style={{ marginBottom: '24px' }}>
          <div className="flex-between">
            <div>
              <h4>🔍 Analysis Summary</h4>
              <p>Target column: <strong>{targetColumn}</strong></p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: issueCount === 0 ? 'var(--success-color)' : 'var(--warning-color)'
              }}>
                {issueCount}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                {issueCount === 1 ? 'Issue' : 'Issues'}
              </div>
            </div>
          </div>
        </div>

        {issueCount === 0 ? (
          <div className="success">
            <h4>✅ No Issues Detected</h4>
            <p>Your dataset appears to be in excellent condition for machine learning!</p>
            <div style={{ marginTop: '16px' }}>
              <h5>🎯 Recommendations:</h5>
              <ul style={{ textAlign: 'left', marginTop: '8px' }}>
                <li>Proceed to preprocessing for optimal model performance</li>
                <li>Consider feature engineering if needed</li>
                <li>Your target variable is well-defined</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="warning">
            <h4>⚠️ Data Quality Issues Found</h4>
            <p>The following issues may impact model performance:</p>

            <div style={{ marginTop: '16px' }}>
              {/* Display issues in a structured way */}
              <div style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: '16px', borderRadius: '8px' }}>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--card-bg)',
                  padding: '12px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {JSON.stringify(issues, null, 2)}
                </pre>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h5>💡 Suggested Actions:</h5>
                <ul style={{ textAlign: 'left', marginTop: '8px' }}>
                  <li>Review preprocessing options to address these issues</li>
                  <li>Consider data cleaning or feature engineering</li>
                  <li>Evaluate if these issues significantly impact your use case</li>
                  <li>Consult domain experts for data quality decisions</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Data Quality Analysis</h1>
          <p className="card-subtitle">Check for potential issues that may affect model performance</p>
        </div>

        {/* Target Column Selection */}
        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label className="label">🎯 Select Target Column</label>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>
            Choose the column you want to predict (dependent variable)
          </p>

          {fetchingColumns ? (
            <div style={{ padding: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Loading dataset columns...
            </div>
          ) : datasetColumns.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--warning-color)' }}>
              No columns found in dataset
            </div>
          ) : (
            <>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="select"
                style={{ maxWidth: '100%' }}
              >
                <option value="">Choose target column...</option>
                {datasetColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>

              <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
                📊 Showing {datasetColumns.length} columns from your dataset
              </p>
            </>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">
              Analyzing data quality for target column: <strong>{targetColumn}</strong>
            </div>
            <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
              Checking for class imbalance, missing targets, and other issues...
            </p>
          </div>
        )}

        {/* Issues Display */}
        {renderIssues()}

        {/* Navigation */}
        {targetColumn && !loading && (
          <div className="flex-between" style={{ marginTop: '32px' }}>
            <button
              className="button button-secondary"
              onClick={() => navigate(`/eda/${datasetId}`)}
            >
              ← Back to EDA
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="button button-secondary"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? '🔄 Retrying...' : '🔄 Re-analyze'}
              </button>

              <button
                className="button button-primary"
                onClick={() => navigate(`/preprocess/${datasetId}?target=${targetColumn}`)}
              >
                Continue to Preprocessing →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesComponent;
