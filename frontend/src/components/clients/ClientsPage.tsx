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
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fio', desc: false }]);
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
  }, [page, search, sorting]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
      columnHelper.accessor('is_bad', {
        id: 'status',
        header: () => t('status'),
        cell: info => {
          const c = info.row.original;
          if (c.is_bad) return <span className="badge badge--danger">⛔</span>;
          if (c.is_archived) return <span className="badge badge--inactive">{t('archived')}</span>;
          return <span className="badge badge--active">{t('active_status')}</span>;
        },
        size: 120,
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
            placeholder={t('search') || 'Пошук...'}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="text-muted">{total.toLocaleString()} {t('clients').toLowerCase()}</span>
          <button className="btn btn--primary" onClick={() => { setEditId(null); setFormOpen(true); }}>+ {t('new_client')}</button>
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
        />
      )}
    </div>
  );
}
