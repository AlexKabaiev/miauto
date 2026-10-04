import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../../api';
import { useResizableModal } from '../../hooks/useResizableModal';
import { CAR_BRANDS, CAR_MODELS } from '../../utils/carData';

interface ClientFormProps {
  clientId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onCreateOrder?: (clientId: number) => void;
}

interface VehicleRow {
  _key: string;
  id?: number;
  brand: string;
  model: string;
  vin: string;
  license_plate: string;
  engine_volume: string;
  year: string;
}

const emptyVehicle = (): VehicleRow => ({
  _key: crypto.randomUUID(),
  brand: '',
  model: '',
  vin: '',
  license_plate: '',
  engine_volume: '',
  year: '',
});

export default function ClientForm({ clientId, onClose, onSaved, onCreateOrder }: ClientFormProps) {
  const { t } = useTranslation();
  const isEdit = clientId !== null;
  const panelRef = useResizableModal('miauto_client_modal_width', 600);

  const flagOptions = [
    { value: 'VIP', label: t('flag_vip') },
    { value: 'Є борг', label: t('flag_debt'), disabled: true },
    { value: 'Потребує передоплату', label: t('flag_prepayment') },
    { value: 'Ризиковий', label: t('flag_risky') },
  ];

  const problemReasons = [
    { value: 'Прострочені оплати', label: t('reason_unpaid') },
    { value: 'Є борг', label: t('reason_debt') },
    { value: 'Часто відмовляється від замовлень', label: t('reason_rejected') },
    { value: 'Не забирає товар', label: t('reason_no_show') },
    { value: 'Конфліктний клієнт', label: t('reason_conflict') },
    { value: 'Інше', label: t('reason_other') },
  ];

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'Новий': return 'badge badge--status-new';
      case 'Активний': return 'badge badge--active';
      case 'На паузі': return 'badge badge--status-processing';
      case 'Проблемний': return 'badge badge--danger';
      case 'Архівний': return 'badge badge--inactive';
      default: return 'badge badge--inactive';
    }
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case 'Новий': return t('client_status_new');
      case 'Активний': return t('client_status_active');
      case 'На паузі': return t('client_status_pause');
      case 'Проблемний': return t('client_status_problematic');
      case 'Архівний': return t('client_status_archived');
      default: return st;
    }
  };

  const [fio, setFio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [inn, setInn] = useState('');
  const [firm, setFirm] = useState('');
  const [discount, setDiscount] = useState('0');
  const [status, setStatus] = useState('Новий');
  const [originalStatus, setOriginalStatus] = useState('Новий');
  const [flags, setFlags] = useState<string[]>([]);
  const [problemReason, setProblemReason] = useState('');
  const [problemComment, setProblemComment] = useState('');
  const [managerName, setManagerName] = useState('');
  const [changeComment, setChangeComment] = useState('');
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [info, setInfo] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([emptyVehicle()]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Load existing client data
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    clientsApi.get(clientId!).then((c: any) => {
      setFio(c.fio || '');
      setPhone(c.phone || '');
      setEmail(c.email || '');
      setInn(c.inn || '');
      setFirm(c.firm || '');
      setDiscount(String(c.discount || 0));
      setStatus(c.status || 'Активний');
      setOriginalStatus(c.status || 'Активний');
      setFlags(c.flags ? c.flags.split(',').map((f: string) => f.trim()) : []);
      setProblemReason(c.problem_reason || '');
      setProblemComment(c.problem_comment || '');
      setManagerName('');
      setChangeComment('');
      setStatusHistory(c.status_history || []);
      setInfo(c.info || '');
      setVehicles(
        c.vehicles && c.vehicles.length > 0
          ? c.vehicles.map((v: any) => ({
              _key: crypto.randomUUID(),
              id: v.id,
              brand: v.brand || '',
              model: v.model || '',
              vin: v.vin || '',
              license_plate: v.license_plate || '',
              engine_volume: v.engine_volume || '',
              year: v.year || '',
            }))
          : [emptyVehicle()],
      );
    }).finally(() => setLoading(false));
  }, [clientId, isEdit]);

  // Auto-resize for textarea
  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.height = 'auto';
      noteRef.current.style.height = `${noteRef.current.scrollHeight}px`;
    }
  }, [info]);

  const updateVehicle = (key: string, field: keyof VehicleRow, value: string) => {
    setVehicles(prev =>
      prev.map(v => {
        if (v._key !== key) return v;
        const updated = { ...v, [field]: value };
        if (field === 'brand' && v.brand !== value) {
          updated.model = '';
        }
        return updated;
      }),
    );
  };

  const removeVehicle = (key: string) => {
    setVehicles(prev => {
      const next = prev.filter(v => v._key !== key);
      return next.length === 0 ? [emptyVehicle()] : next;
    });
  };

  const addVehicle = () => setVehicles(prev => [...prev, emptyVehicle()]);

  const handleSave = async () => {
    if (!fio.trim()) return;

    if (status === 'Проблемний' && !problemReason && !problemComment.trim()) {
      alert(t('error_problem_reason_required'));
      return;
    }

    if (status !== originalStatus && !managerName.trim()) {
      alert(t('error_manager_name_required'));
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        fio: fio.trim(),
        phone: phone || null,
        email: email || null,
        inn: inn || null,
        firm: firm || null,
        discount: parseFloat(discount) || 0,
        info: info || null,
        status,
        flags: flags.join(','),
        problem_reason: status === 'Проблемний' ? problemReason : null,
        problem_comment: status === 'Проблемний' ? problemComment : null,
        manager_name: status !== originalStatus ? managerName.trim() : null,
        change_comment: status !== originalStatus ? changeComment.trim() : null,
        vehicles: vehicles
          .map(v => ({
            id: v.id,
            brand: v.brand?.trim() || null,
            model: v.model?.trim() || null,
            vin: v.vin?.trim() || null,
            license_plate: v.license_plate?.trim() || null,
            engine_volume: v.engine_volume?.trim() || null,
            year: v.year?.trim() || null,
          }))
          .filter(v => v.brand || v.model || v.vin || v.license_plate || v.engine_volume || v.year),
      };
      if (isEdit) {
        await clientsApi.update(clientId!, payload);
      } else {
        await clientsApi.create(payload);
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
            {isEdit ? `${t('edit_client')} #${clientId}` : t('new_client')}
          </span>
          <button className="modal-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-panel__body">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> {t('loading')}</div>
          ) : (
            <>
              {/* ── Main Info ── */}
              <div className="form-grid">
                <div className="form-group form-grid--full">
                  <label>{t('client_name')}</label>
                  <input className="form-input" value={fio} onChange={e => setFio(e.target.value)} placeholder={t('client_name_placeholder')} />
                </div>
                <div className="form-group">
                  <label>{t('phone')}</label>
                  <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0671234567" />
                </div>
                <div className="form-group">
                  <label>{t('email')}</label>
                  <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('inn')}</label>
                  <input className="form-input" value={inn} onChange={e => setInn(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('firm')}</label>
                  <input className="form-input" value={firm} onChange={e => setFirm(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('discount')}</label>
                  <input className="form-input" type="number" step="0.1" value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>
                <div className="form-group form-grid--full" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <label style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'block' }}>
                    📋 {t('client_status')}
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label>{t('client_status')}</label>
                      <select 
                        className="form-input" 
                        value={status} 
                        onChange={e => setStatus(e.target.value)}
                        style={{ height: '38px' }}
                      >
                        <option value="Новий">{t('client_status_new')}</option>
                        <option value="Активний">{t('client_status_active')}</option>
                        <option value="На паузі">{t('client_status_pause')}</option>
                        <option value="Проблемний">{t('client_status_problematic')}</option>
                        <option value="Архівний">{t('client_status_archived')}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>{t('client_flags')}</label>
                      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                        {flagOptions.map(opt => {
                          const checked = flags.includes(opt.value);
                          return (
                            <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: opt.disabled ? 'not-allowed' : 'pointer', opacity: opt.disabled ? 0.6 : 1 }}>
                              <input 
                                type="checkbox" 
                                checked={checked} 
                                disabled={opt.disabled}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setFlags([...flags, opt.value]);
                                  } else {
                                    setFlags(flags.filter(f => f !== opt.value));
                                  }
                                }} 
                              />
                              <span style={{ textTransform: 'none', fontSize: 'var(--font-size-sm)' }}>
                                {opt.label} {opt.value === 'Є борг' && checked && '⚠️'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Problem details */}
                  {status === 'Проблемний' && (
                    <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--radius-md)' }}>
                      <h5 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                        ⚠️ {t('client_status_details')}
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-2)' }}>
                        <div className="form-group">
                          <label>{t('problem_reason')}</label>
                          <select 
                            className="form-input"
                            value={problemReason}
                            onChange={e => setProblemReason(e.target.value)}
                          >
                            <option value="">-- {t('select')} --</option>
                            {problemReasons.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>{t('problem_comment')}</label>
                          <textarea 
                            className="form-textarea" 
                            rows={2}
                            value={problemComment} 
                            onChange={e => setProblemComment(e.target.value)}
                            placeholder="..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status change manager details */}
                  {status !== originalStatus && (
                    <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <h5 style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                        📝 {t('status_change_comment')}
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <div className="form-group">
                          <label>{t('manager_name_label')} *</label>
                          <input 
                            className="form-input" 
                            value={managerName} 
                            onChange={e => setManagerName(e.target.value)}
                            placeholder="..."
                          />
                        </div>
                        <div className="form-group">
                          <label>{t('status_change_comment')}</label>
                          <input 
                            className="form-input" 
                            value={changeComment} 
                            onChange={e => setChangeComment(e.target.value)}
                            placeholder="..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Vehicles ── */}
              <div className="form-section">
                <div className="form-section__header">
                  <span className="form-section__title">🚗 {t('vehicles')}</span>
                  <button className="btn btn--ghost btn--sm" onClick={addVehicle}>+ {t('add')}</button>
                </div>
                <div className="data-table-wrapper">
                  <table className="positions-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 120 }}>{t('brand')}</th>
                        <th style={{ minWidth: 120 }}>{t('model')}</th>
                        <th style={{ minWidth: 160 }}>VIN</th>
                        <th style={{ minWidth: 110 }}>{t('license_plate')}</th>
                        <th style={{ minWidth: 70, width: 70 }}>{t('engine_volume')}</th>
                        <th style={{ minWidth: 80, width: 80 }}>{t('year')}</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map(v => (
                        <tr key={v._key}>
                          <td>
                            <input 
                              value={v.brand} 
                              onChange={e => updateVehicle(v._key, 'brand', e.target.value)} 
                              placeholder="Toyota" 
                              list="car-brands-list"
                            />
                          </td>
                          <td>
                            <input 
                              value={v.model} 
                              onChange={e => updateVehicle(v._key, 'model', e.target.value)} 
                              placeholder="Camry" 
                              list={`car-models-list-${v._key}`}
                            />
                            <datalist id={`car-models-list-${v._key}`}>
                              {(CAR_MODELS[v.brand] || []).map(m => (
                                <option key={m} value={m} />
                              ))}
                            </datalist>
                          </td>
                          <td><input value={v.vin} onChange={e => updateVehicle(v._key, 'vin', e.target.value)} placeholder="VIN" maxLength={17} /></td>
                          <td><input value={v.license_plate} onChange={e => updateVehicle(v._key, 'license_plate', e.target.value)} placeholder="AA1234BB" maxLength={10} /></td>
                          <td><input value={v.engine_volume} onChange={e => updateVehicle(v._key, 'engine_volume', e.target.value)} placeholder="2.0" maxLength={5} /></td>
                          <td><input value={v.year} onChange={e => updateVehicle(v._key, 'year', e.target.value)} placeholder="2020" maxLength={4} /></td>
                          <td>
                            <button className="btn-remove" onClick={() => removeVehicle(v._key)} title={t('delete')}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Notes ── */}
              <div className="form-grid" style={{ marginTop: 'var(--space-4)' }}>
                <div className="form-group" style={{ maxWidth: '400px', width: '100%' }}>
                  <label>{t('note')}</label>
                  <textarea 
                    ref={noteRef}
                    className="form-input form-textarea--auto-height" 
                    value={info} 
                    onChange={e => setInfo(e.target.value)} 
                    rows={2}
                  />
                </div>
              </div>

              {/* ── Status History Log ── */}
              {isEdit && statusHistory && statusHistory.length > 0 && (
                <div className="form-section" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="form-section__header">
                    <span className="form-section__title">📜 {t('status_history')}</span>
                  </div>
                  <div className="data-table-wrapper" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table className="positions-table" style={{ fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr>
                          <th>{t('change_date')}</th>
                          <th>{t('status_old')}</th>
                          <th>{t('status_new_col')}</th>
                          <th>{t('status_change_comment')}</th>
                          <th>{t('changed_by')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusHistory.map(h => (
                          <tr key={h.id}>
                            <td>{new Date(h.created_at).toLocaleString()}</td>
                            <td>
                              <span className={getStatusBadgeClass(h.old_status)}>
                                {getStatusLabel(h.old_status)}
                              </span>
                            </td>
                            <td>
                              <span className={getStatusBadgeClass(h.new_status)}>
                                {getStatusLabel(h.new_status)}
                              </span>
                            </td>
                            <td>{h.comment || '-'}</td>
                            <td>{h.author || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
          {/* Global Datalist for Brands */}
          <datalist id="car-brands-list">
            {CAR_BRANDS.map(b => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        <div className="modal-panel__footer" style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {isEdit && onCreateOrder && (
            <button
              className="btn btn--outline"
              onClick={() => onCreateOrder(clientId)}
            >
              + {t('new_order')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || !fio.trim()}
          >
            {saving ? t('saving') : isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </>
  );
}
