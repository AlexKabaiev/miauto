import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../../api';
import ClientForm from './ClientForm';
import type { ClientListItem } from '../../types';

const PAGE_SIZE = 30;

export default function ClientsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ClientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      const res = await clientsApi.list(params);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="fade-in">
      <div className="table-toolbar">
        <div className="table-toolbar__left">
          <input
            className="search-input"
            placeholder={t('search') || 'Пошук...'}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="text-muted">{total.toLocaleString()} {t('clients').toLowerCase()}</span>
          <button className="btn btn--primary" onClick={() => { setEditId(null); setFormOpen(true); }}>+ Новий клієнт</button>
        </div>
      </div>

      <div className="data-table-wrapper">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            {t('loading')}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>{t('client')}</th>
                  <th>{t('phone')}</th>
                  <th>Фірма</th>
                  <th className="num">Знижка %</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(c => (
                  <tr key={c.id} onClick={() => { setEditId(c.id); setFormOpen(true); }}>
                    <td className="fw-600">{c.id}</td>
                    <td>{c.fio}</td>
                    <td className="text-muted">{c.phone || '—'}</td>
                    <td className="text-muted">{c.firm || '—'}</td>
                    <td className="num">{c.discount > 0 ? `${c.discount}%` : '—'}</td>
                    <td>
                      {c.is_bad ? (
                        <span className="badge badge--danger">⛔</span>
                      ) : c.is_archived ? (
                        <span className="badge badge--inactive">Архів</span>
                      ) : (
                        <span className="badge badge--active">Активний</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span>
                {t('showing')} {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} {t('of')} {total}
              </span>
              <div className="pagination__buttons">
                <button className="btn btn--ghost btn--sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  {t('prev')}
                </button>
                <button className="btn btn--ghost btn--sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  {t('next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {formOpen && (
        <ClientForm
          clientId={editId}
          onClose={() => setFormOpen(false)}
          onSaved={() => fetchClients()}
        />
      )}
    </div>
  );
}
