import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const PreprocessComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { addError } = useAppContext();
  const [searchParams] = useSearchParams();
  const targetColumn = searchParams.get('target') || '';

  const [formData, setFormData] = useState({
    numeric_impute: 'median',
    categorical_impute: 'most_frequent',
    numeric_fill_value: '',
    categorical_fill_value: '',
    scaling: 'standard',
    encoding: 'onehot',
    outlier_action: 'no_action',
    outlier_method: 'iqr',
    target_column: targetColumn,
    test_size: 0.2
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.target_column.trim()) {
      addError({
        type: 'error',
        title: 'Validation Error',
        message: 'Please specify a target column'
      });
      return false;
    }

    // Validate fill values for constant imputation
    if (formData.numeric_impute === 'constant' && !formData.numeric_fill_value) {
      addError({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a numeric fill value for constant imputation'
      });
      return false;
    }

    if (formData.categorical_impute === 'constant' && !formData.categorical_fill_value) {
      addError({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide a categorical fill value for constant imputation'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Clean up empty fill values - send null instead of empty strings
      const cleanedData = {
        ...formData,
        numeric_fill_value: formData.numeric_fill_value === '' ? null : parseFloat(formData.numeric_fill_value),
        categorical_fill_value: formData.categorical_fill_value === '' ? null : formData.categorical_fill_value
      };

      const response = await apiClient.preprocessDataset(datasetId, cleanedData);

      if (response.error) {
        addError({
          type: 'error',
          title: 'Preprocessing Failed',
          message: response.message
        });
        return;
      }

      setResult(response.data);
    } catch (err) {
      addError({
        type: 'error',
        title: 'Processing Error',
        message: 'An unexpected error occurred during preprocessing'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    await handleSubmit({ preventDefault: () => {} });
    setRetrying(false);
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Data Preprocessing</h1>
          <p className="card-subtitle">Configure data transformations for optimal model performance</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Settings */}
          <div style={{ marginBottom: '32px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>⚙️ Basic Configuration</h3>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>
            </div>

            <div className="grid grid-2">
              <div>
                <h4 style={{ color: 'var(--secondary-color)', marginBottom: '16px' }}>
                  🔧 Missing Value Handling
                </h4>

                <div className="form-group">
                  <label className="label">Numeric Features</label>
                  <select
                    name="numeric_impute"
                    value={formData.numeric_impute}
                    onChange={handleInputChange}
                    className="select"
                  >
                    <option value="mean">Mean</option>
                    <option value="median">Median</option>
                    <option value="most_frequent">Most Frequent</option>
                    <option value="constant">Constant Value</option>
                  </select>
                </div>

                {formData.numeric_impute === 'constant' && (
                  <div className="form-group">
                    <label className="label">Fill Value</label>
                    <input
                      type="number"
                      name="numeric_fill_value"
                      value={formData.numeric_fill_value}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="e.g., 0"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="label">Categorical Features</label>
                  <select
                    name="categorical_impute"
                    value={formData.categorical_impute}
                    onChange={handleInputChange}
                    className="select"
                  >
                    <option value="most_frequent">Most Frequent</option>
                    <option value="constant">Constant Value</option>
                  </select>
                </div>

                {formData.categorical_impute === 'constant' && (
                  <div className="form-group">
                    <label className="label">Fill Value</label>
                    <input
                      type="text"
                      name="categorical_fill_value"
                      value={formData.categorical_fill_value}
                      onChange={handleInputChange}
                      className="input"
                      placeholder="e.g., Unknown"
                    />
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ color: 'var(--secondary-color)', marginBottom: '16px' }}>
                  📊 Feature Scaling
                </h4>

                <div className="form-group">
                  <label className="label">Scaling Method</label>
                  <select
                    name="scaling"
                    value={formData.scaling}
                    onChange={handleInputChange}
                    className="select"
                  >
                    <option value="standard">Standard Scaler (Z-score)</option>
                    <option value="minmax">Min-Max Scaler (0-1)</option>
                    <option value="robust">Robust Scaler</option>
                    <option value="none">No Scaling</option>
                  </select>
                </div>

                <div className="info" style={{ marginTop: '16px' }}>
                  <strong>💡 Scaling Recommendation:</strong> Standard Scaler works well for most cases.
                  Use Min-Max if you need bounded values [0,1].
                </div>

                <div className="form-group" style={{ marginTop: '24px' }}>
                  <label className="label">
                    Test Set Size: {parseFloat(formData.test_size).toFixed(2)} ({Math.round(formData.test_size * 100)}%)
                  </label>
                  <input
                    type="range"
                    name="test_size"
                    min="0.1"
                    max="0.5"
                    step="0.05"
                    value={formData.test_size}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                    <span>10%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>
                🔬 Advanced Configuration
              </h3>

              <div className="grid grid-2">
                <div>
                  <h4 style={{ color: 'var(--warning-color)', marginBottom: '16px' }}>
                    🎯 Categorical Encoding
                  </h4>

                  <div className="form-group">
                    <label className="label">Encoding Method</label>
                    <select
                      name="encoding"
                      value={formData.encoding}
                      onChange={handleInputChange}
                      className="select"
                    >
                      <option value="onehot">One-Hot Encoding</option>
                      <option value="label">Label Encoding</option>
                      <option value="ordinal">Ordinal Encoding</option>
                    </select>
                  </div>

                  <div className="info">
                    <strong>📝 Encoding Guide:</strong><br />
                    • One-Hot: Best for nominal categories<br />
                    • Label: Simple ordinal data<br />
                    • Ordinal: Maintains order relationships
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--danger-color)', marginBottom: '16px' }}>
                    ⚠️ Outlier Handling
                  </h4>

                  <div className="form-group">
                    <label className="label">Outlier Action</label>
                    <select
                      name="outlier_action"
                      value={formData.outlier_action}
                      onChange={handleInputChange}
                      className="select"
                    >
                      <option value="no_action">No Action</option>
                      <option value="remove">Remove Outliers</option>
                      <option value="capping">Cap Outliers</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="label">Detection Method</label>
                    <select
                      name="outlier_method"
                      value={formData.outlier_method}
                      onChange={handleInputChange}
                      className="select"
                    >
                      <option value="iqr">IQR Method (Robust)</option>
                      <option value="zscore">Z-Score Method</option>
                    </select>
                  </div>

                  <div className="warning">
                    <strong>⚠️ Caution:</strong> Removing outliers can reduce dataset size.
                    Consider domain knowledge before applying.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Target Column Display */}
          <div className="info" style={{ marginBottom: '24px' }}>
            <strong>🎯 Target Column:</strong> {targetColumn || 'Not specified'}
            {targetColumn && (
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                (This column will be excluded from feature processing)
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex-center" style={{ gap: '12px' }}>
            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
              style={{ minWidth: '160px' }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block',
                    marginRight: '8px'
                  }}></div>
                  Processing...
                </>
              ) : (
                '🚀 Apply Preprocessing'
              )}
            </button>
          </div>
        </form>

        {/* Results Display */}
        {result && (
          <div className="slide-in" style={{ marginTop: '32px' }}>
            <div className="card" style={{ border: '2px solid var(--success-color)' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: 'var(--success-color)' }}>
                  ✅ Preprocessing Complete
                </h3>
                <p className="card-subtitle">Data transformation applied successfully</p>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-3" style={{ marginBottom: '24px' }}>
                <div className="success" style={{ textAlign: 'center' }}>
                  <h4>📊 Data Quality</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>
                    {result.diff_data ? result.diff_data.missing_reduction : 0}
                  </div>
                  <div style={{ fontSize: '14px' }}>Missing values resolved</div>
                </div>

                <div className="info" style={{ textAlign: 'center' }}>
                  <h4>🔧 Transformations</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>
                    ✓
                  </div>
                  <div style={{ fontSize: '14px' }}>Applied successfully</div>
                </div>

                <div className="warning" style={{ textAlign: 'center' }}>
                  <h4>📈 Ready for Training</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0' }}>
                    🚀
                  </div>
                  <div style={{ fontSize: '14px' }}>Model-ready data</div>
                </div>
              </div>

              {/* Detailed Metrics */}
              {result.diff_data && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>
                    📊 Transformation Summary
                  </h4>
                  <div className="grid grid-2">
                    <div>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>Before</th>
                            <th>After</th>
                            <th>Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>Missing Values</strong></td>
                            <td>{result.diff_data.original_missing.toLocaleString()}</td>
                            <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                              {result.diff_data.processed_missing.toLocaleString()}
                            </td>
                            <td style={{
                              color: result.diff_data.missing_reduction > 0 ? 'var(--success-color)' : 'var(--text-color)',
                              fontWeight: result.diff_data.missing_reduction > 0 ? 'bold' : 'normal'
                            }}>
                              {result.diff_data.missing_reduction > 0 ? '-' : ''}
                              {Math.abs(result.diff_data.missing_reduction).toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Dataset Shape</strong></td>
                            <td>{result.diff_data.original_shape.join(' × ')}</td>
                            <td style={{ fontWeight: 'bold' }}>
                              {result.diff_data.processed_shape.join(' × ')}
                            </td>
                            <td>
                              {result.diff_data.shape_change[0] !== 0 &&
                                `${result.diff_data.shape_change[0]} rows`}
                              {result.diff_data.shape_change[0] !== 0 && result.diff_data.shape_change[1] !== 0 && ', '}
                              {result.diff_data.shape_change[1] !== 0 &&
                                `${result.diff_data.shape_change[1]} cols`}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <div className="info">
                        <h5>🔄 Applied Transformations</h5>
                        <ul style={{ marginTop: '8px', textAlign: 'left' }}>
                          <li><strong>Imputation:</strong> {formData.numeric_impute} (numeric), {formData.categorical_impute} (categorical)</li>
                          <li><strong>Scaling:</strong> {formData.scaling.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                          <li><strong>Encoding:</strong> {formData.encoding.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                          {formData.outlier_action !== 'no_action' && (
                            <li><strong>Outliers:</strong> {formData.outlier_action} using {formData.outlier_method.toUpperCase()}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {result.preview && result.preview.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>
                    👀 Data Preview (First 10 Rows)
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          {result.preview.length > 0 && Object.keys(result.preview[0]).map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.preview.slice(0, 5).map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex}>
                                {value !== null && value !== undefined ? String(value).slice(0, 20) : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.preview.length > 5 && (
                    <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
                      Showing first 5 rows of {result.preview.length} total rows
                    </p>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex-between">
                <button
                  className="button button-secondary"
                  onClick={() => navigate(`/issues/${datasetId}`)}
                >
                  ← Back to Issues
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="button button-secondary"
                    onClick={handleRetry}
                    disabled={retrying}
                  >
                    {retrying ? '🔄 Retrying...' : '🔄 Re-run'}
                  </button>

                  <button
                    className="button button-primary"
                    onClick={() => navigate(`/train/${datasetId}`)}
                  >
                    Continue to Training →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreprocessComponent;
