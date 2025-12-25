import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import apiClient from '../api';

const UploadComponent = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addError } = useAppContext();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

    // Check file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      addError({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a CSV file (.csv extension required)'
      });
      return false;
    }

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      addError({
        type: 'error',
        title: 'File Too Large',
        message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
      return false;
    }

    // Basic content check (optional)
    if (selectedFile.size === 0) {
      addError({
        type: 'error',
        title: 'Empty File',
        message: 'The selected file appears to be empty'
      });
      return false;
    }

    return true;
  };

  const processFile = useCallback((selectedFile) => {
    if (!validateFile(selectedFile)) {
      setFile(null);
      setFilePreview(null);
      return;
    }

    setFile(selectedFile);

    // Create file preview
    const preview = {
      name: selectedFile.name,
      size: (selectedFile.size / 1024).toFixed(1) + ' KB',
      lastModified: new Date(selectedFile.lastModified).toLocaleDateString(),
    };
    setFilePreview(preview);
  }, [addError]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    processFile(selectedFile);
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
      // Update the file input
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(files[0]);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  }, [processFile]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file || loading) return;

    setLoading(true);

    try {
      const result = await apiClient.uploadDataset(file);

      if (result.error) {
        addError({
          type: 'error',
          title: 'Upload Failed',
          message: result.message
        });
        return;
      }

      // Success - navigate to summary
      navigate(`/summary/${result.data.dataset_id}`);
    } catch (err) {
      addError({
        type: 'error',
        title: 'Upload Error',
        message: 'An unexpected error occurred during upload'
      });
    } finally {
      setLoading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Upload Dataset</h1>
          <p className="card-subtitle">Start your AutoML journey by uploading a CSV file</p>
        </div>

        <form onSubmit={handleUpload}>
          {/* Drag & Drop Zone */}
          <div
            className={`upload-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
            style={{
              border: `2px dashed var(--border-color)`,
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: dragActive ? 'rgba(139, 69, 19, 0.05)' : 'transparent',
              marginBottom: '24px'
            }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              color: 'var(--primary-color)',
              opacity: dragActive ? 1 : 0.6
            }}>
              📊
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>Drag & drop your CSV file here</strong>
              <br />
              <span style={{ fontSize: '14px', opacity: 0.7 }}>
                or click to browse files
              </span>
            </div>

            <div style={{
              fontSize: '12px',
              opacity: 0.6,
              marginTop: '8px'
            }}>
              Supports CSV files up to 10MB
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* File Preview */}
          {filePreview && (
            <div className="file-preview" style={{
              backgroundColor: 'var(--secondary-color)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div className="flex-between">
                <div>
                  <strong>{filePreview.name}</strong>
                  <br />
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>
                    Size: {filePreview.size} • Modified: {filePreview.lastModified}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setFilePreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="button button-danger"
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    margin: 0
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex-center" style={{ gap: '12px' }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={openFileDialog}
            >
              Choose File
            </button>

            <button
              type="submit"
              className="button button-primary"
              disabled={!file || loading}
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
                  Uploading...
                </>
              ) : (
                'Start Analysis'
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          💡 <strong>Tip:</strong> Your CSV should contain numerical and categorical features,
          with one column as the target variable for prediction.
        </div>
      </div>
    </div>
  );
};

export default UploadComponent;
