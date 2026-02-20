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
import { ordersApi } from '../../api';
import StatsCards from '../dashboard/StatsCards';
import OrderForm from './OrderForm';
import type { OrderListItem } from '../../types';

const PAGE_SIZE = 30;

const columnHelper = createColumnHelper<OrderListItem>();

const fmtMoney = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (v: string) => {
  try {
    return new Date(v).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return v;
  }
};

export default function OrdersPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      if (statusFilter === 'active') params.is_active = 'true';
      if (sorting.length > 0) {
        params.sort_by = sorting[0].id;
        params.sort_dir = sorting[0].desc ? 'desc' : 'asc';
      }
      const res = await ordersApi.list(params);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sorting]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
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
        size: 70,
      }),
      columnHelper.accessor('date', {
        header: () => t('date'),
        cell: info => fmtDate(info.getValue()),
        size: 100,
      }),
      columnHelper.accessor('client_name', {
        header: () => t('client'),
        cell: info => info.getValue(),
        size: 200,
      }),
      columnHelper.accessor('client_phone', {
        header: () => t('phone'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 130,
      }),
      columnHelper.accessor('vehicle_display', {
        header: () => t('vehicle'),
        cell: info => <span className="text-muted">{info.getValue() || '—'}</span>,
        size: 140,
      }),
      columnHelper.accessor('positions_count', {
        header: () => t('positions'),
        cell: info => info.getValue(),
        meta: { className: 'num' },
        size: 80,
      }),
      columnHelper.accessor('total', {
        header: () => t('total'),
        cell: info => <span className="fw-600">{fmtMoney(info.getValue())}</span>,
        meta: { className: 'num' },
        size: 110,
      }),
      columnHelper.accessor('paid', {
        header: () => t('paid_amount'),
        cell: info => {
          const v = parseFloat(info.getValue());
          return <span className={v > 0 ? 'text-success' : 'text-muted'}>{fmtMoney(info.getValue())}</span>;
        },
        meta: { className: 'num' },
        size: 110,
      }),
      columnHelper.accessor('debt', {
        header: () => t('debt'),
        cell: info => {
          const v = parseFloat(info.getValue());
          return <span className={v > 0 ? 'text-danger fw-600' : 'text-muted'}>{fmtMoney(info.getValue())}</span>;
        },
        meta: { className: 'num' },
        size: 110,
      }),
      columnHelper.accessor('profit', {
        header: () => t('profit'),
        cell: info => {
          const v = parseFloat(info.getValue());
          return <span className={v > 0 ? 'text-accent fw-600' : 'text-muted'}>{fmtMoney(info.getValue())}</span>;
        },
        meta: { className: 'num' },
        size: 100,
      }),
      columnHelper.accessor('group', {
        header: () => t('status'),
        cell: info => {
          const g = info.getValue();
          const row = info.row.original;
          return (
            <span className={`badge ${row.is_active ? 'badge--active' : 'badge--inactive'}`}>
              {g}
            </span>
          );
        },
        size: 110,
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
      <StatsCards />

      <div className="table-toolbar">
        <div className="table-toolbar__left">
          <input
            className="search-input"
            placeholder={t('search_orders')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <div className="filter-chips">
            {['all', 'active'].map(f => (
              <button
                key={f}
                className={`filter-chip ${statusFilter === f ? 'filter-chip--active' : ''}`}
                onClick={() => { setStatusFilter(f); setPage(0); }}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="text-muted">{total.toLocaleString()} {t('orders').toLowerCase()}</span>
          <button className="btn btn--primary" onClick={() => { setEditId(null); setFormOpen(true); }}>+ {t('new_order')}</button>
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
        <OrderForm
          orderId={editId}
          onClose={() => setFormOpen(false)}
          onSaved={() => fetchOrders()}
        />
      )}
    </div>
  );
}
