/**
 * Root component — routing and global auth provider.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import CreateGroupPage from './pages/CreateGroupPage';
import GroupDetailsPage from './pages/GroupDetailsPage';
import ExpensesPage from './pages/ExpensesPage';
import CreateExpensePage from './pages/CreateExpensePage';
import ExpenseDetailsPage from './pages/ExpenseDetailsPage';
import BalancePage from './pages/BalancePage';
import SimplifiedBalancePage from './pages/SimplifiedBalancePage';
import SettlementPage from './pages/SettlementPage';
import ImportPage from './pages/ImportPage';
import ImportReviewPage from './pages/ImportReviewPage';
import ImportReportPage from './pages/ImportReportPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <GroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/create"
            element={
              <ProtectedRoute>
                <CreateGroupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <ProtectedRoute>
                <GroupDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:id/balances"
            element={
              <ProtectedRoute>
                <BalancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:id/simplified-balances"
            element={
              <ProtectedRoute>
                <SimplifiedBalancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:groupId/expenses/create"
            element={
              <ProtectedRoute>
                <CreateExpensePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:id"
            element={
              <ProtectedRoute>
                <ExpenseDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settlements"
            element={
              <ProtectedRoute>
                <SettlementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import"
            element={
              <ProtectedRoute>
                <ImportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import/review"
            element={
              <ProtectedRoute>
                <ImportReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import/report"
            element={
              <ProtectedRoute>
                <ImportReportPage />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
