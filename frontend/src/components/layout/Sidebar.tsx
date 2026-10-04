import { useTranslation } from 'react-i18next';

import logoImg from '../../assets/auto2.svg';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: any) => void;
  onShutdown: () => void;
}

const NAV_ITEMS = [
  { key: 'orders', icon: '📋', label: 'orders' },
  { key: 'clients', icon: '👥', label: 'clients' },
  { key: 'products', icon: '🔧', label: 'products' },
  { key: 'suppliers', icon: '🚚', label: 'suppliers' },
  { key: 'analytics', icon: '📊', label: 'analytics' },
];

export default function Sidebar({ activePage, onNavigate, onShutdown }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar__logo" onClick={() => onNavigate('orders')}>
        <img src={logoImg} className="sidebar__logo-icon" alt="MIAUTO Logo" />
        <span>MIAUTO</span>
      </div>
      <nav className="sidebar__nav" style={{ flexGrow: 1 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`sidebar__link ${activePage === item.key ? 'sidebar__link--active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            {t(item.label)}
          </button>
        ))}
      </nav>
      {/* Exit Button */}
      <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
        <button
          className="sidebar__link"
          onClick={onShutdown}
          style={{
            width: '100%',
            color: 'var(--color-danger)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            background: 'rgba(239, 68, 68, 0.05)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-4)',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🚪</span>
          {t('exit') || 'Вихід'}
        </button>
      </div>
    </aside>
  );
}
