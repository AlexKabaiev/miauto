/* ── API client — thin fetch wrappers ── */

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ── Orders ── */
export const ordersApi = {
  list: (params?: Record<string, string>) =>
    request<{ items: any[]; total: number }>(`/orders?${new URLSearchParams(params)}`),
  get: (id: number) => request<any>(`/orders/${id}`),
  create: (data: any) => request<any>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    request<any>(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/orders/${id}`, { method: 'DELETE' }),
  addPosition: (orderId: number, data: any) =>
    request<any>(`/orders/${orderId}/positions`, { method: 'POST', body: JSON.stringify(data) }),
  addPayment: (orderId: number, data: any) =>
    request<any>(`/orders/${orderId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
};

/* ── Clients ── */
export const clientsApi = {
  list: (params?: Record<string, string>) =>
    request<{ items: any[]; total: number }>(`/clients?${new URLSearchParams(params)}`),
  get: (id: number) => request<any>(`/clients/${id}`),
  create: (data: any) => request<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    request<any>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

/* ── Currency ── */
export const currencyApi = {
  getRates: () => request<{ rates: any[] }>('/currency/rates'),
};

/* ── Dashboard ── */
export const dashboardApi = {
  getStats: () => request<any>('/dashboard/stats'),
};

/* ── Products ── */
export const productsApi = {
  list: (params?: Record<string, string>) =>
    request<{ items: any[]; total: number }>(`/products?${new URLSearchParams(params)}`),
  get: (id: number) => request<any>(`/products/${id}`),
  groups: () => request<any[]>('/products/groups'),
  manufacturers: () => request<any[]>('/products/manufacturers'),
};

/* ── Suppliers ── */
export const suppliersApi = {
  list: (params?: Record<string, string>) =>
    request<{ items: any[]; total: number }>(`/suppliers?${new URLSearchParams(params)}`),
  get: (id: number) => request<any>(`/suppliers/${id}`),
  create: (data: any) => request<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    request<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/suppliers/${id}`, { method: 'DELETE' }),
};
