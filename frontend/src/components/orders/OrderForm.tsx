import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ordersApi, clientsApi, productsApi, suppliersApi } from '../../api';
import type { Order, ClientListItem } from '../../types';
import { useResizableModal } from '../../hooks/useResizableModal';

interface OrderFormProps {
  orderId: number | null;        // null = create new
  initialClientId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

interface PositionRow {
  _key: string;                   // temp local key
  id?: number;
  code: string;
  analogs: string;
  name: string;
  quantity: number;
  price_purchase: string;
  price_sell: string;
  manufacturer: string;
  condition: string;
  note: string;
  supplier_id: number | null;
  supplier_name: string;
}

const emptyPosition = (): PositionRow => ({
  _key: crypto.randomUUID(),
  code: '',
  analogs: '',
  name: '',
  quantity: 1,
  price_purchase: '0',
  price_sell: '0',
  manufacturer: '',
  condition: 'Очікує замовлення',
  note: '',
  supplier_id: null,
  supplier_name: '',
});

export default function OrderForm({ orderId, initialClientId, onClose, onSaved }: OrderFormProps) {
  const { t } = useTranslation();
  const isEdit = orderId !== null;
  const panelRef = useResizableModal('miauto_order_modal_width_v3', 1250);

  // --- Form state ---
  const [clientId, setClientId] = useState<number | ''>(initialClientId || '');
  const [clientIdSearch, setClientIdSearch] = useState<string>(initialClientId ? String(initialClientId) : '');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(0);
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  
  // Collapsible section "Додатково"
  const [showMore, setShowMore] = useState(false);
  
  const [currency, setCurrency] = useState('грн.');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [markup, setMarkup] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [info, setInfo] = useState('');
  const [author, setAuthor] = useState('');
  
  // Status and payments
  const [status, setStatus] = useState('Нове');
  const [paid, setPaid] = useState('0');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Dropdown states
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Load static or global data
  useEffect(() => {
    productsApi.manufacturers().then(setManufacturers).catch(() => {});
    suppliersApi.list({ limit: '1000' }).then(res => setSuppliers(res.items)).catch(() => {});
  }, []);
  const [positions, setPositions] = useState<PositionRow[]>([emptyPosition()]);

  // --- Clients search ---
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientVehicles, setClientVehicles] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Load clients for selector
  useEffect(() => {
    const timer = setTimeout(() => {
      const params: Record<string, string> = { limit: '20' };
      if (clientSearch) params.search = clientSearch;
      clientsApi.list(params).then(r => {
        setClients(r.items);
        setActiveDropdownIndex(0);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Load initial client if provided
  useEffect(() => {
    if (initialClientId && !isEdit) {
      clientsApi.get(initialClientId).then(c => {
        setClients(prev => {
          if (!prev.find(p => p.id === c.id)) return [c, ...prev];
          return prev;
        });
        setClientSearch(`${c.fio} ${c.phone ? `(${c.phone})` : ''}`);
      }).catch(() => {});
    }
  }, [initialClientId, isEdit]);

  const handleClientIdSearchChange = async (val: string) => {
    setClientIdSearch(val);
    if (!val.trim()) {
      setClientId('');
      setClientSearch('');
      setVehicleId('');
      return;
    }
    const numericId = Number(val);
    if (isNaN(numericId)) {
      setClientId('');
      setClientSearch('');
      setVehicleId('');
      return;
    }
    try {
      const c = await clientsApi.get(numericId);
      if (c && c.id) {
        setClientId(c.id);
        setVehicleId('');
        setClientSearch(`${c.fio} ${c.phone ? `(${c.phone})` : ''}`);
      } else {
        setClientId('');
        setClientSearch('');
        setVehicleId('');
      }
    } catch (err) {
      setClientId('');
      setClientSearch('');
      setVehicleId('');
    }
  };

  const [selectedClient, setSelectedClient] = useState<any>(null);

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'Прострочені оплати': return t('reason_unpaid');
      case 'Є борг': return t('reason_debt');
      case 'Часто відмовляється від замовлень': return t('reason_rejected');
      case 'Не забирає товар': return t('reason_no_show');
      case 'Конфліктний клієнт': return t('reason_conflict');
      case 'Інше': return t('reason_other');
      default: return reason;
    }
  };

  // Load vehicles and details when client changes
  useEffect(() => {
    if (!clientId) {
      setClientVehicles([]);
      setSelectedClient(null);
      return;
    }
    clientsApi.get(Number(clientId)).then(c => {
      setClientVehicles(c.vehicles || []);
      setSelectedClient(c);
    }).catch(() => {
      setSelectedClient(null);
    });
  }, [clientId]);

  // Load existing order if editing
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    ordersApi.get(orderId!).then((o: Order) => {
      setClientId(o.client_id);
      setClientIdSearch(String(o.client_id));
      setClientSearch(`${o.client_name} ${o.client_phone ? `(${o.client_phone})` : ''}`);
      setVehicleId(o.vehicle_id ?? '');
      setCurrency(o.currency);
      setExchangeRate(String(o.exchange_rate));
      setMarkup(String(o.markup));
      setDiscount(String(o.discount));
      setInfo(o.info || '');
      setAuthor(o.author || '');
      setStatus(o.group || 'Нове');
      setPaid(String(o.paid || '0'));
      setPositions(
        o.positions.length > 0
          ? o.positions.map(p => ({
              _key: crypto.randomUUID(),
              id: p.id,
              code: p.code,
              analogs: p.analogs || '',
              name: p.name,
              quantity: p.quantity,
              price_purchase: p.price_purchase,
              price_sell: p.price_sell,
              manufacturer: p.manufacturer || '',
              condition: p.condition || 'Очікує замовлення',
              note: p.note || '',
              supplier_id: p.supplier_id,
              supplier_name: p.supplier_name || '',
            }))
          : [emptyPosition()],
      );
    }).finally(() => setLoading(false));
  }, [orderId, isEdit]);

  // Auto-resize for textarea
  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.height = 'auto';
      noteRef.current.style.height = `${noteRef.current.scrollHeight}px`;
    }
  }, [info]);

  // --- Position helpers ---
  const updatePos = (key: string, field: keyof PositionRow, val: any) => {
    setPositions(prev =>
      prev.map(p => (p._key === key ? { ...p, [field]: val } : p)),
    );
  };

  const handleCodeChange = async (key: string, code: string) => {
    updatePos(key, 'code', code);
    if (code.length >= 2) {
      try {
        const res = await productsApi.list({ search: code, limit: '20' });
        setProductSuggestions(res.items);
        
        // Exact match -> fill other fields
        const exact = res.items.find((p: any) => p.code === code);
        if (exact) {
          setPositions(prev => prev.map(p => {
            if (p._key === key && p.code === code) {
              return {
                ...p,
                name: exact.name || p.name,
                manufacturer: exact.manufacturer_name || p.manufacturer,
                price_purchase: exact.price_purchase ? String(exact.price_purchase) : p.price_purchase,
                price_sell: exact.price ? String(exact.price) : p.price_sell,
                analogs: exact.analogs || p.analogs,
                supplier_id: exact.supplier_id || p.supplier_id,
                supplier_name: exact.supplier_name || p.supplier_name,
              };
            }
            return p;
          }));
        }
      } catch (err) {}
    } else {
      setProductSuggestions([]);
    }
  };

  const handleSupplierChange = (key: string, name: string) => {
    const match = suppliers.find(s => s.name.toLowerCase() === name.toLowerCase());
    setPositions(prev => prev.map(p => {
      if (p._key === key) {
        return { ...p, supplier_name: name, supplier_id: match ? match.id : null };
      }
      return p;
    }));
  };

  const removePos = (key: string) => {
    setPositions(prev => {
      const next = prev.filter(p => p._key !== key);
      return next.length === 0 ? [emptyPosition()] : next;
    });
  };

  const addPos = () => setPositions(prev => [...prev, emptyPosition()]);

  // --- Computed totals ---
  const totalPurchase = positions.reduce(
    (s, p) => s + (parseFloat(p.price_purchase) || 0) * p.quantity, 0,
  );
  const totalSell = positions.reduce(
    (s, p) => s + (parseFloat(p.price_sell) || 0) * p.quantity, 0,
  );

  const markupVal = parseFloat(markup) || 0;
  const discountVal = parseFloat(discount) || 0;
  const totalSellAfterMarkupDiscount = totalSell * (1 + markupVal / 100) * (1 - discountVal / 100);

  const paidNum = parseFloat(paid) || 0;
  const debt = Math.max(0, totalSellAfterMarkupDiscount - paidNum);
  const profit = totalSellAfterMarkupDiscount - totalPurchase;

  const fmtMoney = (n: number) =>
    n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Limit paid value to total sum
  const handlePaidChange = (val: string) => {
    let num = parseFloat(val) || 0;
    if (num < 0) num = 0;
    if (num > totalSellAfterMarkupDiscount) {
      num = totalSellAfterMarkupDiscount;
    }
    setPaid(String(num));
    
    // Якщо борг став 0 і була помилка статусу "Виконано", прибираємо її
    const newDebt = Math.max(0, totalSellAfterMarkupDiscount - num);
    if (newDebt <= 0.01 && status === 'Виконано') {
      setStatusError(null);
    }
  };

  // Status transition rule validation
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'Виконано') {
      const currentDebt = totalSellAfterMarkupDiscount - (parseFloat(paid) || 0);
      if (currentDebt > 0.01) {
        setStatusError(t('error_cannot_complete', { debt: fmtMoney(currentDebt) }));
        return; // do not update status dropdown
      }
    }
    setStatusError(null);

    if (newStatus === 'Скасовано') {
      const confirmDelete = window.confirm(t('confirm_delete_cancelled_order') || "Бажаєте видалити це замовлення?");
      if (confirmDelete) {
        if (isEdit) {
          try {
            setSaving(true);
            await ordersApi.delete(orderId!);
            onSaved();
            onClose();
            return;
          } catch (e: any) {
            alert(e.message || t('delete_error') || "Помилка видалення");
          } finally {
            setSaving(false);
          }
        } else {
          onClose();
          return;
        }
      }
    }

    setStatus(newStatus);
  };

  // Check if all positions are delivered
  const allPartsDelivered = positions.length > 0 && positions.every(p => p.condition === 'Видано клієнту');
  const showReadyTip = allPartsDelivered && debt <= 0.01 && status !== 'Виконано';

  const getStatusClass = (st: string) => {
    switch (st) {
      case 'Нове': return 'badge--status-new';
      case 'В обробці': return 'badge--status-processing';
      case 'Очікує запчастини': return 'badge--status-waiting';
      case 'Готове до видачі': return 'badge--status-ready';
      case 'Виконано': return 'badge--status-completed';
      case 'Скасовано': return 'badge--status-cancelled';
      default: return 'badge--inactive';
    }
  };

  const getPartStatusClass = (st: string) => {
    switch (st) {
      case 'Очікує замовлення': return 'badge--part-waiting';
      case 'Замовлено у постачальника': return 'badge--part-ordered';
      case 'На складі': return 'badge--part-instock';
      case 'Затримка в дорозі': return 'badge--part-delayed';
      case 'Відмова постачальника': return 'badge--part-rejected';
      case 'Видано клієнту': return 'badge--part-delivered';
      default: return 'badge--inactive';
    }
  };

  // --- Submit ---
  const handleSave = async () => {
    if (!clientId) return;
    
    // Double check the business validation rule before submitting
    const finalDebt = totalSellAfterMarkupDiscount - (parseFloat(paid) || 0);
    if (status === 'Виконано' && finalDebt > 0.01) {
      const errMsg = t('error_cannot_complete', { debt: fmtMoney(finalDebt) });
      setStatusError(errMsg);
      alert(errMsg);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: Number(clientId),
        vehicle_id: vehicleId ? Number(vehicleId) : null,
        currency,
        exchange_rate: parseFloat(exchangeRate) || 1,
        markup: parseFloat(markup) || 0,
        discount: parseFloat(discount) || 0,
        info: info || null,
        author: author || null,
        group: status,
        paid: parseFloat(paid) || 0,
        positions: positions
          .filter(p => p.code || p.name) // skip empty rows
          .map(p => ({
            code: p.code,
            analogs: p.analogs || null,
            name: p.name,
            quantity: p.quantity,
            price_purchase: parseFloat(p.price_purchase) || 0,
            price_sell: parseFloat(p.price_sell) || 0,
            manufacturer: p.manufacturer || null,
            condition: p.condition || 'Очікує замовлення',
            note: p.note || null,
            supplier_id: p.supplier_id || null,
          })),
      };

      if (isEdit) {
        await ordersApi.update(orderId!, payload);
      } else {
        await ordersApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e.message || t('save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-panel" ref={panelRef}>
        <div className="modal-panel__header">
          <span className="modal-panel__title">
            {isEdit ? `${t('edit_order')} #${orderId}` : t('new_order')}
          </span>
          <button className="modal-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-panel__body">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> {t('loading')}</div>
          ) : (
            <>
              {/* Client Status & Flag Warnings */}
              {selectedClient && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  {selectedClient.status === 'Проблемний' && (
                    <div className="badge badge--danger" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '12px 16px', borderRadius: 'var(--radius-md)', width: '100%', fontSize: 'var(--font-size-sm)', whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                      <span style={{ fontSize: '1.4rem' }}>⛔</span>
                      <div>
                        <strong>{t('client_status_problematic')}:</strong> {selectedClient.problem_reason ? getReasonLabel(selectedClient.problem_reason) : ''}
                        {selectedClient.problem_comment && <div style={{ marginTop: '4px' }}><em>{selectedClient.problem_comment}</em></div>}
                      </div>
                    </div>
                  )}
                  {selectedClient.flags?.split(',').includes('Є борг') && (
                    <div className="badge badge--status-processing" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '12px 16px', borderRadius: 'var(--radius-md)', width: '100%', fontSize: 'var(--font-size-sm)', whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'left', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--color-warning)', color: 'var(--color-warning)' }}>
                      <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                      <div>
                        <strong>{t('flag_debt')}:</strong> {t('order_form_warn_debt').replace('{{debt}}', fmtMoney(selectedClient.total_debt || 0))}
                      </div>
                    </div>
                  )}
                  {selectedClient.flags?.split(',').includes('Потребує передоплату') && (
                    <div className="badge badge--status-new" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: '12px 16px', borderRadius: 'var(--radius-md)', width: '100%', fontSize: 'var(--font-size-sm)', whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'left', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
                      <span style={{ fontSize: '1.4rem' }}>⇅</span>
                      <div>
                        {t('order_form_warn_prepayment')}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* ── Client + Vehicle + Status ── */}
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('client')}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      className="form-input"
                      style={{ width: '100px', flexShrink: 0 }}
                      placeholder={t('code') || "Код"}
                      value={clientIdSearch}
                      onChange={e => handleClientIdSearchChange(e.target.value)}
                    />
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                      <input
                        className="form-input"
                        placeholder={t('search_client')}
                        value={clientSearch}
                        onChange={e => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          if (clientId !== '') {
                            setClientId('');
                            setClientIdSearch('');
                            setVehicleId('');
                          }
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                        onKeyDown={(e) => {
                          if (!showClientDropdown || clients.length === 0) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActiveDropdownIndex(i => Math.min(i + 1, clients.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveDropdownIndex(i => Math.max(i - 1, 0));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            const c = clients[activeDropdownIndex];
                            if (c) {
                              setClientId(c.id);
                              setClientIdSearch(String(c.id));
                              setVehicleId('');
                              setClientSearch(`${c.fio} ${c.phone ? `(${c.phone})` : ''}`);
                              setShowClientDropdown(false);
                            }
                          } else if (e.key === 'Escape') {
                            setShowClientDropdown(false);
                          }
                        }}
                      />
                      {showClientDropdown && clients.length > 0 && (
                        <div className="custom-dropdown">
                          {clients.map((c, i) => (
                            <div 
                              key={c.id} 
                              className={`custom-dropdown-item ${i === activeDropdownIndex ? 'active' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent onBlur before click
                                setClientId(c.id);
                                setClientIdSearch(String(c.id));
                                setVehicleId('');
                                setClientSearch(`${c.fio} ${c.phone ? `(${c.phone})` : ''}`);
                                setShowClientDropdown(false);
                              }}
                            >
                              {c.fio} {c.phone ? `(${c.phone})` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('vehicle')}</label>
                  <select
                    className="form-select"
                    value={vehicleId}
                    onChange={e => setVehicleId(Number(e.target.value))}
                    disabled={!clientId}
                  >
                    <option value="">— {t('select')} —</option>
                    {clientVehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.brand || ''} {v.model || ''} {v.vin ? `[${v.vin}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('status')}</label>
                  <select
                    className={`badge status-select ${getStatusClass(status)}`}
                    value={status}
                    onChange={e => handleStatusChange(e.target.value)}
                  >
                    <option value="Нове">{t('status_new')}</option>
                    <option value="В обробці">{t('status_processing')}</option>
                    <option value="Очікує запчастини">{t('status_waiting')}</option>
                    <option value="Готове до видачі">{t('status_ready')}</option>
                    <option value="Виконано">{t('status_completed')}</option>
                    <option value="Скасовано">{t('status_cancelled')}</option>
                  </select>
                </div>
              </div>

              {/* ── Collapsible trigger ── */}
              <button
                type="button"
                className="collapsible-trigger"
                onClick={() => setShowMore(!showMore)}
              >
                <span className={`collapsible-trigger__icon ${showMore ? 'collapsible-trigger__icon--active' : ''}`}>▶</span>
                {t('additional') || 'Додатково'}
              </button>

              {/* ── Collapsible Content (Currency / Rate / Markup / Discount / Author) ── */}
              <div className={`collapsible-content ${showMore ? 'collapsible-content--active' : ''}`}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>{t('currency')}</label>
                    <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                      <option value="грн.">{t('uah')}.</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t('exchange_rate')}</label>
                    <input className="form-input" type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('markup')}</label>
                    <input className="form-input" type="number" step="0.1" value={markup} onChange={e => setMarkup(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('discount')}</label>
                    <input className="form-input" type="number" step="0.1" value={discount} onChange={e => setDiscount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>{t('author')}</label>
                    <input className="form-input" value={author} onChange={e => setAuthor(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* ── Positions ── */}
              <div className="form-section">
                <div className="form-section__header">
                  <span className="form-section__title">{t('positions')}</span>
                  <button className="btn btn--ghost btn--sm" onClick={addPos}>+ {t('add')}</button>
                </div>
                <div className="data-table-wrapper">
                  <table className="positions-table">
                    <thead>
                      <tr>
                        <th className="col-code">{t('code')}</th>
                        <th className="col-analog">{t('analogs')}</th>
                        <th className="col-name">{t('name')}</th>
                        <th className="col-qty">{t('quantity_short')}</th>
                        <th className="col-purchase">{t('purchase_price')}</th>
                        <th className="col-sell">{t('sell_price')}</th>
                        <th className="col-mfg">{t('manufacturer')}</th>
                        <th className="col-supplier">{t('supplier')}</th>
                        <th className="col-status-part" style={{ textAlign: 'left' }}>{t('part_status')}</th>
                        <th className="col-delete"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(p => (
                        <tr key={p._key}>
                          <td className="col-code">
                            <input 
                              value={p.code} 
                              onChange={e => handleCodeChange(p._key, e.target.value)} 
                              placeholder={t('product_code')} 
                              list="product-code-suggestions"
                            />
                          </td>
                          <td className="col-analog">
                            <input 
                              value={p.analogs} 
                              onChange={e => updatePos(p._key, 'analogs', e.target.value)} 
                              placeholder={t('analogs_placeholder') || t('analogs')} 
                            />
                          </td>
                          <td className="col-name">
                            <input value={p.name} onChange={e => updatePos(p._key, 'name', e.target.value)} placeholder={t('product_name')} />
                          </td>
                          <td className="col-qty">
                            <input className="num-input" type="number" min="1" value={p.quantity} onChange={e => updatePos(p._key, 'quantity', parseInt(e.target.value) || 1)} />
                          </td>
                          <td className="col-purchase">
                            <input className="num-input tabular-nums" type="number" step="0.01" value={p.price_purchase} onChange={e => updatePos(p._key, 'price_purchase', e.target.value)} />
                          </td>
                          <td className="col-sell">
                            <input className="num-input tabular-nums" type="number" step="0.01" value={p.price_sell} onChange={e => updatePos(p._key, 'price_sell', e.target.value)} />
                          </td>
                          <td className="col-mfg">
                            <input 
                              value={p.manufacturer} 
                              onChange={e => updatePos(p._key, 'manufacturer', e.target.value)} 
                              placeholder="" 
                              list="manufacturer-suggestions"
                            />
                          </td>
                          <td className="col-supplier">
                            <input 
                              value={p.supplier_name} 
                              onChange={e => handleSupplierChange(p._key, e.target.value)} 
                              placeholder={t('supplier')} 
                              list="supplier-suggestions"
                            />
                          </td>
                          <td className="col-status-part" style={{ textAlign: 'center' }}>
                            <select
                              className={`badge part-status-select ${getPartStatusClass(p.condition)}`}
                              value={p.condition || 'Очікує замовлення'}
                              onChange={e => updatePos(p._key, 'condition', e.target.value)}
                            >
                              <option value="Очікує замовлення">{t('part_waiting')}</option>
                              <option value="Замовлено у постачальника">{t('part_ordered')}</option>
                              <option value="На складі">{t('part_instock')}</option>
                              <option value="Затримка в дорозі">{t('part_delayed')}</option>
                              <option value="Відмова постачальника">{t('part_rejected')}</option>
                              <option value="Видано клієнту">{t('part_delivered')}</option>
                            </select>
                          </td>
                          <td className="col-delete">
                            <button className="btn-remove" onClick={() => removePos(p._key)} title={t('delete')}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Financial Block ── */}
                <div className="order-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-4)' }}>
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('purchase_total') || 'Закупка'}</span>
                    <span className="order-summary__value tabular-nums">{fmtMoney(totalPurchase)} ₴</span>
                  </div>
                  
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('total_sum') || 'Сума'}</span>
                    <span className="order-summary__value fw-600 tabular-nums">{fmtMoney(totalSellAfterMarkupDiscount)} ₴</span>
                  </div>
                  
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('paid_amount') || 'Сплачено'}</span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="1"
                        className={`form-input tabular-nums ${
                          paidNum === totalSellAfterMarkupDiscount
                            ? 'text-success fw-600'
                            : paidNum > 0
                            ? 'text-warning'
                            : ''
                        }`}
                        style={{
                          padding: '2px 8px',
                          height: '28px',
                          width: '100px',
                          fontSize: 'var(--font-size-sm)',
                          textAlign: 'right',
                        }}
                        value={paid}
                        onChange={e => handlePaidChange(e.target.value)}
                      />
                      {paidNum > 0 && paidNum < totalSellAfterMarkupDiscount && (
                        <span className="badge badge--payment-partial">{t('partial_payment') || 'Частково'}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('debt_amount') || 'Борг'}</span>
                    <span className={`order-summary__value tabular-nums ${debt > 0.01 ? 'text-danger' : 'text-success'}`}>
                      {debt > 0.01 ? `${fmtMoney(debt)} ₴` : (t('paid_fully') || 'Оплачено')}
                    </span>
                  </div>
                  
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('profit_amount') || 'Прибуток'}</span>
                    <span className={`order-summary__value tabular-nums ${profit > 0 ? 'text-success' : profit < 0 ? 'text-danger' : ''}`}>
                      {fmtMoney(profit)} ₴
                    </span>
                  </div>
                </div>
              </div>

              {/* Datalists for Product autocomplete */}
              <datalist id="product-code-suggestions">
                {productSuggestions.map(p => (
                  <option key={p.id} value={p.code}>{p.name} {p.manufacturer_name ? `(${p.manufacturer_name})` : ''}</option>
                ))}
              </datalist>
              <datalist id="manufacturer-suggestions">
                {manufacturers.map(m => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
              <datalist id="supplier-suggestions">
                {suppliers.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>

              {/* UX Alerts */}
              {showReadyTip && (
                <div className="order-alert-tip">
                  <span>💡</span> {t('order_ready_tip') || "Замовлення готове до переведення у статус 'Виконано'"}
                </div>
              )}

              {statusError && (
                <div className="order-alert-error">
                  <span>⚠️</span> {statusError}
                </div>
              )}

              {/* ── Info ── */}
              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label>{t('note')}</label>
                <textarea 
                  ref={noteRef}
                  className="form-input form-textarea--auto-height" 
                  value={info} 
                  onChange={e => setInfo(e.target.value)} 
                  placeholder={t('note_placeholder') || 'Додайте примітку до замовлення...'}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-panel__footer">
          <button className="btn btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || !clientId}
          >
            {saving ? t('saving') : isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </>
  );
}
