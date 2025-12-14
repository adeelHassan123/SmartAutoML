import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const TrainComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { addError } = useAppContext();

  const [formData, setFormData] = useState({
    models: ['Logistic Regression', 'Random Forest'],
    search_type: 'grid',
    cv: 5,
    scoring: 'f1_weighted',
    class_weight_auto: true
  });

  const [trainingStatus, setTrainingStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const availableModels = [
    'Logistic Regression',
    'Random Forest',
    'SVM',
    'Gradient Boosting',
    'XGBoost',
    'LightGBM',
    'K-Neighbors',
    'Decision Tree',
    'Naive Bayes'
  ];

  const handleModelChange = (model) => {
    setFormData(prev => ({
      ...prev,
      models: prev.models.includes(model)
        ? prev.models.filter(m => m !== model)
        : [...prev.models, model]
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.models.length === 0) {
      addError({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select at least one model to train'
      });
      return;
    }

    setLoading(true);

    try {
      const result = await apiClient.startTraining(datasetId, formData);

      if (result.error) {
        addError({
          type: 'error',
          title: 'Training Failed',
          message: result.message
        });
        return;
      }

      setTrainingStatus('running');
      setPolling(true);
    } catch (err) {
      addError({
        type: 'error',
        title: 'Training Error',
        message: 'Failed to start model training'
      });
    } finally {
      setLoading(false);
    }
  };

  // Poll for training status
  useEffect(() => {
    let interval;
    if (polling) {
      interval = setInterval(async () => {
        try {
          const result = await apiClient.getTrainingStatus(datasetId);

          if (result.error) {
            console.error('Status check failed:', result.message);
            return;
          }

          setTrainingStatus(result.data.status);

          if (result.data.status === 'done') {
            setPolling(false);
            setTimeout(() => navigate(`/results/${datasetId}`), 1000);
          } else if (result.data.status === 'error') {
            setPolling(false);
            addError({
              type: 'error',
              title: 'Training Failed',
              message: 'Model training encountered an error. Please try again.'
            });
          }
        } catch (err) {
          console.error('Status check failed:', err);
        }
      }, 3000); // Poll every 3 seconds for faster feedback
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, datasetId, navigate, addError]);

  return (
    <div className="card">
      <h2>Model Training</h2>

      {trainingStatus === 'running' ? (
        <div className="loading">
          <h3>Training in Progress</h3>
          <p>Models are being trained and evaluated. This may take several minutes...</p>
          <div style={{ marginTop: '20px' }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        </div>
      ) : trainingStatus === 'done' ? (
        <div className="success">
          <h3>Training Completed!</h3>
          <p>Redirecting to results...</p>
        </div>
      ) : trainingStatus === 'error' ? (
        <div className="error">
          <h3>Training Failed</h3>
          <p>Please try again or check your data preprocessing.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <h3>Select Models to Train</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {availableModels.map(model => (
                <label key={model} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={formData.models.includes(model)}
                    onChange={() => handleModelChange(model)}
                    style={{ marginRight: '8px' }}
                  />
                  {model}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3>Training Parameters</h3>

              <div className="form-group">
                <label className="label">Search Type:</label>
                <select
                  name="search_type"
                  value={formData.search_type}
                  onChange={handleInputChange}
                  className="select"
                >
                  <option value="grid">Grid Search</option>
                  <option value="random">Random Search</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Cross-Validation Folds:</label>
                <input
                  type="number"
                  name="cv"
                  value={formData.cv}
                  onChange={handleInputChange}
                  className="input"
                  min="2"
                  max="10"
                />
              </div>
            </div>

            <div>
              <h3>Evaluation Settings</h3>

              <div className="form-group">
                <label className="label">Scoring Metric:</label>
                <select
                  name="scoring"
                  value={formData.scoring}
                  onChange={handleInputChange}
                  className="select"
                >
                  <option value="accuracy">Accuracy</option>
                  <option value="f1_weighted">F1 Weighted</option>
                  <option value="precision_weighted">Precision Weighted</option>
                  <option value="recall_weighted">Recall Weighted</option>
                  <option value="roc_auc_ovr">ROC AUC OVR</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    name="class_weight_auto"
                    checked={formData.class_weight_auto}
                    onChange={handleInputChange}
                    style={{ marginRight: '8px' }}
                  />
                  Auto-adjust class weights for imbalanced data
                </label>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="submit"
              className="button"
              disabled={loading || formData.models.length === 0}
            >
              {loading ? 'Starting Training...' : 'Start Training'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TrainComponent;
