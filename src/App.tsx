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

function App() {
  return (
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
