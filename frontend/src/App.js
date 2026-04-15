import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RiskReport from './pages/RiskReport';
import FinalDecision from './pages/FinalDecision';
import Team from './pages/Team';
import Transactions from './pages/Transactions';
import Invoices from './pages/Invoices';
import Loans from './pages/Loans';
import Assets from './pages/Assets';
import ActivityLog from './pages/ActivityLog';
import About from './pages/About';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Approvals from './pages/Approvals';
import Simulate from './pages/Simulate';
import ExtractInvoice from './pages/ExtractInvoice';
import Executive from './pages/Executive';
import Goals from './pages/Goals';
import CopilotChat from './components/CopilotChat';

function ProtectedPage({ children, roles }) {
  return (
    <PrivateRoute roles={roles}>
      <Layout>
        <ErrorBoundary>{children}</ErrorBoundary>
      </Layout>
    </PrivateRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toast />
        <CopilotChat />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<About />} />

          <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
          <Route path="/risk-report" element={<ProtectedPage roles={['owner']}><RiskReport /></ProtectedPage>} />
          <Route path="/final-decision" element={<ProtectedPage roles={['owner']}><FinalDecision /></ProtectedPage>} />
          <Route path="/team" element={<ProtectedPage roles={['owner']}><Team /></ProtectedPage>} />
          <Route path="/transactions" element={<ProtectedPage roles={['owner', 'accountant']}><Transactions /></ProtectedPage>} />
          <Route path="/invoices" element={<ProtectedPage roles={['owner', 'accountant']}><Invoices /></ProtectedPage>} />
          <Route path="/extract-invoice" element={<ProtectedPage roles={['owner', 'accountant']}><ExtractInvoice /></ProtectedPage>} />
          <Route path="/loans" element={<ProtectedPage roles={['owner', 'finance']}><Loans /></ProtectedPage>} />
          <Route path="/assets" element={<ProtectedPage roles={['owner', 'finance']}><Assets /></ProtectedPage>} />
          <Route path="/activity" element={<ProtectedPage roles={['owner', 'admin']}><ActivityLog /></ProtectedPage>} />
          <Route path="/reports" element={<ProtectedPage roles={['owner', 'admin']}><Reports /></ProtectedPage>} />
          <Route path="/approvals" element={<ProtectedPage roles={['owner', 'admin']}><Approvals /></ProtectedPage>} />
          <Route path="/simulate" element={<ProtectedPage roles={['owner']}><Simulate /></ProtectedPage>} />
          <Route path="/executive" element={<ProtectedPage roles={['owner']}><Executive /></ProtectedPage>} />
          <Route path="/goals" element={<ProtectedPage roles={['owner']}><Goals /></ProtectedPage>} />
          <Route path="/settings" element={<ProtectedPage roles={['admin']}><Settings /></ProtectedPage>} />
          <Route path="/users" element={<ProtectedPage roles={['admin']}><Dashboard /></ProtectedPage>} />

          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
