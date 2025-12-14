import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const EdaComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { addError } = useAppContext();
  const [edaData, setEdaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    fetchEdaData();
  }, [datasetId]);

  const fetchEdaData = async () => {
    setLoading(true);
    try {
      const result = await apiClient.getEda(datasetId);

      if (result.error) {
        addError({
          type: 'error',
          title: 'EDA Analysis Failed',
          message: result.message
        });
        return;
      }

      setEdaData(result.data);
    } catch (err) {
      addError({
        type: 'error',
        title: 'EDA Error',
        message: 'An unexpected error occurred during exploratory analysis'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await fetchEdaData();
    setRetrying(false);
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'missing', label: '🔍 Missing Values', icon: '🔍' },
    { id: 'outliers', label: '📈 Outliers', icon: '📈' },
    { id: 'distributions', label: '📊 Distributions', icon: '📊' }
  ];

  if (loading) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Analyzing your data...</div>
            <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
              Performing comprehensive exploratory data analysis
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!edaData) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Exploratory Data Analysis</h1>
            <p className="card-subtitle">Unable to load EDA analysis</p>
          </div>

          <div className="error">
            <h3>❌ Analysis Unavailable</h3>
            <p>The exploratory data analysis could not be completed. This might be due to:</p>
            <ul style={{ textAlign: 'left', margin: '12px 0' }}>
              <li>Complex dataset structure</li>
              <li>Server processing limitations</li>
              <li>Data quality issues</li>
            </ul>
          </div>

          <div className="flex-center" style={{ gap: '12px' }}>
            <button
              className="button button-secondary"
              onClick={() => navigate(`/summary/${datasetId}`)}
            >
              ← Back to Summary
            </button>
            <button
              className="button button-primary"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? 'Retrying...' : '🔄 Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'missing':
        return renderMissingValues();
      case 'outliers':
        return renderOutliers();
      case 'distributions':
        return renderDistributions();
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="slide-in">
      <div className="grid grid-2" style={{ marginBottom: '32px' }}>
        <div className="info">
          <h4>🎯 Analysis Summary</h4>
          <p>Your dataset has been analyzed for data quality and patterns.</p>
          <ul style={{ marginTop: '12px' }}>
            <li><strong>Missing Values:</strong> {Object.keys(edaData.missing).length} columns affected</li>
            <li><strong>Outliers Detected:</strong> {edaData.outliers_iqr.length + edaData.outliers_zscore.length} features</li>
            <li><strong>Numerical Features:</strong> {Object.keys(edaData.numerical_distributions).length}</li>
            <li><strong>Categorical Features:</strong> {Object.keys(edaData.categorical_distributions).length}</li>
          </ul>
        </div>

        <div className="warning">
          <h4>💡 Recommendations</h4>
          <p>Based on the analysis, consider:</p>
          <ul style={{ marginTop: '12px' }}>
            {Object.keys(edaData.missing).length > 0 && (
              <li>Handling missing values in preprocessing</li>
            )}
            {(edaData.outliers_iqr.length + edaData.outliers_zscore.length) > 0 && (
              <li>Addressing potential outliers</li>
            )}
            <li>Reviewing feature distributions for insights</li>
          </ul>
        </div>
      </div>

      <div className="success" style={{ textAlign: 'center' }}>
        <h4>✅ Analysis Complete</h4>
        <p>Explore individual sections using the tabs above for detailed insights.</p>
      </div>
    </div>
  );

  const renderMissingValues = () => (
    <div className="slide-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
          🔍 Missing Values Analysis
        </h3>
        {Object.keys(edaData.missing).length > 0 && (
          <span style={{
            backgroundColor: 'var(--danger-color)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            {Object.keys(edaData.missing).length} columns affected
          </span>
        )}
      </div>

      {Object.keys(edaData.missing).length === 0 ? (
        <div className="success">
          <h4>✅ No Missing Values Found</h4>
          <p>Your dataset is complete with no missing values detected.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Missing Count</th>
                <th>Missing Percentage</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(edaData.missing)
                .sort(([,a], [,b]) => b.missing_pct - a.missing_pct)
                .map(([column, data]) => (
                <tr key={column}>
                  <td><strong>{column}</strong></td>
                  <td>{data.missing_count.toLocaleString()}</td>
                  <td>
                    <span style={{
                      color: data.missing_pct > 50 ? 'var(--danger-color)' :
                             data.missing_pct > 20 ? 'var(--warning-color)' :
                             'var(--success-color)',
                      fontWeight: 'bold'
                    }}>
                      {data.missing_pct.toFixed(2)}%
                    </span>
                  </td>
                  <td>
                    {data.missing_pct > 50 ? (
                      <span style={{
                        backgroundColor: 'var(--danger-color)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        Critical
                      </span>
                    ) : data.missing_pct > 20 ? (
                      <span style={{
                        backgroundColor: 'var(--warning-color)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        High
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: 'var(--info-color)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        Low
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderOutliers = () => (
    <div className="slide-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
          📈 Outlier Detection
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            backgroundColor: 'var(--info-color)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            IQR: {edaData.outliers_iqr.length}
          </span>
          <span style={{
            backgroundColor: 'var(--warning-color)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            Z-Score: {edaData.outliers_zscore.length}
          </span>
        </div>
      </div>

      {(edaData.outliers_iqr.length === 0 && edaData.outliers_zscore.length === 0) ? (
        <div className="success">
          <h4>✅ No Significant Outliers Detected</h4>
          <p>Your numerical features appear to have normal distributions.</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {/* IQR Method */}
          <div>
            <h4 style={{ color: 'var(--info-color)' }}>📊 IQR Method (Interquartile Range)</h4>
            {edaData.outliers_iqr.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No outliers detected using IQR method.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Outlier Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edaData.outliers_iqr.map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.column}</strong></td>
                        <td>{item.outlier_count.toLocaleString()}</td>
                        <td>
                          <span style={{
                            color: item.outlier_pct > 10 ? 'var(--danger-color)' : 'var(--warning-color)',
                            fontWeight: 'bold'
                          }}>
                            {item.outlier_pct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Z-Score Method */}
          <div>
            <h4 style={{ color: 'var(--warning-color)' }}>📈 Z-Score Method (σ = 3.0)</h4>
            {edaData.outliers_zscore.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No outliers detected using Z-score method.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Outlier Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edaData.outliers_zscore.map((item, index) => (
                      <tr key={index}>
                        <td><strong>{item.column}</strong></td>
                        <td>{item.outlier_count.toLocaleString()}</td>
                        <td>
                          <span style={{
                            color: item.outlier_pct > 10 ? 'var(--danger-color)' : 'var(--warning-color)',
                            fontWeight: 'bold'
                          }}>
                            {item.outlier_pct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderDistributions = () => (
    <div className="slide-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
          📊 Feature Distributions
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{
            backgroundColor: 'var(--success-color)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            Numerical: {Object.keys(edaData.numerical_distributions).length}
          </span>
          <span style={{
            backgroundColor: 'var(--info-color)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            Categorical: {Object.keys(edaData.categorical_distributions).length}
          </span>
        </div>
      </div>

      {/* Numerical Distributions */}
      {Object.keys(edaData.numerical_distributions).length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ color: 'var(--success-color)', marginBottom: '16px' }}>
            🔢 Numerical Features
          </h4>
          <div className="grid grid-2">
            {Object.entries(edaData.numerical_distributions).map(([column, data]) => (
              <div key={column} style={{
                backgroundColor: 'var(--card-bg)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px'
              }}>
                <h5 style={{
                  color: 'var(--primary-color)',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}>
                  {column}
                </h5>
                <div style={{
                  display: 'flex',
                  alignItems: 'end',
                  height: '60px',
                  gap: '2px'
                }}>
                  {data.counts.map((count, index) => {
                    const maxCount = Math.max(...data.counts);
                    const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={index}
                        style={{
                          width: '8px',
                          backgroundColor: 'var(--primary-color)',
                          borderRadius: '2px 2px 0 0',
                          height: `${Math.max(height, 2)}%`,
                          transition: 'height 0.3s ease'
                        }}
                        title={`Bin ${index + 1}: ${count} values`}
                      />
                    );
                  })}
                </div>
                <div style={{
                  fontSize: '12px',
                  opacity: 0.7,
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  Distribution histogram
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorical Distributions */}
      {Object.keys(edaData.categorical_distributions).length > 0 && (
        <div>
          <h4 style={{ color: 'var(--info-color)', marginBottom: '16px' }}>
            🏷️ Categorical Features
          </h4>
          <div className="grid grid-2">
            {Object.entries(edaData.categorical_distributions).map(([column, data]) => (
              <div key={column} style={{
                backgroundColor: 'var(--card-bg)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px'
              }}>
                <h5 style={{
                  color: 'var(--primary-color)',
                  marginBottom: '12px',
                  fontSize: '16px'
                }}>
                  {column}
                </h5>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: '14px' }}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Count</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.labels.slice(0, 8).map((label, index) => {
                        const total = data.counts.reduce((a, b) => a + b, 0);
                        const percentage = ((data.counts[index] / total) * 100).toFixed(1);
                        return (
                          <tr key={index}>
                            <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {label}
                            </td>
                            <td>{data.counts[index].toLocaleString()}</td>
                            <td>{percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {data.labels.length > 8 && (
                    <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                      Showing top 8 categories ({data.labels.length - 8} more...)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(edaData.numerical_distributions).length === 0 &&
       Object.keys(edaData.categorical_distributions).length === 0 && (
        <div className="warning">
          <h4>⚠️ No Distribution Data Available</h4>
          <p>Unable to generate distribution visualizations for this dataset.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Exploratory Data Analysis</h1>
          <p className="card-subtitle">Comprehensive data quality and pattern analysis</p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px',
          overflowX: 'auto'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`button ${activeTab === tab.id ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                borderRadius: '0',
                borderBottom: activeTab === tab.id ? '3px solid var(--primary-color)' : 'none',
                whiteSpace: 'nowrap',
                minWidth: 'auto',
                padding: '12px 16px'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '400px' }}>
          {renderTabContent()}
        </div>

        {/* Navigation */}
        <div className="flex-between" style={{ marginTop: '32px' }}>
          <button
            className="button button-secondary"
            onClick={() => navigate(`/summary/${datasetId}`)}
          >
            ← Back to Summary
          </button>

          <button
            className="button button-primary"
            onClick={() => navigate(`/issues/${datasetId}`)}
          >
            Continue to Issues →
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdaComponent;
