import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardApi } from '../../api';
import type { DashboardStats } from '../../types';

export default function StatsCards() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    dashboardApi.getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="stats-grid">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="stat-card fade-in">
            <div className="stat-card__label">—</div>
            <div className="stat-card__value">...</div>
          </div>
        ))}
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fmtMoney = (n: number) =>
    n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₴';

  const cards = [
    { label: t('active_orders'), value: fmt(stats.active_orders), cls: '' },
    { label: t('total_debt'), value: fmtMoney(stats.total_debt), cls: 'stat-card__value--danger' },
    { label: t('month_revenue'), value: fmtMoney(stats.month_revenue), cls: 'stat-card__value--success' },
    { label: t('total_clients'), value: fmt(stats.total_clients), cls: 'stat-card__value--accent' },
    { label: t('month_orders'), value: fmt(stats.month_orders), cls: '' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c, i) => (
        <div key={i} className="stat-card fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="stat-card__label">{c.label}</div>
          <div className={`stat-card__value ${c.cls}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
