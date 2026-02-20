import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { currencyApi } from '../../api';
import type { CurrencyRate } from '../../types';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Header({ theme, onToggleTheme }: HeaderProps) {
  const { i18n } = useTranslation();
  const [rates, setRates] = useState<CurrencyRate[]>([]);

  useEffect(() => {
    currencyApi.getRates().then(d => setRates(d.rates)).catch(() => {});
    const interval = setInterval(() => {
      currencyApi.getRates().then(d => setRates(d.rates)).catch(() => {});
    }, 300_000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  const toggleLang = () => {
    const next = i18n.language === 'ua' ? 'ru' : 'ua';
    i18n.changeLanguage(next);
  };

  return (
    <header className="header">
      <h1 className="header__title">Стіл замовлень</h1>
      <div className="header__right">
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
