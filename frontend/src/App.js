import React, { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Lazy load components for better performance
const UploadComponent = lazy(() => import('./components/UploadComponent'));
const SummaryComponent = lazy(() => import('./components/SummaryComponent'));
const EdaComponent = lazy(() => import('./components/EdaComponent'));
const IssuesComponent = lazy(() => import('./components/IssuesComponent'));
const PreprocessComponent = lazy(() => import('./components/PreprocessComponent'));
const TrainComponent = lazy(() => import('./components/TrainComponent'));
const ResultsComponent = lazy(() => import('./components/ResultsComponent'));
const ReportComponent = lazy(() => import('./components/ReportComponent'));

// Global Context for app state
const AppContext = createContext();

// Custom hook to use app context
export const useAppContext = () => useContext(AppContext);

// UUID validation utility
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Dataset ID validation hook
export const useValidatedDatasetId = () => {
  const { datasetId } = useAppContext();
  const location = useLocation();

  // Extract datasetId from URL params
  const pathSegments = location.pathname.split('/');
  const urlDatasetId = pathSegments.find((segment, index) =>
    index > 0 && isValidUUID(segment)
  );

  // Use URL dataset ID if available, otherwise use context
  const currentDatasetId = urlDatasetId || datasetId;

  return {
    datasetId: currentDatasetId,
    isValid: currentDatasetId && isValidUUID(currentDatasetId),
    hasDataset: !!currentDatasetId
  };
};

// Loading component
const LoadingFallback = () => (
  <div className="loading">
    <div className="loading-spinner"></div>
    <div className="loading-text">Loading...</div>
  </div>
);

// Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="card">
            <h2>❌ Something went wrong</h2>
            <p>The application encountered an unexpected error.</p>
            <div className="error-details">
              <details>
                <summary>Error Details (for debugging)</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
              </details>
            </div>
            <button
              className="button"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Layout component
const Layout = ({ children }) => {
  const { darkMode, toggleDarkMode, getBreadcrumbs } = useAppContext();
  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">AutoML</div>
          <button
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs">
        <div className="breadcrumb-list">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="breadcrumb-separator">→</span>}
              <span className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <div className="app-content">
        <div className="container">
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>AutoML   Tool - Built with FastAPI and React</p>
      </footer>
    </div>
  );
};

// AppRouter component to handle routing within context
const AppRouter = () => (
  <Routes>
    <Route path="/" element={<UploadComponent />} />
    <Route path="/summary/:datasetId" element={<SummaryComponent />} />
    <Route path="/eda/:datasetId" element={<EdaComponent />} />
    <Route path="/issues/:datasetId" element={<IssuesComponent />} />
    <Route path="/preprocess/:datasetId" element={<PreprocessComponent />} />
    <Route path="/train/:datasetId" element={<TrainComponent />} />
    <Route path="/results/:datasetId" element={<ResultsComponent />} />
    <Route path="/report/:datasetId" element={<ReportComponent />} />
  </Routes>
);

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize from localStorage to prevent flash
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [datasetId, setDatasetId] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem('datasetId') || null;
  });
  const [errorQueue, setErrorQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  // Apply dark mode to body (only when darkMode changes)
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Save dataset ID (only when datasetId changes)
  useEffect(() => {
    if (datasetId) {
      localStorage.setItem('datasetId', datasetId);
    } else {
      localStorage.removeItem('datasetId');
    }
  }, [datasetId]);

  // Global loading state integration
  useEffect(() => {
    const handleLoadingChange = (loading) => {
      setIsLoading(loading);
    };

    // Import and setup loading callback
    import('./api').then(({ addLoadingCallback }) => {
      addLoadingCallback(handleLoadingChange);
    });

    // Cleanup
    return () => {
      import('./api').then(({ removeLoadingCallback }) => {
        removeLoadingCallback(handleLoadingChange);
      });
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const addError = (error) => {
    setErrorQueue(prev => [...prev, { id: Date.now(), ...error }]);
  };

  const removeError = (id) => {
    setErrorQueue(prev => prev.filter(error => error.id !== id));
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) return ['Home'];

    const breadcrumbs = ['Home'];
    segments.forEach((segment, index) => {
      if (segment === 'summary') breadcrumbs.push('Dataset Summary');
      else if (segment === 'eda') breadcrumbs.push('Exploratory Analysis');
      else if (segment === 'issues') breadcrumbs.push('Data Quality');
      else if (segment === 'preprocess') breadcrumbs.push('Preprocessing');
      else if (segment === 'train') breadcrumbs.push('Model Training');
      else if (segment === 'results') breadcrumbs.push('Results');
      else if (segment === 'report') breadcrumbs.push('Report');
    });

    return breadcrumbs;
  };

  const contextValue = {
    darkMode,
    toggleDarkMode,
    datasetId,
    setDatasetId,
    errorQueue,
    addError,
    removeError,
    getBreadcrumbs
  };

  return (
    <ErrorBoundary>
      <AppContext.Provider value={contextValue}>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <AppRouter />
          </Suspense>
          {isLoading && (
            <div className="global-loading-overlay">
              <div className="loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">Processing...</div>
              </div>
            </div>
          )}
        </Layout>
      </AppContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
