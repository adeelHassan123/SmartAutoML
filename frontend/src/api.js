import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryOn: [408, 500, 502, 503, 504], // HTTP status codes to retry on (removed 404 and 429 - rate limits should not be retried)
};

// Cap exponential backoff delay
const MAX_RETRY_DELAY = 10000; // 10s

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// Sleep utility for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Global loading state tracker (for UI indicators)
let activeRequests = 0;
const loadingCallbacks = new Set();

export const addLoadingCallback = (callback) => {
  loadingCallbacks.add(callback);
  // Send current state immediately
  callback(activeRequests > 0);
};

export const removeLoadingCallback = (callback) => {
  loadingCallbacks.delete(callback);
};

const updateLoadingState = (isLoading) => {
  loadingCallbacks.forEach(callback => {
    try {
      callback(isLoading);
    } catch (e) {
      console.warn('Loading callback error:', e);
    }
  });
};

// Central error message mapping for user-friendly messages
const ERROR_MESSAGES = {
  400: 'Invalid request - please check your input',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Data not found - it may have been cleaned up or never existed',
  408: 'Request timed out - please try again',
  429: 'Too many requests - please wait and try again',
  500: 'Server error - please try again later',
  502: 'Server temporarily unavailable',
  503: 'Service unavailable - please try again later',
  504: 'Gateway timeout - please try again',
  network: 'Network connection issue - please check your internet',
  unknown: 'An unexpected error occurred'
};

// Enhanced error handling with user-friendly messages
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;

    // Use server-provided message if available, otherwise use our mapping
    let message = error.response.data.detail ||
                  error.response.data.message ||
                  ERROR_MESSAGES[status] ||
                  `Server error (${status})`;

    // Add context for common cases
    if (status === 404 && message.includes('not found')) {
      message += ' - the data may have been automatically cleaned up after 24 hours of inactivity';
    }

    return {
      error: true,
      message,
      status,
      data: null,
      userFriendly: true
    };
  } else if (error.request) {
    // Network error
    return {
      error: true,
      message: ERROR_MESSAGES.network,
      status: null,
      data: null,
      userFriendly: true
    };
  } else {
    // Other error
    return {
      error: true,
      message: error.message || ERROR_MESSAGES.unknown,
      status: null,
      data: null,
      userFriendly: true
    };
  }
};

// Retry logic
const shouldRetry = (error, attempt) => {
  if (attempt >= RETRY_CONFIG.maxRetries) return false;

  if (error.response && RETRY_CONFIG.retryOn.includes(error.response.status)) {
    return true;
  }

  if (!error.response) {
    // Network errors - retry
    return true;
  }

  return false;
};

const makeRequest = async (requestFn, attempt = 0) => {
  // Track loading state for first attempt only
  if (attempt === 0) {
    activeRequests++;
    updateLoadingState(true);
  }

  try {
    const response = await requestFn();
    return {
      data: response.data,
      error: false,
      message: null,
      loading: false
    };
  } catch (error) {
    if (shouldRetry(error, attempt)) {
      const delay = Math.min(MAX_RETRY_DELAY, RETRY_CONFIG.retryDelay * Math.pow(2, attempt));
      console.warn(`Request failed, retrying (${attempt + 1}/${RETRY_CONFIG.maxRetries}) in ${delay}ms...`);
      await sleep(delay);
      return makeRequest(requestFn, attempt + 1);
    }

    return {
      ...handleApiError(error),
      loading: false
    };
  } finally {
    // Update loading state when request completes
    if (attempt === 0) {
      activeRequests = Math.max(0, activeRequests - 1);
      updateLoadingState(activeRequests > 0);
    }
  }
};

// Enhanced API client with retry logic and proper error handling
export const apiClient = {
  // Upload dataset
  uploadDataset: async (file) => {
    return makeRequest(async () => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    });
  },

  // Get dataset summary
  getSummary: async (datasetId) => {
    return makeRequest(async () => {
      return api.get(`/api/summary/${datasetId}`);
    });
  },

  // Get EDA data
  getEda: async (datasetId) => {
    return makeRequest(async () => {
      return api.get(`/api/eda/${datasetId}`);
    });
  },

  // Get issues
  getIssues: async (datasetId, targetColumn) => {
    return makeRequest(async () => {
      return api.get(`/api/issues/${datasetId}?target_column=${targetColumn}`);
    });
  },

  // Apply preprocessing
  preprocessDataset: async (datasetId, preprocessConfig) => {
    return makeRequest(async () => {
      return api.post(`/api/preprocess/${datasetId}`, preprocessConfig);
    });
  },

  // Start training
  startTraining: async (datasetId, trainConfig) => {
    return makeRequest(async () => {
      return api.post(`/api/train/${datasetId}`, trainConfig);
    });
  },

  // Get training status
  getTrainingStatus: async (datasetId) => {
    return makeRequest(async () => {
      return api.get(`/api/status/${datasetId}`);
    });
  },

  // Get training results
  getResults: async (datasetId, version = null) => {
    return makeRequest(async () => {
      const params = version ? { version } : {};
      return api.get(`/api/results/${datasetId}`, { params });
    });
  },

  // Download report
  downloadReport: async (datasetId, format = 'markdown') => {
    return makeRequest(async () => {
      return api.get(`/api/report/${datasetId}?format=${format}`, {
        responseType: 'blob',
      });
    });
  },
};

export default apiClient;
