import { useState, useEffect, useCallback } from 'react';
import './index.css';

import { AuthProvider, useAuth }  from './contexts/AuthContext';
import { accounts as accountsApi, categories as categoriesApi } from './services/api';

import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import SetupAccountPage from './pages/SetupAccountPage';

import Sidebar from './components/layout/Sidebar';
import Topbar  from './components/layout/Topbar';

import AnalyticsView    from './views/AnalyticsView';
import AccountsView     from './views/AccountsView';
import TransactionsView from './views/TransactionsView';
import BudgetsView      from './views/BudgetsView';
import GoalsView        from './views/GoalsView';
import CategoriesView   from './views/CategoriesView';

import { NAV } from './constants/data';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">กำลังโหลด...</p>
      </div>
    </div>
  );
}

// ─── Main App Shell (requires auth) ──────────────────────────────────────────
function AppShell() {
  const { isAuthenticated } = useAuth();
  const [authPage, setAuthPage]     = useState('login'); // 'login' | 'register'
  const [appState, setAppState]     = useState('checking'); // 'checking'|'setup'|'app'
  const [view, setView]             = useState('analytics');
  const [collapsed, setCollapsed]   = useState(false);
  const [accounts, setAccounts]     = useState([]);
  const [categories, setCategories] = useState([]);

  // Bootstrap: check if user has accounts already
  const bootstrap = useCallback(async () => {
    setAppState('checking');
    try {
      const [accs, cats] = await Promise.all([
        accountsApi.list(),
        categoriesApi.list(),
      ]);
      setAccounts(accs || []);
      setCategories(cats || []);
      setAppState(accs && accs.length > 0 ? 'app' : 'setup');
    } catch {
      setAppState('setup');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) bootstrap();
  }, [isAuthenticated, bootstrap]);

  // Refresh accounts (called by views after CRUD)
  const refreshAccounts = useCallback(async () => {
    try {
      const accs = await accountsApi.list();
      setAccounts(accs || []);
    } catch {}
  }, []);

  // Refresh categories (called by CategoriesView)
  const refreshCategories = useCallback(async () => {
    try {
      const cats = await categoriesApi.list();
      setCategories(cats || []);
    } catch {}
  }, []);

  // ── Not authenticated: show login / register ──
  if (!isAuthenticated) {
    if (authPage === 'login') {
      return <LoginPage onSwitch={() => setAuthPage('register')} />;
    }
    return <RegisterPage onSwitch={() => setAuthPage('login')} />;
  }

  // ── Authenticated: loading ──
  if (appState === 'checking') return <Spinner />;

  // ── Authenticated but no accounts: onboarding ──
  if (appState === 'setup') {
    return (
      <SetupAccountPage
        onComplete={() => {
          bootstrap(); // re-bootstrap after setup
        }}
      />
    );
  }

  // ── Full app ──
  const pageTitle = NAV.find((n) => n.id === view)?.label || '';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        view={view}
        setView={setView}
        accounts={accounts}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto">
          {view === 'analytics'    && (
            <AnalyticsView accounts={accounts} />
          )}
          {view === 'accounts'     && (
            <AccountsView
              accounts={accounts}
              onRefresh={refreshAccounts}
            />
          )}
          {view === 'transactions' && (
            <TransactionsView
              accounts={accounts}
              categories={categories}
            />
          )}
          {view === 'budgets'      && (
            <BudgetsView categories={categories} />
          )}
          {view === 'goals'        && (
            <GoalsView accounts={accounts} />
          )}
          {view === 'categories'   && (
            <CategoriesView onRefresh={refreshCategories} />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Root: wrap with AuthProvider ────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
