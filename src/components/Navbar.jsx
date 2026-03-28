import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { company, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        location.pathname === to
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {label}
    </Link>
  );

  if (!company) return null;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-1">
            <Link to="/" className="text-xl font-bold text-indigo-600 mr-6">
              Ch-Scraper
            </Link>
            {navLink('/', 'Dashboard')}
            {(company.is_approved || company.is_admin) && (
              <>
                {navLink('/browse', 'Browse Emails')}
                {navLink('/create-batch', 'Create Batch')}
                {navLink('/batches', 'My Batches')}
                {navLink('/send', 'Send Emails')}
                {navLink('/history', 'Sent History')}
                {navLink('/settings', 'Settings')}
              </>
            )}
            {company.is_admin && navLink('/admin', 'Admin')}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{company.name}</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                {company.credit_balance.toFixed(0)} credits
              </span>
              {company.is_admin && (
                <span className="ml-1 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-600/20 ring-inset">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
