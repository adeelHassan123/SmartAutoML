import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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
  const [distributionView, setDistributionView] = useState('categorical');
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
    { id: 'imbalance', label: '⚖️ Class Imbalance', icon: '⚖️' },
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
      case 'imbalance':
        return renderClassImbalance();
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
            <li><strong>Class Imbalance:</strong> {edaData.class_imbalance ? edaData.class_imbalance.length : 0} features</li>
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
            {edaData.class_imbalance && edaData.class_imbalance.length > 0 && (
              <li>Handling class imbalance using resampling or class weights</li>
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
                .sort(([, a], [, b]) => b.missing_pct - a.missing_pct)
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

  const renderClassImbalance = () => (
    <div className="slide-in">
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
          ⚖️ Class Imbalance Analysis
        </h3>
        {edaData.class_imbalance && edaData.class_imbalance.length > 0 && (
          <span style={{
            backgroundColor: 'var(--warning-color)',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            {edaData.class_imbalance.length} imbalanced features
          </span>
        )}
      </div>

      {(!edaData.class_imbalance || edaData.class_imbalance.length === 0) ? (
        <div className="success">
          <h4>✅ No Significant Class Imbalance</h4>
          <p>No categorical features show extreme class dominance (&gt;75%).</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Dominant Class</th>
                <th>Dominance %</th>
                <th>Unique Classes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {edaData.class_imbalance.map((item, index) => (
                <tr key={index}>
                  <td><strong>{item.column}</strong></td>
                  <td>{item.top_class}</td>
                  <td>
                    <span style={{
                      fontWeight: 'bold',
                      color: item.dominance_pct > 90 ? 'var(--danger-color)' : 'var(--warning-color)'
                    }}>
                      {item.dominance_pct}%
                    </span>
                  </td>
                  <td>{item.unique_classes}</td>
                  <td>
                    {item.dominance_pct > 90 ? (
                      <span style={{
                        backgroundColor: 'var(--danger-color)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        Critical
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: 'var(--warning-color)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        High
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="info" style={{ marginTop: '20px' }}>
            <p><strong>Recommendation:</strong> For features with critical imbalance (&gt;90%), consider using techniques like oversampling (SMOTE) or undersampling if this feature is the target variable.</p>
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

        {/* Toggle Switch */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setDistributionView('categorical')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: distributionView === 'categorical' ? 'var(--info-color)' : 'transparent',
              color: distributionView === 'categorical' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            Categorical ({Object.keys(edaData.categorical_distributions).length})
          </button>
          <button
            onClick={() => setDistributionView('numerical')}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: distributionView === 'numerical' ? 'var(--success-color)' : 'transparent',
              color: distributionView === 'numerical' ? 'white' : 'var(--text-color)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
          >
            Numerical ({Object.keys(edaData.numerical_distributions).length})
          </button>
        </div>
      </div>

      {/* Categorical Distributions */}
      {distributionView === 'categorical' && (
        <>
          {Object.keys(edaData.categorical_distributions).length > 0 ? (
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
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={data.labels.slice(0, 10).map((l, i) => ({ name: l, value: data.counts[i] }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 10 }}
                          width={80}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-color)'
                          }}
                        />
                        <Bar dataKey="value" fill="var(--info-color)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    {data.labels.length > 10 && (
                      <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px', textAlign: 'center' }}>
                        Showing top 10 categories ({data.labels.length - 10} more...)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="info">
              <p>No categorical features found in this dataset.</p>
            </div>
          )}
        </>
      )}

      {/* Numerical Distributions */}
      {distributionView === 'numerical' && (
        <>
          {Object.keys(edaData.numerical_distributions).length > 0 ? (
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
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.counts.map((c, i) => ({
                        name: i,
                        range: `${data.bins[i].toFixed(1)} - ${data.bins[i + 1]?.toFixed(1) || 'End'}`,
                        value: c
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-color)'
                          }}
                          labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                              return `Range: ${payload[0].payload.range}`;
                            }
                            return `Bin: ${label}`;
                          }}
                        />
                        <Bar dataKey="value" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
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
          ) : (
            <div className="info">
              <p>No numerical features found in this dataset.</p>
            </div>
          )}
        </>
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
