import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { clientsApi } from '../../api';
import ClientForm from './ClientForm';
import OrderForm from '../orders/OrderForm';
import type { ClientListItem } from '../../types';

const PAGE_SIZE = 30;

const columnHelper = createColumnHelper<ClientListItem>();

export default function ClientsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ClientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [clientIdSearch, setClientIdSearch] = useState('');
  const [clientIdSearchInput, setClientIdSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fio', desc: false }]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [orderClientId, setOrderClientId] = useState<number | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      if (clientIdSearch) params.client_id = clientIdSearch;
      if (statusFilter) params.status_filter = statusFilter;
      if (flagFilter) params.flag_filter = flagFilter;
      if (sorting.length > 0) {
        params.sort_by = sorting[0].id;
        params.sort_dir = sorting[0].desc ? 'desc' : 'asc';
      }
      const res = await clientsApi.list(params);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to fetch clients:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, clientIdSearch, statusFilter, flagFilter, sorting]);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPage(0);
  };

  const handleFlagFilterChange = (val: string) => {
    setFlagFilter(val === flagFilter ? '' : val);
    setPage(0);
  };


  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setClientIdSearch(clientIdSearchInput); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, clientIdSearchInput]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: () => 'ID',
        cell: info => <span className="fw-600">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('fio', {
        header: () => t('client'),
        cell: info => info.getValue(),
        size: 250,
      }),
      columnHelper.accessor('phone', {
        header: () => t('phone'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 150,
      }),
      columnHelper.accessor('firm', {
        header: () => t('firm'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 200,
      }),
      columnHelper.accessor('discount', {
        header: () => t('discount'),
        cell: info => {
          const v = info.getValue();
          return v > 0 ? `${v}%` : '—';
        },
        meta: { className: 'num' },
        size: 100,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: () => t('status'),
        cell: info => {
          const c = info.row.original;
          const status = c.status || 'Активний';
          const flagsStr = c.flags || '';
          
          return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {status === 'Новий' && <span className="badge badge--status-new">{t('client_status_new')}</span>}
              {status === 'Активний' && <span className="badge badge--active">{t('client_status_active')}</span>}
              {status === 'На паузі' && <span className="badge badge--status-processing">{t('client_status_pause')}</span>}
              {status === 'Проблемний' && <span className="badge badge--danger" title={c.problem_reason ? `${c.problem_reason}: ${c.problem_comment || ''}` : undefined}>⚠️ {t('client_status_problematic')}</span>}
              {status === 'Архівний' && <span className="badge badge--inactive">{t('client_status_archived')}</span>}
              
              {flagsStr && (
                <div style={{ display: 'inline-flex', gap: '3px', marginLeft: '6px', flexWrap: 'wrap' }}>
                  {flagsStr.split(',').map(f => f.trim()).filter(Boolean).map(flag => {
                    if (flag === 'VIP') {
                      return <span key={flag} className="badge badge--active" style={{ fontSize: '9px', padding: '1px 4px', textTransform: 'none' }} title="VIP">★ VIP</span>;
                    }
                    if (flag === 'Є борг') {
                      return <span key={flag} className="badge badge--danger" style={{ fontSize: '9px', padding: '1px 4px', textTransform: 'none' }} title={t('flag_debt')}>⚠️ {t('flag_debt')}</span>;
                    }
                    if (flag === 'Потребує передоплату') {
                      return <span key={flag} className="badge badge--status-new" style={{ fontSize: '9px', padding: '1px 4px', textTransform: 'none' }} title={t('flag_prepayment')}>⇅ {t('flag_prepayment')}</span>;
                    }
                    if (flag === 'Ризиковий') {
                      return <span key={flag} className="badge badge--danger" style={{ fontSize: '9px', padding: '1px 4px', textTransform: 'none' }} title={t('flag_risky')}>⚡ {t('flag_risky')}</span>;
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          );
        },
        size: 200,
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="fade-in">
      <div className="table-toolbar">
        <div className="table-toolbar__left">
          <input
            className="search-input"
            style={{ width: '130px' }}
            placeholder={t('search_client_id')}
            value={clientIdSearchInput}
            onChange={e => setClientIdSearchInput(e.target.value)}
          />
          <input
            className="search-input"
            placeholder={t('search')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          
          <select 
            className="form-input search-input" 
            style={{ width: '160px', height: '38px', padding: '0 12px', borderRadius: 'var(--radius-md)' }}
            value={statusFilter}
            onChange={e => handleStatusFilterChange(e.target.value)}
          >
            <option value="">{t('all')} ({t('status').toLowerCase()})</option>
            <option value="Новий">{t('client_status_new')}</option>
            <option value="Активний">{t('client_status_active')}</option>
            <option value="На паузі">{t('client_status_pause')}</option>
            <option value="Проблемний">{t('client_status_problematic')}</option>
            <option value="Архівний">{t('client_status_archived')}</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="text-muted">{total.toLocaleString()} {t('clients').toLowerCase()}</span>
          <button className="btn btn--primary" onClick={() => { setEditId(null); setFormOpen(true); }}>+ {t('new_client')}</button>
        </div>
      </div>

      <div className="filter-chips" style={{ marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, textTransform: 'uppercase', marginRight: 'var(--space-2)' }}>
          {t('client_flags')}:
        </span>
        <button 
          className={`filter-chip ${flagFilter === 'VIP' ? 'filter-chip--active' : ''}`}
          onClick={() => handleFlagFilterChange('VIP')}
        >
          ★ VIP
        </button>
        <button 
          className={`filter-chip ${flagFilter === 'Є борг' ? 'filter-chip--active' : ''}`}
          onClick={() => handleFlagFilterChange('Є борг')}
        >
          ⚠️ {t('flag_debt')}
        </button>
        <button 
          className={`filter-chip ${flagFilter === 'Потребує передоплату' ? 'filter-chip--active' : ''}`}
          onClick={() => handleFlagFilterChange('Потребує передоплату')}
        >
          ⇅ {t('flag_prepayment')}
        </button>
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
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const meta = header.column.columnDef.meta as any;
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={`${meta?.className || ''} ${sorted ? 'sorted' : ''}`}
                          style={{ width: header.getSize() }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="sort-arrow">
                            {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '⇅'}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} onClick={() => { setEditId(row.original.id); setFormOpen(true); }}>
                    {row.getVisibleCells().map(cell => {
                      const meta = cell.column.columnDef.meta as any;
                      return (
                        <td key={cell.id} className={meta?.className || ''}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
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
          onCreateOrder={(id) => {
            setFormOpen(false);
            setOrderClientId(id);
          }}
        />
      )}

      {orderClientId && (
        <OrderForm
          orderId={null}
          initialClientId={orderClientId}
          onClose={() => setOrderClientId(null)}
          onSaved={() => fetchClients()}
        />
      )}
    </div>
  );
}
