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

    // Check for "findings" array (preferred structured format)
    const findings = issues.findings || [];
    const hasFindings = Array.isArray(findings) && findings.length > 0;
    
    // Fallback for older API or specific errors
    // distinct keys that represent actual issue categories (excluding metadata)
    const rawKeys = Object.keys(issues).filter(k => 
      !['findings', 'target_column_validated', 'target_column_info', 'target_column_validation', 'recommendations', 'severity', 'detection_error', 'basic_analysis'].includes(k)
    );

    // Calculate total count
    let issueCount = 0;
    if (hasFindings) {
      issueCount = findings.length;
    } else {
      // Basic count from keys + target validation error if any
      issueCount = rawKeys.length + (issues.target_column_validation ? 1 : 0);
    }
    
    // Check for target column specific issues (often critical blockers)
    const targetIssue = issues.target_column_validation;

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
                color: (issueCount === 0 && !targetIssue) ? 'var(--success-color)' : 'var(--warning-color)'
              }}>
                {issueCount + (targetIssue && !hasFindings ? 1 : 0)}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                Issues Detected
              </div>
            </div>
          </div>
        </div>

        {/* Target Column Critical Error (if any) */}
        {targetIssue && (
          <div className="warning" style={{ 
            borderLeft: '4px solid var(--danger-color)',
            backgroundColor: '#fff5f5' 
          }}>
            <h4 style={{ color: 'var(--danger-color)' }}>🚫 Target Column Issue</h4>
            <p className="card-subtitle">{targetIssue}</p>
            {issues.recommendations && (
              <ul style={{ marginTop: '12px' }}>
                {issues.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: '16px' }}>
              <button 
                className="button button-sm" 
                onClick={() => setTargetColumn('')}
                style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}
              >
                Choose Different Target
              </button>
            </div>
          </div>
        )}

        {(issueCount === 0 && !targetIssue) ? (
          <div className="success">
            <h4>✅ No Data Quality Issues Detected</h4>
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
          <div style={{ marginTop: '24px' }}>
            {hasFindings ? (
              // NEW: Structured Findings Display
              <div className="issues-grid">
                {findings.map((item, index) => (
                  <div 
                    key={index} 
                    className="card"
                    style={{ 
                      marginBottom: '16px',
                      borderLeft: `5px solid ${
                        item.severity === 'critical' ? 'var(--danger-color)' : 
                        item.severity === 'warning' ? 'var(--warning-color)' : 
                        'var(--info-color)'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.severity === 'critical' ? '🔴' : item.severity === 'warning' ? '🟡' : 'ℹ️'}
                        {item.title}
                      </h4>
                      <span style={{ 
                        fontSize: '12px', 
                        textTransform: 'uppercase', 
                        fontWeight: 'bold',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--background-color)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {item.severity}
                      </span>
                    </div>

                    <p style={{ color: 'var(--text-color)', marginBottom: '16px' }}>
                      {item.description}
                    </p>

                    {/* Affected Columns */}
                    {item.affected_columns && item.affected_columns.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>AFFECTED COLUMNS:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {item.affected_columns.slice(0, 5).map(col => (
                            <span key={col} style={{ 
                              backgroundColor: 'rgba(0,0,0,0.05)', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              fontSize: '13px',
                              fontFamily: 'monospace'
                            }}>
                              {col}
                            </span>
                          ))}
                          {item.affected_columns.length > 5 && (
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                              +{item.affected_columns.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Suggested Fixes */}
                    {item.suggested_fixes && item.suggested_fixes.length > 0 && (
                      <div style={{ 
                        backgroundColor: 'rgba(240, 246, 255, 0.5)', 
                        padding: '12px', 
                        borderRadius: '6px',
                        border: '1px solid rgba(0,0,0,0.05)'
                      }}>
                        <strong style={{ fontSize: '13px', color: 'var(--primary-color)' }}>💡 SUGGESTED ACTIONS:</strong>
                        <ul style={{ margin: '8px 0 0 20px', fontSize: '14px', color: '#444' }}>
                          {item.suggested_fixes.map((fix, i) => (
                            <li key={i}>{fix}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // OLD: Fallback Display (for backward compat if findings not present)
              <div className="issues-grid">
                {rawKeys.map((key, index) => (
                   <div key={index} className="card" style={{ marginBottom: '12px', borderLeft: '4px solid var(--warning-color)' }}>
                      <h5>⚠️ {key.replace(/_/g, ' ')}</h5>
                      <p>Full issue details available in EDA report.</p>
                   </div>
                ))}
              </div>
            )}
            
            <div className="info" style={{ marginTop: '24px' }}>
               <p><strong>Note:</strong> You can address many of these issues in the <strong>Preprocessing</strong> step using tools like "Imputation" and "Outlier Removal".</p>
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
