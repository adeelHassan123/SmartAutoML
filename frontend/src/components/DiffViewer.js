import React from 'react';

const DiffViewer = ({ beforeData, afterData, title }) => {
  if (!beforeData || !afterData) {
    return <div className="error">No data available for comparison</div>;
  }

  // Get common columns
  const beforeColumns = beforeData.length > 0 ? Object.keys(beforeData[0]) : [];
  const afterColumns = afterData.length > 0 ? Object.keys(afterData[0]) : [];
  const allColumns = [...new Set([...beforeColumns, ...afterColumns])];

  return (
    <div style={{ marginTop: '20px' }}>
      <h4>{title || 'Before/After Comparison'}</h4>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h5 style={{ color: '#dc3545' }}>Before Preprocessing</h5>
          <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {allColumns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {beforeData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {allColumns.map(col => (
                      <td key={col}>
                        {row[col] !== undefined ? String(row[col]).slice(0, 20) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h5 style={{ color: '#28a745' }}>After Preprocessing</h5>
          <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  {allColumns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {afterData.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {allColumns.map(col => (
                      <td key={col}>
                        {row[col] !== undefined ? String(row[col]).slice(0, 20) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
