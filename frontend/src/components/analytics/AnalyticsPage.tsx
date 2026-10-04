import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ordersApi } from '../../api';
import type { OrderListItem } from '../../types';

interface ClientStats {
  clientId: number;
  name: string;
  phone: string;
  ordersCount: number;
  totalRevenue: number;
  totalProfit: number;
  totalPaid: number;
  totalDebt: number;
  averageBill: number;
  lastOrderDate: string;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'dashboard' | 'history' | 'clients'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'clients'>('dashboard');

  // Filters state
  const excludeCancelled = true;
  const [preset, setPreset] = useState<string>('this_month');
  
  // Custom date strings (YYYY-MM-DD)
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Top clients sorting
  const [clientsSortBy, setClientsSortBy] = useState<'revenue' | 'profit' | 'orders'>('revenue');

  // Selected client for modal
  const [selectedClient, setSelectedClient] = useState<ClientStats | null>(null);

  // Expanded states for history tree: Year -> boolean, Year-Month -> boolean
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Tooltip state for SVG charts
  const [hoveredData, setHoveredData] = useState<{
    x: number;
    y: number;
    title: string;
    metrics: { label: string; value: string; color?: string }[];
  } | null>(null);

  // Load all orders
  useEffect(() => {
    setLoading(true);
    // Fetch a very large limit to get all records for client-side analytics
    ordersApi.list({ limit: '100000', sort_by: 'date', sort_dir: 'desc' })
      .then(res => {
        setOrders(res.items);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to load orders for analytics:', err);
        setError(err.message || 'Failed to load data');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Set date ranges based on preset
  useEffect(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'prev_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'this_quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
      const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'prev_year') {
      const firstDay = new Date(now.getFullYear() - 1, 0, 1);
      const lastDay = new Date(now.getFullYear() - 1, 11, 31);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'all_time') {
      setDateFrom('');
      setDateTo('');
    }
  }, [preset]);

  // Handle manual date selects
  const handleManualPeriodChange = (year: string, quarter: string, month: string) => {
    setPreset('custom');
    const now = new Date();
    const activeYear = year ? parseInt(year) : now.getFullYear();

    if (month) {
      const m = parseInt(month) - 1;
      const firstDay = new Date(activeYear, m, 1);
      const lastDay = new Date(activeYear, m + 1, 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else if (quarter) {
      const q = parseInt(quarter) - 1;
      const firstDay = new Date(activeYear, q * 3, 1);
      const lastDay = new Date(activeYear, (q + 1) * 3, 0);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    } else {
      const firstDay = new Date(activeYear, 0, 1);
      const lastDay = new Date(activeYear, 11, 31);
      setDateFrom(firstDay.toISOString().split('T')[0]);
      setDateTo(lastDay.toISOString().split('T')[0]);
    }
  };

  // Convert order values to UAH for safety and consistency
  const processedOrders = useMemo(() => {
    return orders.map(o => {
      // Find exchange rate. If order doesn't have it, default to 1
      const rate = (o as any).exchange_rate || 1;
      const totalNum = parseFloat(o.total || '0');
      const paidNum = parseFloat(o.paid || '0');
      const debtNum = parseFloat(o.debt || '0');
      const profitNum = parseFloat(o.profit || '0');
      return {
        ...o,
        totalUAH: totalNum * rate,
        paidUAH: paidNum * rate,
        debtUAH: debtNum * rate,
        profitUAH: profitNum * rate,
        parsedDate: new Date(o.date),
      };
    });
  }, [orders]);

  // Filter orders based on active controls
  const filteredOrders = useMemo(() => {
    return processedOrders.filter(o => {
      if (excludeCancelled && o.group === 'Скасовано') return false;
      
      const orderTime = o.parsedDate.getTime();
      if (dateFrom) {
        const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
        if (orderTime < fromTime) return false;
      }
      if (dateTo) {
        const toTime = new Date(`${dateTo}T23:59:59`).getTime();
        if (orderTime > toTime) return false;
      }
      
      return true;
    });
  }, [processedOrders, excludeCancelled, dateFrom, dateTo]);

  // Calculate previous period dates for comparison
  const previousPeriodOrders = useMemo(() => {
    if (preset === 'all_time' || !dateFrom || !dateTo) return [];

    const fromDate = new Date(`${dateFrom}T00:00:00`);
    const toDate = new Date(`${dateTo}T23:59:59`);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let prevFromDate: Date;
    let prevToDate: Date;

    if (preset === 'today') {
      prevFromDate = new Date(fromDate);
      prevFromDate.setDate(prevFromDate.getDate() - 1);
      prevToDate = new Date(prevFromDate);
    } else if (preset === 'this_month') {
      prevFromDate = new Date(fromDate.getFullYear(), fromDate.getMonth() - 1, 1);
      prevToDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 0);
    } else if (preset === 'prev_month') {
      prevFromDate = new Date(fromDate.getFullYear(), fromDate.getMonth() - 1, 1);
      prevToDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 0);
    } else if (preset === 'this_quarter') {
      prevFromDate = new Date(fromDate.getFullYear(), fromDate.getMonth() - 3, 1);
      prevToDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 0);
    } else if (preset === 'this_year' || preset === 'prev_year') {
      prevFromDate = new Date(fromDate.getFullYear() - 1, 0, 1);
      prevToDate = new Date(fromDate.getFullYear() - 1, 11, 31);
    } else {
      // Custom shift back by the exact number of days
      prevFromDate = new Date(fromDate);
      prevFromDate.setDate(prevFromDate.getDate() - diffDays);
      prevToDate = new Date(toDate);
      prevToDate.setDate(prevToDate.getDate() - diffDays);
    }

    const fromTime = prevFromDate.getTime();
    const toTime = prevToDate.getTime();

    return processedOrders.filter(o => {
      if (excludeCancelled && o.group === 'Скасовано') return false;
      const orderTime = o.parsedDate.getTime();
      return orderTime >= fromTime && orderTime <= toTime;
    });
  }, [processedOrders, excludeCancelled, preset, dateFrom, dateTo]);

  // Aggregate current stats
  const stats = useMemo(() => {
    const count = filteredOrders.length;
    const revenue = filteredOrders.reduce((sum, o) => sum + o.totalUAH, 0);
    const profit = filteredOrders.reduce((sum, o) => sum + o.profitUAH, 0);
    const paid = filteredOrders.reduce((sum, o) => sum + o.paidUAH, 0);
    const debt = filteredOrders.reduce((sum, o) => sum + o.debtUAH, 0);
    const avg = count > 0 ? revenue / count : 0;

    return { count, revenue, profit, paid, debt, avg };
  }, [filteredOrders]);

  // Aggregate previous stats
  const prevStats = useMemo(() => {
    const count = previousPeriodOrders.length;
    const revenue = previousPeriodOrders.reduce((sum, o) => sum + o.totalUAH, 0);
    const profit = previousPeriodOrders.reduce((sum, o) => sum + o.profitUAH, 0);
    const paid = previousPeriodOrders.reduce((sum, o) => sum + o.paidUAH, 0);
    const debt = previousPeriodOrders.reduce((sum, o) => sum + o.debtUAH, 0);
    const avg = count > 0 ? revenue / count : 0;

    return { count, revenue, profit, paid, debt, avg };
  }, [previousPeriodOrders]);

  // YoY Seasonality Comparison (e.g., current year vs last year monthly breakdown)
  const seasonalityData = useMemo(() => {
    // We base this on the active year (default to current year if custom/all time)
    const activeYear = dateFrom ? new Date(`${dateFrom}T00:00:00`).getFullYear() : new Date().getFullYear();
    const lastYear = activeYear - 1;

    const currentYearMonths = Array(12).fill(0).map(() => ({ revenue: 0, profit: 0, count: 0 }));
    const lastYearMonths = Array(12).fill(0).map(() => ({ revenue: 0, profit: 0, count: 0 }));

    processedOrders.forEach(o => {
      if (excludeCancelled && o.group === 'Скасовано') return;
      const y = o.parsedDate.getFullYear();
      const m = o.parsedDate.getMonth(); // 0-11
      if (y === activeYear) {
        currentYearMonths[m].revenue += o.totalUAH;
        currentYearMonths[m].profit += o.profitUAH;
        currentYearMonths[m].count += 1;
      } else if (y === lastYear) {
        lastYearMonths[m].revenue += o.totalUAH;
        lastYearMonths[m].profit += o.profitUAH;
        lastYearMonths[m].count += 1;
      }
    });

    return {
      activeYear,
      lastYear,
      current: currentYearMonths,
      previous: lastYearMonths,
    };
  }, [processedOrders, excludeCancelled, dateFrom]);

  // Clients analytics
  const clientsStats = useMemo(() => {
    const map = new Map<number, ClientStats>();
    
    filteredOrders.forEach(o => {
      const cid = o.client_id;
      if (!cid) return;
      const existing = map.get(cid);
      const orderDateStr = o.parsedDate.toISOString().split('T')[0];
      
      if (!existing) {
        map.set(cid, {
          clientId: cid,
          name: o.client_name || '—',
          phone: o.client_phone || '—',
          ordersCount: 1,
          totalRevenue: o.totalUAH,
          totalProfit: o.profitUAH,
          totalPaid: o.paidUAH,
          totalDebt: o.debtUAH,
          averageBill: o.totalUAH,
          lastOrderDate: orderDateStr,
        });
      } else {
        existing.ordersCount += 1;
        existing.totalRevenue += o.totalUAH;
        existing.totalProfit += o.profitUAH;
        existing.totalPaid += o.paidUAH;
        existing.totalDebt += o.debtUAH;
        existing.averageBill = existing.totalRevenue / existing.ordersCount;
        if (orderDateStr > existing.lastOrderDate) {
          existing.lastOrderDate = orderDateStr;
        }
      }
    });

    const list = Array.from(map.values());

    // Sort
    if (clientsSortBy === 'revenue') {
      list.sort((a, b) => b.totalRevenue - a.totalRevenue);
    } else if (clientsSortBy === 'profit') {
      list.sort((a, b) => b.totalProfit - a.totalProfit);
    } else if (clientsSortBy === 'orders') {
      list.sort((a, b) => b.ordersCount - a.ordersCount);
    }

    return list;
  }, [filteredOrders, clientsSortBy]);

  // History Tree Structure (Year -> Month -> KPI aggregations and Order lists)
  const historyTree = useMemo(() => {
    const tree: Record<number, Record<number, {
      count: number;
      revenue: number;
      paid: number;
      debt: number;
      profit: number;
      items: any[];
    }>> = {};

    processedOrders.forEach(o => {
      if (excludeCancelled && o.group === 'Скасовано') return;
      const y = o.parsedDate.getFullYear();
      const m = o.parsedDate.getMonth() + 1; // 1-12

      if (!tree[y]) tree[y] = {};
      if (!tree[y][m]) {
        tree[y][m] = { count: 0, revenue: 0, paid: 0, debt: 0, profit: 0, items: [] };
      }

      const node = tree[y][m];
      node.count += 1;
      node.revenue += o.totalUAH;
      node.paid += o.paidUAH;
      node.debt += o.debtUAH;
      node.profit += o.profitUAH;
      node.items.push(o);
    });

    // Sort years and months desc
    const sortedYears = Object.keys(tree)
      .map(Number)
      .sort((a, b) => b - a);

    return sortedYears.map(y => {
      const months = tree[y];
      const sortedMonths = Object.keys(months)
        .map(Number)
        .sort((a, b) => b - a);

      const yearTotal = sortedMonths.reduce((acc, m) => {
        const mn = months[m];
        return {
          count: acc.count + mn.count,
          revenue: acc.revenue + mn.revenue,
          paid: acc.paid + mn.paid,
          debt: acc.debt + mn.debt,
          profit: acc.profit + mn.profit,
        };
      }, { count: 0, revenue: 0, paid: 0, debt: 0, profit: 0 });

      return {
        year: y,
        stats: yearTotal,
        months: sortedMonths.map(m => ({
          month: m,
          stats: months[m],
        })),
      };
    });
  }, [processedOrders, excludeCancelled]);

  // Computed lists of years/months for manual filter inputs
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    processedOrders.forEach(o => yearsSet.add(o.parsedDate.getFullYear()));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [processedOrders]);

