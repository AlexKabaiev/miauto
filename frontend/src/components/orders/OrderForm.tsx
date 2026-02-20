import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ordersApi, clientsApi } from '../../api';
import type { Order, ClientListItem } from '../../types';

interface OrderFormProps {
  orderId: number | null;        // null = create new
  onClose: () => void;
  onSaved: () => void;
}

interface PositionRow {
  _key: string;                   // temp local key
  id?: number;
  code: string;
  name: string;
  quantity: number;
  price_purchase: string;
  price_sell: string;
  manufacturer: string;
  note: string;
}

const emptyPosition = (): PositionRow => ({
  _key: crypto.randomUUID(),
  code: '',
  name: '',
  quantity: 1,
  price_purchase: '0',
  price_sell: '0',
  manufacturer: '',
  note: '',
});

export default function OrderForm({ orderId, onClose, onSaved }: OrderFormProps) {
  const { t } = useTranslation();
  const isEdit = orderId !== null;

  // --- Form state ---
  const [clientId, setClientId] = useState<number | ''>('');
  const [vehicleId, setVehicleId] = useState<number | ''>('');
  const [currency, setCurrency] = useState('грн.');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [markup, setMarkup] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [info, setInfo] = useState('');
  const [author, setAuthor] = useState('');
  const [positions, setPositions] = useState<PositionRow[]>([emptyPosition()]);

  // --- Clients search ---
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientVehicles, setClientVehicles] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load clients for selector
  useEffect(() => {
    const timer = setTimeout(() => {
      const params: Record<string, string> = { limit: '20' };
      if (clientSearch) params.search = clientSearch;
      clientsApi.list(params).then(r => setClients(r.items)).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Load vehicles when client changes
  useEffect(() => {
    if (!clientId) { setClientVehicles([]); return; }
    clientsApi.get(Number(clientId)).then(c => {
      setClientVehicles(c.vehicles || []);
    }).catch(() => {});
  }, [clientId]);

  // Load existing order if editing
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    ordersApi.get(orderId!).then((o: Order) => {
      setClientId(o.client_id);
      setVehicleId(o.vehicle_id ?? '');
      setCurrency(o.currency);
      setExchangeRate(String(o.exchange_rate));
      setMarkup(String(o.markup));
      setDiscount(String(o.discount));
      setInfo(o.info || '');
      setAuthor(o.author || '');
      setPositions(
        o.positions.length > 0
          ? o.positions.map(p => ({
              _key: crypto.randomUUID(),
              id: p.id,
              code: p.code,
              name: p.name,
              quantity: p.quantity,
              price_purchase: p.price_purchase,
              price_sell: p.price_sell,
              manufacturer: p.manufacturer || '',
              note: p.note || '',
            }))
          : [emptyPosition()],
      );
    }).finally(() => setLoading(false));
  }, [orderId, isEdit]);

  // --- Position helpers ---
  const updatePos = (key: string, field: keyof PositionRow, value: any) => {
    setPositions(prev =>
      prev.map(p => (p._key === key ? { ...p, [field]: value } : p)),
    );
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
  const profit = totalSell - totalPurchase;

  const fmtMoney = (n: number) =>
    n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- Submit ---
  const handleSave = async () => {
    if (!clientId) return;
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
        positions: positions
          .filter(p => p.code || p.name) // skip empty rows
          .map(p => ({
            code: p.code,
            name: p.name,
            quantity: p.quantity,
            price_purchase: parseFloat(p.price_purchase) || 0,
            price_sell: parseFloat(p.price_sell) || 0,
            manufacturer: p.manufacturer || null,
            note: p.note || null,
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
      <div className="modal-panel">
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
              {/* ── Client + Vehicle ── */}
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('client')}</label>
                  <input
                    className="form-input"
                    placeholder={t('search_client')}
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    list="clients-datalist"
                  />
                  <datalist id="clients-datalist">
                    {clients.map(c => (
                      <option key={c.id} value={c.fio} />
                    ))}
                  </datalist>
                  <select
                    className="form-select"
                    value={clientId}
                    onChange={e => { setClientId(Number(e.target.value)); setVehicleId(''); }}
                  >
                    <option value="">— {t('select')} —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.fio} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
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
              </div>

              {/* ── Currency / Markup / Discount ── */}
              <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
                <div className="form-group">
                  <label>{t('currency')}</label>
                  <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="грн.">грн.</option>
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
                        <th>{t('code')}</th>
                        <th>{t('name')}</th>
                        <th style={{ width: 60 }}>{t('quantity')}</th>
                        <th style={{ width: 90 }}>{t('purchase_price')}</th>
                        <th style={{ width: 90 }}>{t('sell_price')}</th>
                        <th>{t('manufacturer')}</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(p => (
                        <tr key={p._key}>
                          <td>
                            <input value={p.code} onChange={e => updatePos(p._key, 'code', e.target.value)} placeholder="Артикул" />
                          </td>
                          <td>
                            <input value={p.name} onChange={e => updatePos(p._key, 'name', e.target.value)} placeholder="Назва запчастини" />
                          </td>
                          <td>
                            <input className="num-input" type="number" min="1" value={p.quantity} onChange={e => updatePos(p._key, 'quantity', parseInt(e.target.value) || 1)} />
                          </td>
                          <td>
                            <input className="num-input" type="number" step="0.01" value={p.price_purchase} onChange={e => updatePos(p._key, 'price_purchase', e.target.value)} />
                          </td>
                          <td>
                            <input className="num-input" type="number" step="0.01" value={p.price_sell} onChange={e => updatePos(p._key, 'price_sell', e.target.value)} />
                          </td>
                          <td>
                            <input value={p.manufacturer} onChange={e => updatePos(p._key, 'manufacturer', e.target.value)} placeholder="" />
                          </td>
                          <td>
                            <button className="btn-remove" onClick={() => removePos(p._key)} title={t('delete')}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals summary */}
                <div className="order-summary">
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('purchase_price')}</span>
                    <span className="order-summary__value">{fmtMoney(totalPurchase)} ₴</span>
                  </div>
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('sell_price')}</span>
                    <span className="order-summary__value fw-600">{fmtMoney(totalSell)} ₴</span>
                  </div>
                  <div className="order-summary__item">
                    <span className="order-summary__label">{t('profit')}</span>
                    <span className={`order-summary__value ${profit >= 0 ? 'text-accent' : 'text-danger'}`}>
                      {fmtMoney(profit)} ₴
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Info ── */}
              <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
                <div className="form-group form-grid--full">
                  <label>{t('note')}</label>
                  <textarea className="form-textarea" value={info} onChange={e => setInfo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('author')}</label>
                  <input className="form-input" value={author} onChange={e => setAuthor(e.target.value)} />
                </div>
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
