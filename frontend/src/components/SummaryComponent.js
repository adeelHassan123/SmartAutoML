import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    dtype.includes('object') || dtype.includes('string') || dtype.includes('category')
  ).length;

  const hasNumericalStats = summary.numerical_stats && Object.keys(summary.numerical_stats).length > 0;
  const hasCategoricalDistributions = summary.categorical_distributions && Object.keys(summary.categorical_distributions).length > 0;

  // Helper function to convert distribution object to chart data format
  const prepareChartData = (distribution) => {
    return Object.entries(distribution).map(([label, count]) => ({
      name: label === 'NaN' ? 'Missing' : String(label).substring(0, 20), // Truncate long labels
      value: count,
      fullLabel: label === 'NaN' ? 'Missing' : label
    }));
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Dataset Summary</h1>
          <p className="card-subtitle">Overview of your uploaded dataset</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-4" style={{ marginBottom: '32px' }}>
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
              {numericColumns}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Numerical Features
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
              color: 'var(--info-color)',
              marginBottom: '8px'
            }}>
              🏷️
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--info-color)'
            }}>
              {categoricalColumns}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              Categorical Features
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
                      {(dtype.includes('object') || dtype.includes('string') || dtype.includes('category')) && (
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

        {/* Numerical Statistics */}
        {hasNumericalStats && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              color: 'var(--primary-color)',
              marginBottom: '16px',
              fontSize: '18px'
            }}>
              📊 Numerical Statistics
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Statistic</th>
                    {Object.keys(summary.numerical_stats).map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.numerical_stats[Object.keys(summary.numerical_stats)[0]] &&
                    ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'].map(stat => (
                      summary.numerical_stats[Object.keys(summary.numerical_stats)[0]][stat] !== undefined && (
                        <tr key={stat}>
                          <td><strong>{stat}</strong></td>
                          {Object.keys(summary.numerical_stats).map(col => (
                            <td key={col}>
                              {summary.numerical_stats[col][stat] !== undefined ?
                                (typeof summary.numerical_stats[col][stat] === 'number' ?
                                  summary.numerical_stats[col][stat].toFixed(2) :
                                  summary.numerical_stats[col][stat]) :
                                '-'}
                            </td>
                          ))}
                        </tr>
                      )
                    ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Categorical Class Distributions */}
        {hasCategoricalDistributions && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              color: 'var(--primary-color)',
              marginBottom: '16px',
              fontSize: '18px'
            }}>
              🏷️ Class Distributions
            </h3>
            <div className="grid grid-2" style={{ gap: '24px' }}>
              {Object.entries(summary.categorical_distributions).slice(0, 6).map(([column, distribution]) => {
                const chartData = prepareChartData(distribution);
                const sortedData = chartData.sort((a, b) => b.value - a.value).slice(0, 15); // Top 15 classes

                return (
                  <div key={column} style={{
                    backgroundColor: 'var(--card-bg)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <h4 style={{
                      marginBottom: '16px',
                      color: 'var(--primary-color)',
                      fontSize: '16px'
                    }}>
                      {column}
                    </h4>

                    {sortedData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sortedData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px'
                            }}
                            cursor={{ fill: 'rgba(139, 69, 19, 0.1)' }}
                            formatter={(value, name) => {
                              if (name === 'value') {
                                const percentage = ((value / summary.shape[0]) * 100).toFixed(1);
                                return [`${value} (${percentage}%)`, 'Count'];
                              }
                              return value;
                            }}
                            labelFormatter={(label) => `Class: ${label}`}
                          />
                          <Bar dataKey="value" fill="var(--secondary-color)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.6 }}>
                        No data available
                      </div>
                    )}

                    {sortedData.length < Object.keys(distribution).length && (
                      <div style={{
                        fontSize: '12px',
                        opacity: 0.6,
                        textAlign: 'center',
                        marginTop: '12px'
                      }}>
                        Showing top {sortedData.length} out of {Object.keys(distribution).length} classes
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {Object.keys(summary.categorical_distributions).length > 6 && (
              <p style={{
                fontSize: '14px',
                opacity: 0.7,
                marginTop: '16px',
                textAlign: 'center'
              }}>
                Showing distributions for first 6 categorical columns.
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
