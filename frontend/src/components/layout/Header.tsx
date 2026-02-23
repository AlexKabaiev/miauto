import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { currencyApi } from '../../api';
import type { CurrencyRate } from '../../types';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    currencyApi.getRates().then(d => setRates(d.rates)).catch(() => {});
    const interval = setInterval(() => {
      currencyApi.getRates().then(d => setRates(d.rates)).catch(() => {});
    }, 300_000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // Live clock — updates every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleLang = () => {
    const next = i18n.language === 'ua' ? 'ru' : 'ua';
    i18n.changeLanguage(next);
  };

  const fmtDate = now.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fmtTime = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="header">
      <h1 className="header__title">{t('order_desk')}</h1>
      <div className="header__right">
        {/* Date & Time Widget */}
        <div className="currency-badge" style={{ gap: 'var(--space-2)' }}>
          <span className="currency-badge__code">📅</span>
          <span className="currency-badge__value">{fmtDate}</span>
          <span className="currency-badge__value" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime}</span>
        </div>

        {/* Currency Widget */}
        <div className="currency-widget">
          {rates.map(r => (
            <div key={r.currency} className="currency-badge">
              <span className="currency-badge__code">{r.currency}</span>
              <span className="currency-badge__value">
                {(r.buy ?? r.cross)?.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Language toggle */}
        <button className="btn btn--ghost btn--sm" onClick={toggleLang}>
          {i18n.language === 'ua' ? 'UA' : 'RU'}
        </button>

        {/* Theme toggle */}
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
