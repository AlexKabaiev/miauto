import { useTranslation } from 'react-i18next';

import logoImg from '../../assets/auto2.svg';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: any) => void;
}

const NAV_ITEMS = [
  { key: 'orders', icon: '📋', label: 'orders' },
  { key: 'clients', icon: '👥', label: 'clients' },
  { key: 'products', icon: '🔧', label: 'products' },
  { key: 'suppliers', icon: '🚚', label: 'suppliers' },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="sidebar__logo" onClick={() => onNavigate('orders')}>
        <img src={logoImg} className="sidebar__logo-icon" alt="MIAUTO Logo" />
        <span>MIAUTO</span>
      </div>
      <nav className="sidebar__nav">
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
    </aside>
  );
}
