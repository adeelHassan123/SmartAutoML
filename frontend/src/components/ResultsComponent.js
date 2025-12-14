import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api';

const ResultsComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);

  const fetchResultsCallback = React.useCallback(() => {
    const fetchData = async (version = null) => {
      try {
        const res = await apiClient.getResults(datasetId, version);
        const data = res && res.error === true ? null : (res && res.data ? res.data : res);
        if (!data) {
          setError('No results available');
          return;
        }
        setResults(data);
        setSelectedVersion(version);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [datasetId]);

  useEffect(() => {
    fetchResultsCallback();
  }, [fetchResultsCallback]);

  const fetchResults = async (version = null) => {
    try {
      const res = await apiClient.getResults(datasetId, version);
      const data = res && res.error === true ? null : (res && res.data ? res.data : res);
      if (!data) {
        setError('No results available');
        setLoading(false);
        return;
      }
      setResults(data);
      setSelectedVersion(version);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (version) => {
    setLoading(true);
    fetchResults(version);
  };

  const handleDownloadReport = async (format) => {
    try {
      const res = await apiClient.downloadReport(datasetId, format);
      const blob = res && res.data ? res.data : res;
      const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `automl_report_${datasetId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download report: ${err.message}`);
    }
  };

  if (loading) return <div className="loading">Loading results...</div>;
  if (error) return <div className="error">{error}</div>;

  if (results.status !== 'done') {
    return (
      <div className="card">
        <h2>Training Results</h2>
        <div className="loading">
          <p>Training is still in progress. Status: {results.status}</p>
          <p>Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Model Training Results</h2>

      {results.versions && results.versions.length > 1 && (
        <div style={{ marginBottom: '20px' }}>
          <label className="label">Select Training Version:</label>
          <select
            value={selectedVersion || results.versions[0]}
            onChange={(e) => handleVersionChange(e.target.value)}
            className="select"
          >
            {results.versions.map(version => (
              <option key={version} value={version}>
                Version {version} ({new Date(parseInt(version) * 1000).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Best 3 Models Section */}
      {results.best_3_models && results.best_3_models.length > 0 && (
        <div style={{ marginBottom: '30px', backgroundColor: 'rgba(76, 175, 80, 0.05)', padding: '20px', borderRadius: '8px', border: '2px solid var(--success-color)' }}>
          <h3 style={{ color: 'var(--success-color)', marginTop: 0 }}>🎯 Recommended Models</h3>
          <p style={{ opacity: 0.8, marginBottom: '20px' }}>Top 3 models selected based on accuracy, stability, and performance:</p>
          
          {results.best_3_models.map((model, index) => (
            <div key={index} style={{ 
              marginBottom: index === results.best_3_models.length - 1 ? 0 : '20px',
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '6px',
              borderLeft: `4px solid ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>
                  {model.rank_medal} - {model.model}
                </h4>
                <strong style={{ fontSize: '18px', color: 'var(--success-color)' }}>
                  {(model.accuracy * 100).toFixed(2)}% Accuracy
                </strong>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '14px' }}>
                <div><strong>F1-Score:</strong> {model.f1_score ? model.f1_score.toFixed(4) : '-'}</div>
                <div><strong>ROC-AUC:</strong> {model.roc_auc ? model.roc_auc.toFixed(4) : '-'}</div>
                <div><strong>CV Mean:</strong> {model.cv_mean ? model.cv_mean.toFixed(4) : '-'}</div>
                <div><strong>Training Time:</strong> {model.training_time ? model.training_time.toFixed(2) : '-'}s</div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>✅ Why this model?</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  {model.reasons && model.reasons.map((reason, i) => (
                    <li key={i} style={{ marginBottom: '4px', fontSize: '14px' }}>{reason}</li>
                  ))}
                </ul>
              </div>
              
              <details style={{ fontSize: '13px', opacity: 0.8, cursor: 'pointer' }}>
                <summary>Best Hyperparameters</summary>
                <pre style={{ 
                  backgroundColor: '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                  marginTop: '8px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {model.best_params}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h3>📊 Complete Model Performance Comparison</h3>
        <p style={{ fontSize: '14px', opacity: 0.8 }}>All {results.comparison ? results.comparison.length : 0} trained models</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>ROC-AUC</th>
                <th>Training Time (s)</th>
                <th>CV Mean Score</th>
              </tr>
            </thead>
            <tbody>
              {results.comparison && results.comparison.map((row, index) => (
                <tr key={index}>
                  <td><strong>{row.Model}</strong></td>
                  <td>{typeof row.accuracy === 'number' ? row.accuracy.toFixed(4) : (row.accuracy ?? '-')}</td>
                  <td>{typeof row.precision === 'number' ? row.precision.toFixed(4) : (row.precision ?? '-')}</td>
                  <td>{typeof row.recall === 'number' ? row.recall.toFixed(4) : (row.recall ?? '-')}</td>
                  <td>{typeof row.f1_score === 'number' ? row.f1_score.toFixed(4) : (row.f1_score ?? '-')}</td>
                  <td>{typeof row.roc_auc === 'number' ? row.roc_auc.toFixed(4) : (row.roc_auc ?? '-')}</td>
                  <td>{typeof row.training_time === 'number' ? row.training_time.toFixed(2) : (row.training_time ?? '-')}</td>
                  <td>{typeof row.cv_mean === 'number' ? row.cv_mean.toFixed(4) : (row.cv_mean ?? '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>🏆 Model Ranking (by Accuracy)</h3>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Rank</th>
              <th>Model</th>
              <th style={{ width: '150px', textAlign: 'right' }}>Accuracy Score</th>
            </tr>
          </thead>
          <tbody>
            {results.ranked && results.ranked.map((row, index) => (
              <tr key={index} style={{ background: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'transparent' }}>
                <td>
                  <strong style={{ fontSize: '18px' }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${row.Rank}`}
                  </strong>
                </td>
                <td><strong>{row.Model}</strong></td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                  {typeof row.Score === 'number' ? (row.Score * 100).toFixed(2) : (row.Score ?? '-')}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <h3>Download Report</h3>
        <button
          className="button"
          onClick={() => handleDownloadReport('markdown')}
          style={{ marginRight: '10px' }}
        >
          Download Markdown Report
        </button>
        <button
          className="button"
          onClick={() => navigate(`/report/${datasetId}`)}
        >
          View Full Report
        </button>
      </div>
    </div>
  );
};

export default ResultsComponent;
