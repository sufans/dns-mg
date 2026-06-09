import { Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, LoginPage, SetupWizard } from './components/auth';
import { LandingPage } from './components/landing';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { DomainListPage } from './components/domains';
import { DnsRecordsPage } from './components/dns-records';
import { ApiAccountsPage } from './components/api-accounts';
import { SyncTasksPage } from './components/sync';
import { OperationLogsPage } from './components/logs';
import { SecuritySettingsPage } from './components/security';
import { ErrorPage } from './components/ui/error-page';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          variant="500"
          description={this.state.error?.message || '发生了未知错误'}
          onRetry={() => this.setState({ hasError: false, error: null })}
          onHome={() => window.location.href = '/'}
        />
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/domains" element={<DomainListPage />} />
            <Route path="/domains/:domainId/records" element={<DnsRecordsPage />} />
            <Route path="/api-accounts" element={<ApiAccountsPage />} />
            <Route path="/sync" element={<SyncTasksPage />} />
            <Route path="/logs" element={<OperationLogsPage />} />
            <Route path="/security" element={<SecuritySettingsPage />} />
          </Route>
          <Route path="*" element={<ErrorPage variant="404" onHome={() => window.location.href = '/'} />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
