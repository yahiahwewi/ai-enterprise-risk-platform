import { useAuth } from '../context/AuthContext';
import OwnerDashboard from './dashboards/OwnerDashboard';
import AccountantDashboard from './dashboards/AccountantDashboard';
import FinanceDashboard from './dashboards/FinanceDashboard';
import AdminDashboard from './dashboards/AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'owner':
      return <OwnerDashboard />;
    case 'accountant':
      return <AccountantDashboard />;
    case 'finance':
      return <FinanceDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <p>Unknown role</p>;
  }
}
