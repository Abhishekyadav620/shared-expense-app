/**
 * Top navigation bar — logo on the left, nav links, user info + logout on the right.
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/groups', label: 'Groups' },
  { to: '/expenses', label: 'Expenses' },
];

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left — logo / app name */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              ET
            </div>
            <span className="hidden text-lg font-semibold text-gray-900 sm:block">
              Expense Tracker
            </span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                location.pathname === link.to ||
                (link.to !== '/' && location.pathname.startsWith(link.to))
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-slate-100 hover:text-gray-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right — avatar + logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700"
              title={user?.name}
            >
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 sm:block">
              {user?.name}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
