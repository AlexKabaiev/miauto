import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '../../api';

interface SupplierFormProps {
  supplierId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SupplierForm({ supplierId, onClose, onSaved }: SupplierFormProps) {
  const { t } = useTranslation();
  const isEdit = supplierId !== null;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [info, setInfo] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    suppliersApi.get(supplierId!).then((s: any) => {
      setName(s.name || '');
      setAddress(s.address || '');
      setPhone(s.phone || '');
      setContact(s.contact || '');
      setEmail(s.email || '');
      setDeliveryDays(s.delivery_days != null ? String(s.delivery_days) : '');
      setInfo(s.info || '');
    }).finally(() => setLoading(false));
  }, [supplierId, isEdit]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        address: address || null,
        phone: phone || null,
        contact: contact || null,
        email: email || null,
        delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
        info: info || null,
      };
      if (isEdit) {
        await suppliersApi.update(supplierId!, payload);
      } else {
        await suppliersApi.create(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e.message || t('save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (!confirm(t('confirm_delete_supplier'))) return;
    setSaving(true);
    try {
      await suppliersApi.delete(supplierId!);
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
            {isEdit ? `${t('edit_supplier')} #${supplierId}` : t('new_supplier')}
          </span>
          <button className="modal-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-panel__body">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> {t('loading')}</div>
          ) : (
            <>
              <div className="form-grid">
                <div className="form-group form-grid--full">
                  <label>{t('supplier_name')}</label>
                  <input
                    className="form-input"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('supplier_name_placeholder')}
                  />
                </div>
                <div className="form-group">
                  <label>{t('phone')}</label>
                  <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." />
                </div>
                <div className="form-group">
                  <label>{t('email')}</label>
                  <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group form-grid--full">
                  <label>{t('address')}</label>
                  <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('contact_person')}</label>
                  <input className="form-input" value={contact} onChange={e => setContact(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{t('delivery_days')}</label>
                  <input className="form-input" type="number" min="0" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} />
                </div>
              </div>

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
          {isEdit && (
            <button
              className="btn btn--danger"
              onClick={handleDelete}
              disabled={saving}
              style={{ marginRight: 'auto' }}
            >
              {t('delete')}
            </button>
          )}
          <button className="btn btn--ghost" onClick={onClose}>{t('cancel')}</button>
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? t('saving') : isEdit ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </>
  );
}