  // Format Helper
  const fmtMoney = (v: number) => {
    return v.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + t('uah');
  };

  // Compare percentage change calculator
  const renderCompareMetric = (current: number, previous: number) => {
    if (preset === 'all_time' || !dateFrom || !dateTo) return null;
    if (previous === 0) {
      return current > 0 ? (
        <span className="compare-badge compare-badge--up">▲ +100%</span>
      ) : null;
    }
    const pct = ((current - previous) / previous) * 100;
    const isUp = pct >= 0;
    const absPct = Math.abs(pct).toFixed(1);
    
    return (
      <span className={`compare-badge ${isUp ? 'compare-badge--up' : 'compare-badge--down'}`}>
        {isUp ? '▲' : '▼'} {isUp ? '+' : '-'}{absPct}%
      </span>
    );
  };

  // Get month names in Ukrainian/Russian
  const getMonthName = (mZeroIndexed: number) => {
    const namesUA = [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];
    return namesUA[mZeroIndexed] || '';
  };

  return (
    <div className="analytics-page fade-in">
      <div className="analytics-header">
        <div className="analytics-header__title-group">
          <h1>{t('reports_and_analytics') || 'Звіти та аналітика'}</h1>
          <p className="text-muted">Управлінський фінансовий дашборд для контролю та планування</p>
        </div>


      </div>

      {/* ─── FILTERS BAR ─── */}
      <div className="analytics-filters-card">
        {/* Presets */}
        <div className="presets-row">
          <span className="presets-label">{t('preset_period') || 'Період'}:</span>
          {[
            { key: 'today', label: t('preset_today') },
            { key: 'this_month', label: t('preset_this_month') },
            { key: 'prev_month', label: t('preset_prev_month') },
            { key: 'this_quarter', label: t('preset_this_quarter') },
            { key: 'this_year', label: t('preset_this_year') },
            { key: 'prev_year', label: t('preset_prev_year') },
            { key: 'all_time', label: t('preset_all_time') },
          ].map(p => (
            <button
              key={p.key}
              className={`preset-btn ${preset === p.key ? 'preset-btn--active' : ''}`}
              onClick={() => setPreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="manual-filters-row">
          {/* Select year, quarter, month */}
          <div className="selects-group">
            <div className="form-group">
              <label>{t('year') || 'Рік'}</label>
              <select 
                className="form-select"
                onChange={e => handleManualPeriodChange(e.target.value, '', '')}
                defaultValue={new Date().getFullYear().toString()}
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>{t('quarter') || 'Квартал'}</label>
              <select 
                className="form-select"
                onChange={e => {
                  const select = e.target.closest('.selects-group')?.querySelector('select') as HTMLSelectElement;
                  handleManualPeriodChange(select?.value || '', e.target.value, '');
                }}
              >
                <option value="">—</option>
                <option value="1">I</option>
                <option value="2">II</option>
                <option value="3">III</option>
                <option value="4">IV</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('month') || 'Місяць'}</label>
              <select 
                className="form-select"
                onChange={e => {
                  const select = e.target.closest('.selects-group')?.querySelector('select') as HTMLSelectElement;
                  handleManualPeriodChange(select?.value || '', '', e.target.value);
                }}
              >
                <option value="">—</option>
                {Array(12).fill(0).map((_, i) => (
                  <option key={i + 1} value={i + 1}>{getMonthName(i)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="custom-dates-group">
            <div className="form-group">
              <label>{t('date_from') || 'З'}</label>
              <input
                type="date"
                className="form-input"
                value={dateFrom}
                onChange={e => {
                  setPreset('custom');
                  setDateFrom(e.target.value);
                }}
              />
            </div>
            <div className="form-group">
              <label>{t('date_to') || 'По'}</label>
              <input
                type="date"
                className="form-input"
                value={dateTo}
                onChange={e => {
                  setPreset('custom');
                  setDateTo(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABS NAVIGATION ─── */}
      <div className="analytics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📈 {t('financial_dashboard') || 'Фінансовий дашборд'}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📂 {t('order_history') || 'Історія замовлень'}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'clients' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          👥 {t('clients_analytics') || 'Аналітика по клієнтах'}
        </button>
      </div>

      {/* ─── PAGE BODY ─── */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /> {t('loading')}</div>
      ) : error ? (
        <div className="order-alert-error">⚠️ {error}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="analytics-empty-state card">
          <div className="empty-state-icon">📊</div>
          <h3>{t('empty_orders') || 'За вибраний період замовлень немає'}</h3>
          <p className="text-muted">Спробуйте змінити період фільтрації або додати нові замовлення.</p>
        </div>
      ) : (
        <>
          {/* TAB 1: FINANCIAL DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="tab-content">
              {/* KPI Cards Grid */}
              <div className="analytics-kpi-grid">
                <div className="stat-card">
                  <span className="stat-card__label">{t('revenue_period') || 'Оборот за період'}</span>
                  <div className="stat-card__value text-accent">{fmtMoney(stats.revenue)}</div>
                  <div className="stat-card__compare">
                    {renderCompareMetric(stats.revenue, prevStats.revenue)}
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-card__label">{t('profit_period') || 'Прибуток за період'}</span>
                  <div className="stat-card__value text-success">{fmtMoney(stats.profit)}</div>
                  <div className="stat-card__compare">
                    {renderCompareMetric(stats.profit, prevStats.profit)}
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-card__label">{t('orders_count') || 'Кількість замовлень'}</span>
                  <div className="stat-card__value">{stats.count}</div>
                  <div className="stat-card__compare">
                    {renderCompareMetric(stats.count, prevStats.count)}
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-card__label">{t('average_bill') || 'Середній чек'}</span>
                  <div className="stat-card__value text-warning">{fmtMoney(stats.avg)}</div>
                  <div className="stat-card__compare">
                    {renderCompareMetric(stats.avg, prevStats.avg)}
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-card__label">{t('total_payments') || 'Загальна сума оплат'}</span>
                  <div className="stat-card__value text-success">{fmtMoney(stats.paid)}</div>
                  <div className="stat-card__compare">
                    {renderCompareMetric(stats.paid, prevStats.paid)}
                  </div>
                </div>

                <div className="stat-card">
                  <span className="stat-card__label">{t('total_client_debt') || 'Загальний борг клієнтів'}</span>
                  <div className="stat-card__value text-danger">{fmtMoney(stats.debt)}</div>
                  <div className="stat-card__compare">
                    {renderCompareMetric(stats.debt, prevStats.debt)}
                  </div>
                </div>
              </div>

              {/* ─── CHARTS & VISUALIZATIONS SECTION ─── */}
              <div className="analytics-charts-grid">
                
                {/* 1. Monthly Dynamics of Revenue & Profit */}
                <div className="chart-card">
                  <h3>📈 {t('dynamics_profit') || 'Динаміка прибутку та обороту'}</h3>
                  <div className="svg-chart-container">
                    <svg viewBox="0 0 600 240" className="svg-chart">
                      <defs>
                        <linearGradient id="area-rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity="0.3"/>
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity="0"/>
                        </linearGradient>
                        <linearGradient id="area-prof" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-success)" stopOpacity="0.3"/>
                          <stop offset="95%" stopColor="var(--color-success)" stopOpacity="0"/>
                        </linearGradient>
                      </defs>

                      {/* Chart Grid Lines */}
                      <line x1="40" y1="30" x2="570" y2="30" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="40" y1="90" x2="570" y2="90" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="40" y1="150" x2="570" y2="150" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="40" y1="200" x2="570" y2="200" stroke="var(--border-color)" />

                      {/* Calculate SVG Coordinates */}
                      {(() => {
                        const monthlyStats = Array(12).fill(0).map((_, idx) => {
                          let rev = 0;
                          let prof = 0;
                          filteredOrders.forEach(o => {
                            if (o.parsedDate.getMonth() === idx) {
                              rev += o.totalUAH;
                              prof += o.profitUAH;
                            }
                          });
                          return { month: idx, rev, prof };
                        });

                        const maxVal = Math.max(...monthlyStats.map(s => Math.max(s.rev, s.prof)), 1000);
                        const pointsRev: string[] = [];
                        const pointsProf: string[] = [];

                        monthlyStats.forEach((s, idx) => {
                          const x = 40 + (idx * 48);
                          const yRev = 200 - ((s.rev / maxVal) * 160);
                          const yProf = 200 - ((s.prof / maxVal) * 160);

                          pointsRev.push(`${x},${yRev}`);
                          pointsProf.push(`${x},${yProf}`);
                        });

                        return (
                          <>
                            {/* Area under lines */}
                            <path 
                              d={`M40,200 L${pointsRev.join(' L')} L568,200 Z`} 
                              fill="url(#area-rev)" 
                            />
                            <path 
                              d={`M40,200 L${pointsProf.join(' L')} L568,200 Z`} 
                              fill="url(#area-prof)" 
                            />

                            {/* Lines */}
                            <path 
                              d={`M${pointsRev.join(' L')}`} 
                              fill="none" 
                              stroke="var(--color-primary)" 
                              strokeWidth="3" 
                            />
                            <path 
                              d={`M${pointsProf.join(' L')}`} 
                              fill="none" 
                              stroke="var(--color-success)" 
                              strokeWidth="3" 
                            />

                            {/* Axis text values */}
                            <text x="35" y="34" textAnchor="end" className="chart-axis-text">{Math.round(maxVal).toLocaleString()}</text>
                            <text x="35" y="114" textAnchor="end" className="chart-axis-text">{Math.round(maxVal / 2).toLocaleString()}</text>
                            <text x="35" y="204" textAnchor="end" className="chart-axis-text">0</text>

                            {/* Interactive Hover Dots */}
                            {monthlyStats.map((s, idx) => {
                              const x = 40 + (idx * 48);
                              const yRev = 200 - ((s.rev / maxVal) * 160);
                              const yProf = 200 - ((s.prof / maxVal) * 160);

                              return (
                                <g key={idx} className="chart-interactive-point">
                                  {/* Hidden larger hover area */}
                                  <circle 
                                    cx={x} cy={yRev} r="12" fill="transparent" 
                                    onMouseEnter={(e) => {
                                      setHoveredData({
                                        x: e.clientX,
                                        y: e.clientY - 80,
                                        title: getMonthName(s.month),
                                        metrics: [
                                          { label: t('revenue_period') || 'Оборот', value: fmtMoney(s.rev), color: 'var(--color-primary)' },
                                          { label: t('profit_period') || 'Прибуток', value: fmtMoney(s.prof), color: 'var(--color-success)' }
                                        ]
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredData(null)}
                                  />
                                  <circle cx={x} cy={yRev} r="4" fill="var(--color-primary)" stroke="#fff" strokeWidth="1.5" />
                                  <circle cx={x} cy={yProf} r="4" fill="var(--color-success)" stroke="#fff" strokeWidth="1.5" />
                                </g>
                              );
                            })}

                            {/* X-axis labels */}
                            {monthlyStats.map((s, idx) => (
                              <text 
                                key={idx} x={40 + (idx * 48)} y="220" 
                                textAnchor="middle" className="chart-label-text"
                              >
                                {getMonthName(s.month).substring(0, 3)}
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    {/* Chart legends */}
                    <div className="chart-legend-row">
                      <div className="legend-item"><span className="legend-dot legend-dot--primary"></span> {t('revenue_period') || 'Оборот'}</div>
                      <div className="legend-item"><span className="legend-dot legend-dot--success"></span> {t('profit_period') || 'Прибуток'}</div>
                    </div>
                  </div>
                </div>

                {/* 2. Monthly Dynamics of Orders Count (Bar Chart) */}
                <div className="chart-card">
                  <h3>📊 {t('dynamics_orders') || 'Динаміка кількості замовлень'}</h3>
                  <div className="svg-chart-container">
                    <svg viewBox="0 0 600 240" className="svg-chart">
                      {/* Grid Lines */}
                      <line x1="40" y1="30" x2="570" y2="30" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="40" y1="115" x2="570" y2="115" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="40" y1="200" x2="570" y2="200" stroke="var(--border-color)" />

                      {(() => {
                        const monthlyStats = Array(12).fill(0).map((_, idx) => {
                          let count = 0;
                          filteredOrders.forEach(o => {
                            if (o.parsedDate.getMonth() === idx) count += 1;
                          });
                          return { month: idx, count };
                        });

                        const maxVal = Math.max(...monthlyStats.map(s => s.count), 5);
                        const barWidth = 24;

                        return (
                          <>
                            {/* Axis Values */}
                            <text x="35" y="34" textAnchor="end" className="chart-axis-text">{maxVal}</text>
                            <text x="35" y="119" textAnchor="end" className="chart-axis-text">{Math.round(maxVal / 2)}</text>
                            <text x="35" y="204" textAnchor="end" className="chart-axis-text">0</text>

                            {/* Render Bars */}
                            {monthlyStats.map((s, idx) => {
                              const x = 40 + (idx * 48) - (barWidth / 2);
                              const barHeight = (s.count / maxVal) * 160;
                              const y = 200 - barHeight;

                              return (
                                <g key={idx}>
                                  <rect 
                                    x={x} y={y} width={barWidth} height={barHeight} 
                                    rx="4" ry="4"
                                    fill="var(--color-primary)"
                                    opacity="0.85"
                                    className="chart-bar"
                                    onMouseEnter={(e) => {
                                      setHoveredData({
                                        x: e.clientX,
                                        y: e.clientY - 60,
                                        title: getMonthName(s.month),
                                        metrics: [
                                          { label: t('orders_count') || 'Замовлень', value: String(s.count), color: 'var(--color-primary)' }
                                        ]
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredData(null)}
                                  />
                                </g>
                              );
                            })}

                            {/* X-axis labels */}
                            {monthlyStats.map((s, idx) => (
                              <text 
                                key={idx} x={40 + (idx * 48)} y="220" 
                                textAnchor="middle" className="chart-label-text"
                              >
                                {getMonthName(s.month).substring(0, 3)}
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* 3. Seasonality & YoY comparison (Bar Chart side-by-side) */}
                <div className="chart-card chart-card--full-width">
                  <h3>📊 {t('seasonality_orders_profit') || 'Сезонність: Порівняння обороту по місяцях (YoY)'}</h3>
                  <div className="svg-chart-container">
                    <svg viewBox="0 0 1000 280" className="svg-chart">
                      {/* Grid Lines */}
                      <line x1="50" y1="30" x2="970" y2="30" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="50" y1="115" x2="970" y2="115" stroke="var(--border-color)" strokeDasharray="4 4" />
                      <line x1="50" y1="200" x2="970" y2="200" stroke="var(--border-color)" />

                      {(() => {
                        const curYear = seasonalityData.activeYear;
                        const prevYear = seasonalityData.lastYear;
                        const maxVal = Math.max(
                          ...seasonalityData.current.map(m => m.revenue),
                          ...seasonalityData.previous.map(m => m.revenue),
                          1000
                        );
                        const groupWidth = 74;
                        const barWidth = 24;

                        return (
                          <>
                            {/* Axis Values */}
                            <text x="45" y="34" textAnchor="end" className="chart-axis-text">{Math.round(maxVal).toLocaleString()}</text>
                            <text x="45" y="119" textAnchor="end" className="chart-axis-text">{Math.round(maxVal / 2).toLocaleString()}</text>
                            <text x="45" y="204" textAnchor="end" className="chart-axis-text">0</text>

                            {/* Render Bars side-by-side */}
                            {Array(12).fill(0).map((_, idx) => {
                              const groupX = 50 + (idx * groupWidth) + 12;
                              
                              const curHeight = (seasonalityData.current[idx].revenue / maxVal) * 160;
                              const curY = 200 - curHeight;
                              const curX = groupX - barWidth - 2;

                              const prevHeight = (seasonalityData.previous[idx].revenue / maxVal) * 160;
                              const prevY = 200 - prevHeight;
                              const prevX = groupX + 2;

                              return (
                                <g key={idx}>
                                  {/* Last Year Bar */}
                                  <rect 
                                    x={prevX} y={prevY} width={barWidth} height={prevHeight} 
                                    rx="3" ry="3"
                                    fill="var(--text-muted)"
                                    opacity="0.5"
                                    className="chart-bar"
                                    onMouseEnter={(e) => {
                                      setHoveredData({
                                        x: e.clientX,
                                        y: e.clientY - 60,
                                        title: `${getMonthName(idx)} ${prevYear}`,
                                        metrics: [
                                          { label: t('revenue_period') || 'Оборот', value: fmtMoney(seasonalityData.previous[idx].revenue) }
                                        ]
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredData(null)}
                                  />

                                  {/* Current Year Bar */}
                                  <rect 
                                    x={curX} y={curY} width={barWidth} height={curHeight} 
                                    rx="3" ry="3"
                                    fill="var(--color-primary)"
                                    className="chart-bar"
                                    onMouseEnter={(e) => {
                                      setHoveredData({
                                        x: e.clientX,
                                        y: e.clientY - 60,
                                        title: `${getMonthName(idx)} ${curYear}`,
                                        metrics: [
                                          { label: t('revenue_period') || 'Оборот', value: fmtMoney(seasonalityData.current[idx].revenue), color: 'var(--color-primary)' }
                                        ]
                                      });
                                    }}
                                    onMouseLeave={() => setHoveredData(null)}
                                  />
                                </g>
                              );
                            })}

                            {/* X-axis labels */}
                            {Array(12).fill(0).map((_, idx) => (
                              <text 
                                key={idx} x={50 + (idx * groupWidth) + 12} y="220" 
                                textAnchor="middle" className="chart-label-text"
                              >
                                {getMonthName(idx)}
                              </text>
                            ))}
                          </>
                        );
                      })()}
                    </svg>

                    <div className="chart-legend-row">
                      <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: 'var(--text-muted)', opacity: 0.5 }}></span> {seasonalityData.lastYear} {t('year')}</div>
                      <div className="legend-item"><span className="legend-dot legend-dot--primary"></span> {seasonalityData.activeYear} {t('year')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDER HISTORY GROUPED TREE */}
          {activeTab === 'history' && (
            <div className="tab-content card">
              <h3 className="section-title">📂 {t('order_history') || 'Історія замовлень по періодах'}</h3>
              
              <div className="history-tree">
                {historyTree.map(yearNode => (
                  <div key={yearNode.year} className="history-tree__year-node">
                    <div 
                      className="history-tree__year-header"
                      onClick={() => setExpandedYears(prev => ({ ...prev, [yearNode.year]: !prev[yearNode.year] }))}
                    >
                      <span className={`arrow ${expandedYears[yearNode.year] ? 'arrow--expanded' : ''}`}>▶</span>
                      <span className="year-title">{yearNode.year} {t('year')}</span>
                      
                      <div className="node-summaries">
                        <span>{t('orders_count') || 'Замовлень'}: <strong>{yearNode.stats.count}</strong></span>
                        <span className="text-accent">{t('revenue_period') || 'Оборот'}: <strong>{fmtMoney(yearNode.stats.revenue)}</strong></span>
                        <span className="text-success">{t('profit_period') || 'Прибуток'}: <strong>{fmtMoney(yearNode.stats.profit)}</strong></span>
                        <span className="text-danger">{t('debt') || 'Борг'}: <strong>{fmtMoney(yearNode.stats.debt)}</strong></span>
                      </div>
                    </div>

                    {expandedYears[yearNode.year] && (
                      <div className="history-tree__months-container">
                        {yearNode.months.map(monthNode => {
                          const monthKey = `${yearNode.year}-${monthNode.month}`;
                          return (
                            <div key={monthNode.month} className="history-tree__month-node">
                              <div 
                                className="history-tree__month-header"
                                onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))}
                              >
                                <span className={`arrow ${expandedMonths[monthKey] ? 'arrow--expanded' : ''}`}>▶</span>
                                <span className="month-title">{getMonthName(monthNode.month - 1)}</span>

                                <div className="node-summaries">
                                  <span>{t('orders_count') || 'Замовлень'}: <strong>{monthNode.stats.count}</strong></span>
                                  <span className="text-accent"><strong>{fmtMoney(monthNode.stats.revenue)}</strong></span>
                                  <span className="text-success"><strong>{fmtMoney(monthNode.stats.profit)}</strong></span>
                                  <span className="text-danger"><strong>{fmtMoney(monthNode.stats.debt)}</strong></span>
                                </div>
                              </div>

                              {expandedMonths[monthKey] && (
                                <div className="history-tree__orders-table-wrapper">
                                  <table className="data-table">
                                    <thead>
                                      <tr>
                                        <th>№</th>
                                        <th>{t('date')}</th>
                                        <th>{t('client')}</th>
                                        <th>{t('status')}</th>
                                        <th className="num">{t('total')}</th>
                                        <th className="num">{t('paid_amount')}</th>
                                        <th className="num">{t('debt')}</th>
                                        <th className="num">{t('profit')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {monthNode.stats.items.map(item => (
                                        <tr key={item.id}>
                                          <td className="fw-600">#{item.id}</td>
                                          <td>{new Date(item.date).toLocaleDateString('uk-UA')}</td>
                                          <td>{item.client_name}</td>
                                          <td>
                                            <span className={`badge ${
                                              item.group === 'Виконано' ? 'badge--status-completed' :
                                              item.group === 'Скасовано' ? 'badge--status-cancelled' :
                                              'badge--status-new'
                                            }`}>
                                              {item.group}
                                            </span>
                                          </td>
                                          <td className="num">{fmtMoney(item.totalUAH)}</td>
                                          <td className="num text-success">{fmtMoney(item.paidUAH)}</td>
                                          <td className="num text-danger">{fmtMoney(item.debtUAH)}</td>
                                          <td className="num text-success">{fmtMoney(item.profitUAH)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CLIENTS ANALYTICS */}
          {activeTab === 'clients' && (
            <div className="tab-content card">
              <div className="clients-toolbar">
                <h3>👥 {t('top_clients_orders') || 'Аналітика по клієнтах'}</h3>
                
                <div className="sort-selector">
                  <span>Сортувати за:</span>
                  <select 
                    className="form-select"
                    value={clientsSortBy}
                    onChange={e => setClientsSortBy(e.target.value as any)}
                    style={{ width: '180px', display: 'inline-block', marginLeft: '8px' }}
                  >
                    <option value="revenue">💰 Оборотом (сума)</option>
                    <option value="profit">📈 Прибутком</option>
                    <option value="orders">📋 Кількістю замовлень</option>
                  </select>
                </div>
              </div>

              {clientsStats.length === 0 ? (
                <div className="text-muted">{t('empty_clients') || 'Немає клієнтів у вибраному періоді'}</div>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('client')}</th>
                        <th>{t('phone')}</th>
                        <th className="num">{t('orders_count')}</th>
                        <th className="num">{t('revenue_period')}</th>
                        <th className="num">{t('profit_period')}</th>
                        <th className="num">{t('average_bill')}</th>
                        <th className="num">{t('debt')}</th>
                        <th>{t('last_order')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientsStats.map(c => (
                        <tr key={c.clientId} onClick={() => setSelectedClient(c)} className="clickable-row">
                          <td className="fw-600">{c.name}</td>
                          <td>{c.phone}</td>
                          <td className="num">{c.ordersCount}</td>
                          <td className="num text-accent">{fmtMoney(c.totalRevenue)}</td>
                          <td className="num text-success">{fmtMoney(c.totalProfit)}</td>
                          <td className="num text-warning">{fmtMoney(c.averageBill)}</td>
                          <td className="num text-danger">{fmtMoney(c.totalDebt)}</td>
                          <td>{new Date(c.lastOrderDate).toLocaleDateString('uk-UA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── CLIENT DETAIL MODAL ─── */}
      {selectedClient && (
        <>
          <div className="modal-overlay" onClick={() => setSelectedClient(null)} />
          <div className="modal-panel" style={{ width: '700px', maxHeight: '80vh', top: '10%' }}>
            <div className="modal-panel__header">
              <span className="modal-panel__title">👤 {t('client_stats') || 'Статистика клієнта'}</span>
              <button className="modal-panel__close" onClick={() => setSelectedClient(null)}>✕</button>
            </div>
            <div className="modal-panel__body">
              <h2 style={{ marginBottom: '4px' }}>{selectedClient.name}</h2>
              <p className="text-muted" style={{ marginBottom: '24px' }}>📞 {selectedClient.phone}</p>

              {/* Client stats grids */}
              <div className="analytics-kpi-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <span className="stat-card__label">{t('orders_count') || 'Замовлень'}</span>
                  <div className="stat-card__value">{selectedClient.ordersCount}</div>
                </div>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <span className="stat-card__label">{t('average_bill') || 'Середній чек'}</span>
                  <div className="stat-card__value text-warning">{fmtMoney(selectedClient.averageBill)}</div>
                </div>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <span className="stat-card__label">{t('total') || 'Загальна сума'}</span>
                  <div className="stat-card__value text-accent">{fmtMoney(selectedClient.totalRevenue)}</div>
                </div>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <span className="stat-card__label">{t('paid_amount') || 'Сплачено'}</span>
                  <div className="stat-card__value text-success">{fmtMoney(selectedClient.totalPaid)}</div>
                </div>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <span className="stat-card__label">{t('debt') || 'Борг'}</span>
                  <div className="stat-card__value text-danger">{fmtMoney(selectedClient.totalDebt)}</div>
                </div>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <span className="stat-card__label">{t('profit') || 'Прибуток'}</span>
                  <div className="stat-card__value text-success">{fmtMoney(selectedClient.totalProfit)}</div>
                </div>
              </div>

              <h3>{t('last_order') || 'Останні замовлення'}</h3>
              <div className="data-table-wrapper" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>{t('date')}</th>
                      <th className="num">{t('total')}</th>
                      <th className="num">{t('debt')}</th>
                      <th>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders
                      .filter(o => o.client_id === selectedClient.clientId)
                      .slice(0, 5)
                      .map(o => (
                        <tr key={o.id}>
                          <td className="fw-600">#{o.id}</td>
                          <td>{o.parsedDate.toLocaleDateString('uk-UA')}</td>
                          <td className="num">{fmtMoney(o.totalUAH)}</td>
                          <td className="num text-danger">{fmtMoney(o.debtUAH)}</td>
                          <td>
                            <span className={`badge ${
                              o.group === 'Виконано' ? 'badge--status-completed' :
                              o.group === 'Скасовано' ? 'badge--status-cancelled' :
                              'badge--status-new'
                            }`}>
                              {o.group}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── FLOATING CHART TOOLTIP ─── */}
      {hoveredData && (
        <div 
          className="chart-tooltip" 
          style={{ 
            position: 'fixed', 
            left: `${hoveredData.x}px`, 
            top: `${hoveredData.y}px`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div className="chart-tooltip__title">{hoveredData.title}</div>
          {hoveredData.metrics.map((m, idx) => (
            <div key={idx} className="chart-tooltip__metric">
              <span className="chart-tooltip__label">{m.label}:</span>
              <span className="chart-tooltip__value" style={{ color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
