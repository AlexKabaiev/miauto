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
import { suppliersApi } from '../../api';
import SupplierForm from './SupplierForm';
import type { Supplier } from '../../types';

const PAGE_SIZE = 30;

const columnHelper = createColumnHelper<Supplier>();

export default function SuppliersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchSuppliers = useCallback(async () => {
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
      const res = await suppliersApi.list(params);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to fetch suppliers:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, sorting]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: () => t('no'),
        cell: info => <span className="fw-600">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor('name', {
        header: () => t('supplier_name'),
        cell: info => <span className="fw-600">{info.getValue()}</span>,
        size: 220,
      }),
      columnHelper.accessor('phone', {
        header: () => t('phone'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 140,
      }),
      columnHelper.accessor('contact', {
        header: () => t('contact_person'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 180,
      }),
      columnHelper.accessor('email', {
        header: () => t('email'),
        cell: info => {
          const v = info.getValue();
          return v ? (
            <a href={`mailto:${v}`} className="text-accent" onClick={e => e.stopPropagation()}>
              {v}
            </a>
          ) : (
            <span className="text-muted">—</span>
          );
        },
        size: 200,
      }),
      columnHelper.accessor('address', {
        header: () => t('address'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 250,
      }),
      columnHelper.accessor('delivery_days', {
        header: () => t('delivery_days'),
        cell: info => {
          const v = info.getValue();
          return v != null ? (
            <span>{v} {t('days_short')}</span>
          ) : (
            <span className="text-muted">—</span>
          );
        },
        meta: { className: 'num' },
        size: 100,
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
      {/* Stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="stat-card fade-in">
          <div className="stat-card__label">{t('total_suppliers')}</div>
          <div className="stat-card__value">{total.toLocaleString()}</div>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="table-toolbar__left">
          <input
            className="search-input"
            placeholder={t('search_suppliers')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="text-muted">{total.toLocaleString()} {t('suppliers').toLowerCase()}</span>
          <button className="btn btn--primary" onClick={() => { setEditId(null); setFormOpen(true); }}>
            + {t('new_supplier')}
          </button>
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
        <SupplierForm
          supplierId={editId}
          onClose={() => setFormOpen(false)}
          onSaved={() => fetchSuppliers()}
        />
      )}
    </div>
  );
}
