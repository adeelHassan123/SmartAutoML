import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const PreprocessComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { addError } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [targetCandidates, setTargetCandidates] = useState([]);

  const [formData, setFormData] = useState({
    numeric_impute: 'median',
    categorical_impute: 'most_frequent',
    numeric_fill_value: '',
    categorical_fill_value: '',
    scaling: 'standard',
    encoding: 'onehot',
    outlier_action: 'no_action',
    outlier_method: 'iqr',
    target_column: '',
    test_size: 0.2
  });

  useEffect(() => {
    fetchDatasetSummary();
  }, [datasetId]);

  const fetchDatasetSummary = async () => {
    setLoading(true);
    try {
      const result = await apiClient.getSummary(datasetId);
      if (result.error) {
        addError({
          type: 'error',
          title: 'Summary Failed',
          message: result.message
        });
        return;
      }
      
      // Extract column names for target selection
      if (result.data && result.data.dtypes) {
        const columns = Object.keys(result.data.dtypes);
        setTargetCandidates(columns);
        if (columns.length > 0 && !formData.target_column) {
            setFormData(prev => ({ ...prev, target_column: columns[columns.length - 1] }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.target_column) {
      addError({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please select a target column'
      });
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        ...formData,
        numeric_fill_value: formData.numeric_impute === 'constant' ? parseFloat(formData.numeric_fill_value) : null,
        categorical_fill_value: formData.categorical_impute === 'constant' ? formData.categorical_fill_value : null,
        test_size: parseFloat(formData.test_size)
      };

      const result = await apiClient.preprocessDataset(datasetId, payload);
      
      if (result.error) {
        addError({
          type: 'error',
          title: 'Preprocessing Failed',
          message: result.message
        });
        return;
      }

      navigate(`/train/${datasetId}`);
    } catch (err) {
      addError({
        type: 'error',
        title: 'Processing Error',
        message: 'An unexpected error occurred during preprocessing'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="loading-spinner"></div><p>Loading dataset details...</p></div>;
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Data Preprocessing</h1>
          <p className="card-subtitle">Configure how your data should be cleaned and prepared for training.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            {/* Basic Config */}
            <div className="section">
              <h3>🎯 Target & Basics</h3>
              <div className="form-group">
                <label>Target Column (Value to Predict)</label>
                <select 
                  name="target_column" 
                  value={formData.target_column} 
                  onChange={handleInputChange} 
                  className="input"
                  required
                >
                  <option value="">Select Target...</option>
                  {targetCandidates.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Test Set Size ({Math.round(formData.test_size * 100)}%)</label>
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
                <div className="flex-between" style={{ fontSize: '12px', opacity: 0.7 }}>
                   <span>10%</span>
                   <span>50%</span>
                </div>
              </div>
            </div>

            {/* Imputation */}
            <div className="section">
              <h3>🧼 Missing Data (Imputation)</h3>
              <div className="form-group">
                <label>Numeric Columns</label>
                <select name="numeric_impute" value={formData.numeric_impute} onChange={handleInputChange} className="input">
                  <option value="mean">Mean (Average)</option>
                  <option value="median">Median (Middle Value)</option>
                  <option value="constant">Constant Value</option>
                </select>
              </div>
              {formData.numeric_impute === 'constant' && (
                <input 
                  type="number" 
                  name="numeric_fill_value" 
                  placeholder="Value to fill..." 
                  value={formData.numeric_fill_value} 
                  onChange={handleInputChange} 
                  className="input"
                />
              )}
            </div>

            {/* Scaling & Encoding */}
            <div className="section">
              <h3>📐 Scaling & Encoding</h3>
              <div className="form-group">
                <label>Feature Scaling</label>
                <select name="scaling" value={formData.scaling} onChange={handleInputChange} className="input">
                  <option value="standard">Standard Scaler (Z-Score)</option>
                  <option value="minmax">Min-Max Scaler (0-1)</option>
                  <option value="robust">Robust Scaler (Handles Outliers)</option>
                  <option value="none">No Scaling</option>
                </select>
              </div>
              <div className="form-group">
                <label>Categorical Encoding</label>
                <select name="encoding" value={formData.encoding} onChange={handleInputChange} className="input">
                  <option value="onehot">One-Hot (Dummies)</option>
                  <option value="label">Label Encoding</option>
                  <option value="ordinal">Ordinal Encoding</option>
                </select>
              </div>
            </div>

            {/* Outliers */}
            <div className="section">
              <h3>🚨 Outlier Handling</h3>
              <div className="form-group">
                <label>Action</label>
                <select name="outlier_action" value={formData.outlier_action} onChange={handleInputChange} className="input">
                  <option value="no_action">Keep as is</option>
                  <option value="remove">Remove Rows</option>
                  <option value="capping">Cap/Clip Values</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-footer flex-center" style={{ marginTop: '24px' }}>
            <button 
                type="submit" 
                className={`button button-lg ${processing ? 'button-loading' : ''}`}
                disabled={processing}
            >
              {processing ? 'Processing Data...' : '✨ Apply & Continue to Training'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreprocessComponent;
