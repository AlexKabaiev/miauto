import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import OrdersPage from './components/orders/OrdersPage';
import ClientsPage from './components/clients/ClientsPage';
import ProductsPage from './components/products/ProductsPage';
import SuppliersPage from './components/suppliers/SuppliersPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';

type Page = 'orders' | 'clients' | 'products' | 'suppliers' | 'analytics';

export default function App() {
  const { t } = useTranslation();
  const [page, setPage] = useState<Page>('orders');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('miauto-theme') as 'dark' | 'light') || 'dark';
  });
  const [backingUp, setBackingUp] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitDone, setExitDone] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('miauto-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/system/backup', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert(t('backup_success', { file: data.file }) || `Резервну копію успішно створено: ${data.file}`);
      } else {
        alert(data.detail || t('save_error'));
      }
    } catch (err: any) {
      alert(err.message || t('save_error'));
    } finally {
      setBackingUp(false);
    }
  };

  const handleShutdown = async () => {
    const confirmExit = window.confirm(
      t('exit_confirm') || 'Ви впевнені, що хочете завершити роботу? Перед виходом буде автоматично створено резервну копію.'
    );
    if (!confirmExit) return;

    setExiting(true);
    try {
      const res = await fetch('/api/system/shutdown', { method: 'POST' });
      if (res.ok) {
        setExitDone(true);
      } else {
        alert(t('save_error'));
        setExiting(false);
      }
    } catch (err) {
      setExitDone(true); // Server might stop before responding
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} onShutdown={handleShutdown} />
      <Header 
        theme={theme} 
        onToggleTheme={toggleTheme} 
        onBackup={handleBackup} 
        backingUp={backingUp} 
      />
      <main className="main-content">
        {page === 'orders' && <OrdersPage />}
        {page === 'clients' && <ClientsPage />}
        {page === 'products' && <ProductsPage />}
        {page === 'suppliers' && <SuppliersPage />}
        {page === 'analytics' && <AnalyticsPage />}
      </main>

      {/* Shutdown overlay */}
      {exiting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-body)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          gap: '16px'
        }}>
          {!exitDone && <div className="spinner" style={{ width: '40px', height: '40px' }} />}
          <h2 style={{ fontWeight: 600 }}>
            {!exitDone 
              ? (t('exiting_overlay') || "Збереження резервної копії та завершення роботи...") 
              : (t('exit_done') || "Роботу застосунку завершено. Ви можете закрити це вікно.")}
          </h2>
          {exitDone && (
            <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
              {t('exit_done_sub') || "Консоль сервера була успішно зупинена."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
