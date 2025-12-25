import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ReportComponent = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.downloadReport(datasetId, 'markdown');

        // Handle different response formats
        let text;
        if (response && response.data) {
          if (response.data instanceof Blob) {
            text = await response.data.text();
          } else if (typeof response.data === 'string') {
            text = response.data;
          } else {
            text = JSON.stringify(response.data, null, 2);
          }
        } else if (response instanceof Blob) {
          text = await response.text();
        } else if (typeof response === 'string') {
          text = response;
        } else {
          text = JSON.stringify(response, null, 2);
        }

        // Validate that we got meaningful content
        if (!text || text.trim().length === 0) {
          throw new Error('Report is empty or could not be generated');
        }

        setReport(text);
      } catch (err) {
        console.error('Report fetch error:', err);
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) {
      fetchReport();
    }
  }, [datasetId]);

  const handleDownload = () => {
    try {
      const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `automl_report_${datasetId}_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download report');
    }
  };

  const handleBackToResults = () => {
    navigate(`/results/${datasetId}`);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">📄 Generating comprehensive report...</div>
        <p style={{ marginTop: '10px', opacity: 0.8 }}>
          This may take a moment as we compile all analysis results
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="error" style={{ textAlign: 'center', padding: '40px' }}>
          <h2>❌ Report Generation Failed</h2>
          <p>{error}</p>
          <div style={{ marginTop: '20px' }}>
            <button
              className="button"
              onClick={() => window.location.reload()}
              style={{ marginRight: '10px' }}
            >
              🔄 Retry
            </button>
            <button
              className="button button-secondary"
              onClick={handleBackToResults}
            >
              ← Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="card-title">📊 Complete AutoML Report</h1>
              <p className="card-subtitle">Comprehensive analysis and model training results for dataset {datasetId}</p>
            </div>
            <button
              className="button button-secondary"
              onClick={handleBackToResults}
              style={{ fontSize: '14px' }}
            >
              ← Back to Results
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
          <button className="button button-primary" onClick={handleDownload}>
            ⬇️ Download as Markdown
          </button>
        </div>

        <div
          className="report-container"
          style={{
            backgroundColor: 'var(--background-color, #ffffff)',
            padding: '24px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            maxHeight: '80vh',
            overflowY: 'auto',
            lineHeight: '1.6',
            fontSize: '15px'
          }}
        >
          {report ? (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, ...props }) => (
                    <h1
                      style={{
                        fontSize: '28px',
                        marginTop: '30px',
                        marginBottom: '15px',
                        color: 'var(--primary-color)',
                        borderBottom: '3px solid var(--primary-color)',
                        paddingBottom: '10px',
                        fontWeight: 'bold'
                      }}
                      {...props}
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2
                      style={{
                        fontSize: '24px',
                        marginTop: '25px',
                        marginBottom: '12px',
                        color: 'var(--secondary-color)',
                        borderBottom: '2px solid var(--secondary-color)',
                        paddingBottom: '8px',
                        fontWeight: '600'
                      }}
                      {...props}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3
                      style={{
                        fontSize: '20px',
                        marginTop: '20px',
                        marginBottom: '10px',
                        color: '#444',
                        fontWeight: '600'
                      }}
                      {...props}
                    >
                      {children}
                    </h3>
                  ),
                  h4: ({ children, ...props }) => (
                    <h4
                      style={{
                        fontSize: '18px',
                        marginTop: '15px',
                        marginBottom: '8px',
                        color: '#555',
                        fontWeight: '600'
                      }}
                      {...props}
                    >
                      {children}
                    </h4>
                  ),
                  p: ({ children, ...props }) => (
                    <p
                      style={{
                        marginBottom: '15px',
                        lineHeight: '1.7',
                        color: 'var(--text-color, #333)'
                      }}
                      {...props}
                    >
                      {children}
                    </p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul
                      style={{
                        marginLeft: '30px',
                        marginBottom: '15px',
                        listStyle: 'disc',
                        color: 'var(--text-color, #333)'
                      }}
                      {...props}
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol
                      style={{
                        marginLeft: '30px',
                        marginBottom: '15px',
                        listStyle: 'decimal',
                        color: 'var(--text-color, #333)'
                      }}
                      {...props}
                    >
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li
                      style={{
                        marginBottom: '8px',
                        lineHeight: '1.6'
                      }}
                      {...props}
                    >
                      {children}
                    </li>
                  ),
                  code: ({ children, ...props }) => (
                    <code
                      style={{
                        backgroundColor: 'var(--code-bg, #f8f9fa)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
                        fontSize: '14px',
                        color: 'var(--code-color, #d73a49)',
                        border: '1px solid var(--border-color, #e1e4e8)'
                      }}
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                  pre: ({ children, ...props }) => (
                    <pre
                      style={{
                        backgroundColor: 'var(--code-bg, #f8f9fa)',
                        padding: '16px',
                        borderRadius: '8px',
                        overflowX: 'auto',
                        fontSize: '13px',
                        border: '1px solid var(--border-color, #e1e4e8)',
                        marginBottom: '15px'
                      }}
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote
                      style={{
                        borderLeft: '4px solid var(--primary-color)',
                        paddingLeft: '20px',
                        marginLeft: '0',
                        marginBottom: '15px',
                        color: 'var(--text-secondary, #666)',
                        fontStyle: 'italic',
                        backgroundColor: 'var(--blockquote-bg, #f8f9fa)',
                        padding: '10px 20px',
                        borderRadius: '0 4px 4px 0'
                      }}
                      {...props}
                    >
                      {children}
                    </blockquote>
                  ),
                  table: ({ children, ...props }) => (
                    <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          border: '1px solid var(--border-color, #ddd)',
                          fontSize: '14px'
                        }}
                        {...props}
                      >
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children, ...props }) => (
                    <th
                      style={{
                        backgroundColor: 'var(--table-header-bg, #f8f9fa)',
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        borderBottom: '2px solid var(--border-color, #ddd)',
                        borderRight: '1px solid var(--border-color, #ddd)',
                        color: 'var(--text-color, #333)'
                      }}
                      {...props}
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td
                      style={{
                        padding: '10px 15px',
                        borderBottom: '1px solid var(--border-color, #eee)',
                        borderRight: '1px solid var(--border-color, #eee)',
                        color: 'var(--text-color, #333)'
                      }}
                      {...props}
                    >
                      {children}
                    </td>
                  ),
                }}
              >
                {report}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-secondary, #666)',
              fontStyle: 'italic'
            }}>
              <p>📄 No report content available</p>
              <p>This might happen if training hasn't completed yet or if there was an error generating the report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportComponent;
