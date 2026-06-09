import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component, type ReactNode } from 'react';
import { ProtectedRoute, LoginPage, SetupWizard } from './components/auth';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ApiAccountsPage } from './components/api-accounts';
import { OperationLogsPage } from './components/logs';
import { SecuritySettingsPage } from './components/security';
import { ErrorPage } from './components/ui/error-page';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage variant="500" />;
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/accounts" element={<ApiAccountsPage />} />
            <Route path="/logs" element={<OperationLogsPage />} />
            <Route path="/settings" element={<SecuritySettingsPage />} />
          </Route>
          <Route path="*" element={<ErrorPage variant="404" />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
