import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const SummaryComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { addError } = useAppContext();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [datasetId]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const result = await apiClient.getSummary(datasetId);

      if (result.error) {
        addError({
          type: 'error',
          title: 'Failed to Load Summary',
          message: result.message
        });
        return;
      }

      setSummary(result.data);
    } catch (err) {
      addError({
        type: 'error',
        title: 'Summary Error',
        message: 'An unexpected error occurred while loading the summary'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await fetchSummary();
    setRetrying(false);
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Analyzing your dataset...</div>
            <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
              This may take a moment for large datasets
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="fade-in">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Dataset Summary</h1>
            <p className="card-subtitle">Unable to load dataset information</p>
          </div>

          <div className="error">
            <h3>❌ Summary Unavailable</h3>
            <p>The dataset summary could not be loaded. This might be due to:</p>
            <ul style={{ textAlign: 'left', margin: '12px 0' }}>
              <li>Invalid dataset ID</li>
              <li>Server connection issues</li>
              <li>Dataset processing errors</li>
              <li>Dataset was automatically cleaned up (inactive for 24+ hours)</li>
            </ul>
          </div>

          <div className="flex-center" style={{ gap: '12px' }}>
            <button
              className="button button-secondary"
              onClick={() => navigate('/')}
              disabled={retrying}
            >
              ← Back to Upload
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

  // Helper function to get data type color
  const getDataTypeColor = (dtype) => {
    if (dtype.includes('int') || dtype.includes('float')) return 'var(--success-color)';
    if (dtype.includes('object') || dtype.includes('string')) return 'var(--info-color)';
    if (dtype.includes('bool')) return 'var(--warning-color)';
    return 'var(--text-color)';
  };

  // Calculate summary statistics
  const totalColumns = summary.shape[1];
  const numericColumns = Object.values(summary.dtypes).filter(dtype =>
    dtype.includes('int') || dtype.includes('float')
  ).length;
  const categoricalColumns = Object.values(summary.dtypes).filter(dtype =>
    dtype.includes('object') || dtype.includes('string')
  ).length;

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Dataset Summary</h1>
          <p className="card-subtitle">Overview of your uploaded dataset</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-3" style={{ marginBottom: '32px' }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              color: 'var(--primary-color)',
              marginBottom: '8px'
            }}>
              📊
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--primary-color)'
            }}>
              {summary.shape[0].toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Total Rows
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              color: 'var(--secondary-color)',
              marginBottom: '8px'
            }}>
              📋
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--secondary-color)'
            }}>
              {totalColumns}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Total Columns
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '32px',
              color: 'var(--success-color)',
              marginBottom: '8px'
            }}>
              📈
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--success-color)'
            }}>
              {numericColumns + categoricalColumns}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Features Available
            </div>
          </div>
        </div>

        {/* Dataset Shape */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            color: 'var(--primary-color)',
            marginBottom: '16px',
            fontSize: '18px'
          }}>
            📏 Dataset Dimensions
          </h3>
          <div className="info" style={{ textAlign: 'center' }}>
            <strong>{summary.shape[0].toLocaleString()} rows × {summary.shape[1]} columns</strong>
            <br />
            <span style={{ fontSize: '14px', opacity: 0.8 }}>
              {numericColumns} numeric, {categoricalColumns} categorical features
            </span>
          </div>
        </div>

        {/* Column Types */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            color: 'var(--primary-color)',
            marginBottom: '16px',
            fontSize: '18px'
          }}>
            🏷️ Column Types
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Data Type</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.dtypes).map(([column, dtype]) => (
                  <tr key={column}>
                    <td>
                      <strong>{column}</strong>
                    </td>
                    <td>
                      <span style={{
                        color: getDataTypeColor(dtype),
                        fontWeight: '500'
                      }}>
                        {dtype}
                      </span>
                    </td>
                    <td>
                      {(dtype.includes('int') || dtype.includes('float')) && (
                        <span style={{
                          backgroundColor: 'var(--success-color)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Numeric
                        </span>
                      )}
                      {(dtype.includes('object') || dtype.includes('string')) && (
                        <span style={{
                          backgroundColor: 'var(--info-color)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Categorical
                        </span>
                      )}
                      {dtype.includes('bool') && (
                        <span style={{
                          backgroundColor: 'var(--warning-color)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          Boolean
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics Preview */}
        {summary.stats && Object.keys(summary.stats).length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              color: 'var(--primary-color)',
              marginBottom: '16px',
              fontSize: '18px'
            }}>
              📊 Statistical Summary
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Statistic</th>
                    {Object.keys(summary.stats).slice(0, 5).map(col => (
                      <th key={col}>{col}</th>
                    ))}
                    {Object.keys(summary.stats).length > 5 && (
                      <th>+{Object.keys(summary.stats).length - 5} more</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {summary.stats[Object.keys(summary.stats)[0]] &&
                    ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'].map(stat => (
                      summary.stats[Object.keys(summary.stats)[0]][stat] !== undefined && (
                        <tr key={stat}>
                          <td><strong>{stat}</strong></td>
                          {Object.keys(summary.stats).slice(0, 5).map(col => (
                            <td key={col}>
                              {summary.stats[col][stat] !== undefined ?
                                (typeof summary.stats[col][stat] === 'number' ?
                                  summary.stats[col][stat].toFixed(2) :
                                  summary.stats[col][stat]) :
                                '-'}
                            </td>
                          ))}
                          {Object.keys(summary.stats).length > 5 && (
                            <td style={{ opacity: 0.6 }}>...</td>
                          )}
                        </tr>
                      )
                    ))}
                </tbody>
              </table>
            </div>
            {Object.keys(summary.stats).length > 5 && (
              <p style={{
                fontSize: '14px',
                opacity: 0.7,
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Showing statistics for first 5 columns.
                Full analysis available in EDA section.
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex-between" style={{ marginTop: '32px' }}>
          <button
            className="button button-secondary"
            onClick={() => navigate('/')}
          >
            ← Back to Upload
          </button>

          <button
            className="button button-primary"
            onClick={() => navigate(`/eda/${datasetId}`)}
          >
            Continue to EDA →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryComponent;
