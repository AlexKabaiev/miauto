import { useCallback, useEffect, useState, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { productsApi } from "../../api";
import type { ProductListItem, ProductGroup } from "../../types/products";

const PAGE_SIZE = 50;

const columnHelper = createColumnHelper<ProductListItem>();

const fmtMoney = (v: string | number) => {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return n.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function ProductsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  // Groups list for filtering
  const [groups, setGroups] = useState<ProductGroup[]>([]);

  useEffect(() => {
    productsApi
      .groups()
      .then(setGroups)
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      };
      if (search) params.search = search;
      if (groupFilter) params.group_id = groupFilter;
      if (stockFilter === "in_stock") params.in_stock = "true";
      if (sorting.length > 0) {
        params.sort_by = sorting[0].id;
        params.sort_dir = sorting[0].desc ? "desc" : "asc";
      }
      const res = await productsApi.list(params);
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error("Failed to fetch products:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, groupFilter, stockFilter, sorting]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
      columnHelper.accessor("id", {
        header: () => t("no"),
        cell: (info) => <span className="fw-600">{info.getValue()}</span>,
        size: 60,
      }),
      columnHelper.accessor("code", {
        header: () => t("product_code"),
        cell: (info) => <span className="fw-600">{info.getValue()}</span>,
        size: 140,
      }),
      columnHelper.accessor("name", {
        header: () => t("product_name"),
        cell: (info) => info.getValue(),
        size: 280,
      }),
      columnHelper.accessor("group_name", {
        header: () => t("product_group"),
        cell: (info) => (
          <span className="text-muted">{info.getValue() || "—"}</span>
        ),
        size: 180,
      }),
      columnHelper.accessor("manufacturer_name", {
        header: () => t("manufacturer"),
        cell: (info) => (
          <span className="text-muted">{info.getValue() || "—"}</span>
        ),
        size: 150,
      }),
      columnHelper.accessor("stock", {
        header: () => t("stock"),
        cell: (info) => {
          const v = info.getValue();
          return (
            <span className={v > 0 ? "text-success fw-600" : "text-muted"}>
              {v}
            </span>
          );
        },
        meta: { className: "num" },
        size: 80,
      }),
      columnHelper.accessor("price", {
        header: () => t("price"),
        cell: (info) => (
          <span className="fw-600">{fmtMoney(info.getValue())} ₴</span>
        ),
        meta: { className: "num" },
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
      {/* Stats row for products */}
      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        <div className="stat-card fade-in">
          <div className="stat-card__label">{t("total_products")}</div>
          <div className="stat-card__value">{total.toLocaleString()}</div>
        </div>
        <div className="stat-card fade-in" style={{ animationDelay: "60ms" }}>
          <div className="stat-card__label">{t("product_groups")}</div>
          <div className="stat-card__value stat-card__value--accent">
            {groups.length.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="table-toolbar__left">
          <input
            className="search-input"
            placeholder={t("search_products")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="form-select"
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(0);
            }}
            style={{ width: 200, fontSize: "var(--font-size-sm)" }}
          >
            <option value="">{t("all_groups")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <div className="filter-chips">
            {(["all", "in_stock"] as const).map((f) => (
              <button
                key={f}
                className={`filter-chip ${stockFilter === f ? "filter-chip--active" : ""}`}
                onClick={() => {
                  setStockFilter(f);
                  setPage(0);
                }}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>
        <span className="text-muted">
          {total.toLocaleString()} {t("products").toLowerCase()}
        </span>
      </div>

      <div className="data-table-wrapper">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            {t("loading")}
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta as any;
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          className={`${meta?.className || ""} ${sorted ? "sorted" : ""}`}
                          style={{ width: header.getSize() }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <span className="sort-arrow">
                            {sorted === "asc"
                              ? "▲"
                              : sorted === "desc"
                                ? "▼"
                                : "⇅"}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as any;
                      return (
                        <td key={cell.id} className={meta?.className || ""}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span>
                {t("showing")} {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, total)} {t("of")} {total}
              </span>
              <div className="pagination__buttons">
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("prev")}
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("next")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
