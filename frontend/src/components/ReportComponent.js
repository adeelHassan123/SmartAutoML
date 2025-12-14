import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api';
import ReactMarkdown from 'react-markdown';

const ReportComponent = () => {
  const { datasetId } = useParams();
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const blob = await apiClient.downloadReport(datasetId, 'markdown');
        
        // Convert blob to text
        let text;
        if (blob instanceof Blob) {
          text = await blob.text();
        } else if (typeof blob === 'string') {
          text = blob;
        } else {
          text = JSON.stringify(blob);
        }
        
        setReport(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [datasetId]);

  if (loading) return <div className="loading">📄 Generating report...</div>;
  if (error) return <div className="error">❌ Error: {error}</div>;

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automl_report_${datasetId}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">📊 AutoML Report</h1>
          <p className="card-subtitle">Complete analysis and model training results</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <button className="button button-primary" onClick={handleDownload}>
            ⬇️ Download as Markdown
          </button>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          maxHeight: '800px',
          overflowY: 'auto',
          lineHeight: '1.6'
        }}>
          {report ? (
            <div style={{
              fontSize: '15px',
              color: '#333'
            }}>
              <ReactMarkdown
                components={{
                  h1: ({node, children, ...props}) => <h1 style={{ fontSize: '28px', marginTop: '20px', marginBottom: '12px', color: 'var(--primary-color)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '8px' }} {...props}>{children}</h1>,
                  h2: ({node, children, ...props}) => <h2 style={{ fontSize: '22px', marginTop: '16px', marginBottom: '10px', color: 'var(--secondary-color)' }} {...props}>{children}</h2>,
                  h3: ({node, children, ...props}) => <h3 style={{ fontSize: '18px', marginTop: '14px', marginBottom: '8px', color: '#555' }} {...props}>{children}</h3>,
                  p: ({node, ...props}) => <p style={{ marginBottom: '12px', lineHeight: '1.7' }} {...props} />,
                  ul: ({node, ...props}) => <ul style={{ marginLeft: '24px', marginBottom: '12px', listStyle: 'disc' }} {...props} />,
                  ol: ({node, ...props}) => <ol style={{ marginLeft: '24px', marginBottom: '12px', listStyle: 'decimal' }} {...props} />,
                  li: ({node, ...props}) => <li style={{ marginBottom: '6px' }} {...props} />,
                  code: ({node, ...props}) => <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }} {...props} />,
                  pre: ({node, ...props}) => <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '6px', overflowX: 'auto', fontSize: '12px', border: '1px solid #ddd' }} {...props} />,
                  blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid var(--primary-color)', paddingLeft: '16px', marginLeft: '0', color: '#666', fontStyle: 'italic' }} {...props} />,
                  table: ({node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }} {...props} />,
                  th: ({node, ...props}) => <th style={{ backgroundColor: '#f0f0f0', padding: '10px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }} {...props} />,
                  td: ({node, ...props}) => <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }} {...props} />,
                }}
              >
                {report}
              </ReactMarkdown>
            </div>
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic' }}>No report content available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportComponent;
