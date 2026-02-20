import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import OrdersPage from './components/orders/OrdersPage';
import ClientsPage from './components/clients/ClientsPage';

type Page = 'orders' | 'clients';

export default function App() {
  const [page, setPage] = useState<Page>('orders');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('miauto-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('miauto-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setPage} />
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main className="main-content">
        {page === 'orders' && <OrdersPage />}
        {page === 'clients' && <ClientsPage />}
      </main>
    </div>
  );
}
