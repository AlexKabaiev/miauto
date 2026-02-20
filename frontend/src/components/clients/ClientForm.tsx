import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../../api';

interface ClientFormProps {
  clientId: number | null;
  onClose: () => void;
  onSaved: () => void;
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

export default function ClientForm({ clientId, onClose, onSaved }: ClientFormProps) {
  const { t } = useTranslation();
  const isEdit = clientId !== null;

  const [fio, setFio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [inn, setInn] = useState('');
  const [firm, setFirm] = useState('');
  const [discount, setDiscount] = useState('0');
  const [isBad, setIsBad] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [info, setInfo] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([emptyVehicle()]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setIsBad(c.is_bad);
      setIsArchived(c.is_archived);
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

  const updateVehicle = (key: string, field: keyof VehicleRow, value: string) => {
    setVehicles(prev =>
      prev.map(v => (v._key === key ? { ...v, [field]: value } : v)),
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
    setSaving(true);
    try {
      const payload: any = {
        fio: fio.trim(),
        phone: phone || null,
        email: email || null,
        inn: inn || null,
        firm: firm || null,
        discount: parseFloat(discount) || 0,
        is_bad: isBad,
        is_archived: isArchived,
        info: info || null,
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
      <div className="modal-panel">
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
                <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isBad} onChange={e => setIsBad(e.target.checked)} />
                    <span style={{ textTransform: 'none', fontSize: 'var(--font-size-sm)' }}>{t('bad_client')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isArchived} onChange={e => setIsArchived(e.target.checked)} />
                    <span style={{ textTransform: 'none', fontSize: 'var(--font-size-sm)' }}>{t('archived')}</span>
                  </label>
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
                        <th>{t('brand')}</th>
                        <th>{t('model')}</th>
                        <th>VIN</th>
                        <th>{t('license_plate')}</th>
                        <th style={{ width: 70 }}>{t('engine_volume')}</th>
                        <th style={{ width: 60 }}>{t('year')}</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles.map(v => (
                        <tr key={v._key}>
                          <td><input value={v.brand} onChange={e => updateVehicle(v._key, 'brand', e.target.value)} placeholder="Toyota" /></td>
                          <td><input value={v.model} onChange={e => updateVehicle(v._key, 'model', e.target.value)} placeholder="Camry" /></td>
                          <td><input value={v.vin} onChange={e => updateVehicle(v._key, 'vin', e.target.value)} placeholder="VIN" /></td>
                          <td><input value={v.license_plate} onChange={e => updateVehicle(v._key, 'license_plate', e.target.value)} placeholder="AA1234BB" /></td>
                          <td><input value={v.engine_volume} onChange={e => updateVehicle(v._key, 'engine_volume', e.target.value)} placeholder="2.0" /></td>
                          <td><input value={v.year} onChange={e => updateVehicle(v._key, 'year', e.target.value)} placeholder="2020" /></td>
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
                <div className="form-group form-grid--full">
                  <label>{t('note')}</label>
                  <textarea className="form-textarea" value={info} onChange={e => setInfo(e.target.value)} />
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
            disabled={saving || !fio.trim()}
          >
            {saving ? t('saving') : isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </>
  );
}
