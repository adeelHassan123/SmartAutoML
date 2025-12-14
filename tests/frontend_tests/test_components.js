import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadComponent from '../../frontend/src/components/UploadComponent';

// Mock the API client
jest.mock('../../frontend/src/api', () => ({
  uploadDataset: jest.fn(),
}));

import { apiClient } from '../../frontend/src/api';

describe('UploadComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload form', () => {
    render(<UploadComponent />);
    expect(screen.getByText('Upload Dataset')).toBeInTheDocument();
    expect(screen.getByText('Select CSV File:')).toBeInTheDocument();
    expect(screen.getByText('Upload Dataset')).toBeInTheDocument();
  });

  test('shows error for non-CSV files', () => {
    render(<UploadComponent />);

    const fileInput = screen.getByLabelText(/select csv file/i);
    const txtFile = new File(['not csv'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [txtFile] } });

    expect(screen.getByText('Please select a valid CSV file')).toBeInTheDocument();
  });

  test('accepts CSV files', () => {
    render(<UploadComponent />);

    const fileInput = screen.getByLabelText(/select csv file/i);
    const csvFile = new File(['col1,col2\n1,2'], 'test.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [csvFile] } });

    expect(screen.queryByText('Please select a valid CSV file')).not.toBeInTheDocument();
  });

  test('handles successful upload', async () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    apiClient.uploadDataset.mockResolvedValueOnce({
      dataset_id: 'test-id',
      target_candidates: ['target']
    });

    render(<UploadComponent />);

    const fileInput = screen.getByLabelText(/select csv file/i);
    const csvFile = new File(['col1,col2,target\n1,2,0'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [csvFile] } });

    const submitButton = screen.getByText('Upload Dataset');
    fireEvent.click(submitButton);

    expect(screen.getByText('Uploading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(apiClient.uploadDataset).toHaveBeenCalledWith(csvFile);
    });

    // Note: Navigation testing would require more complex mocking
  });

  test('handles upload error', async () => {
    apiClient.uploadDataset.mockRejectedValueOnce(new Error('Upload failed'));

    render(<UploadComponent />);

    const fileInput = screen.getByLabelText(/select csv file/i);
    const csvFile = new File(['col1,col2,target\n1,2,0'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [csvFile] } });

    const submitButton = screen.getByText('Upload Dataset');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });
});
