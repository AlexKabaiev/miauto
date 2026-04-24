import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { productsApi, suppliersApi } from '../../api';
import type { ProductGroup, ManufacturerItem } from '../../types/products';
import type { PaginatedResponse, Supplier } from '../../types';

interface ProductFormProps {
  productId: number | null;
  groups: ProductGroup[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductForm({ productId, groups, onClose, onSaved }: ProductFormProps) {
  const { t } = useTranslation();
  const isEdit = productId !== null;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [manufacturerId, setManufacturerId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [stock, setStock] = useState('0');
  const [price, setPrice] = useState('0');
  const [location, setLocation] = useState('');
  const [info, setInfo] = useState('');

  const [manufacturers, setManufacturers] = useState<ManufacturerItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load catalogs
  useEffect(() => {
    productsApi.manufacturers().then(setManufacturers).catch(() => {});
    suppliersApi.list({ limit: '1000' }).then((res: PaginatedResponse<Supplier>) => setSuppliers(res.items)).catch(() => {});
  }, []);

  // Load existing product data
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    productsApi.get(productId!).then((p: any) => {
      setCode(p.code || '');
      setName(p.name || '');
      setGroupId(p.group_id ? String(p.group_id) : '');
      setManufacturerId(p.manufacturer_id ? String(p.manufacturer_id) : '');
      setSupplierId(p.supplier_id ? String(p.supplier_id) : '');
      setStock(String(p.stock || 0));
      setPrice(String(p.price || 0));
      setLocation(p.location || '');
      setInfo(p.info || '');
    }).finally(() => setLoading(false));
  }, [productId, isEdit]);

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        code: code.trim(),
        name: name.trim(),
        group_id: groupId ? parseInt(groupId) : null,
        manufacturer_id: manufacturerId ? parseInt(manufacturerId) : null,
        supplier_id: supplierId ? parseInt(supplierId) : null,
        stock: parseInt(stock) || 0,
        price: parseFloat(price) || 0,
        location: location || null,
        info: info || null,
      };
      
      if (isEdit) {
        await productsApi.update(productId!, payload);
      } else {
        await productsApi.create(payload);
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
    if (!confirm(t('confirm_delete') || 'Are you sure?')) return;
    
    setSaving(true);
    try {
      await productsApi.delete(productId!);
      onSaved();
      onClose();
    } catch (e: any) {
      alert(e.message || t('save_error'));
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-panel">
        <div className="modal-panel__header">
          <span className="modal-panel__title">
            {isEdit ? `${t('edit_product')} #${productId}` : t('new_product')}
          </span>
          <button className="modal-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-panel__body">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /> {t('loading')}</div>
          ) : (
            <div className="form-grid">
              <div className="form-group form-grid--full">
                <label>{t('product_name')}</label>
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('product_code')}</label>
                <input className="form-input" value={code} onChange={e => setCode(e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('product_group')}</label>
                <select className="form-select" value={groupId} onChange={e => setGroupId(e.target.value)}>
                  <option value="">—</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('manufacturer')}</label>
                <select className="form-select" value={manufacturerId} onChange={e => setManufacturerId(e.target.value)}>
                  <option value="">—</option>
                  {manufacturers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('supplier')}</label>
                <select className="form-select" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                  <option value="">—</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('stock')}</label>
                <input className="form-input" type="number" value={stock} onChange={e => setStock(e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t('price')} ({t('uah')})</label>
                <input className="form-input" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
              <div className="form-group form-grid--full">
                <label>{t('location')}</label>
                <input className="form-input" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="form-group form-grid--full">
                <label>{t('info')}</label>
                <textarea className="form-textarea" value={info} onChange={e => setInfo(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-panel__footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            {isEdit && (
              <button 
                className="btn btn--danger" 
                onClick={handleDelete}
                disabled={saving}
              >
                {t('delete')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn--ghost" onClick={onClose}>{t('cancel')}</button>
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saving || !code.trim() || !name.trim()}
            >
              {saving ? t('saving') : isEdit ? t('update') : t('create')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
