/* ── TypeScript interfaces matching backend schemas ── */

export interface ClientVehicle {
  id: number;
  client_id: number;
  brand: string | null;
  model: string | null;
  vin: string | null;
  license_plate: string | null;
  engine_volume: string | null;
  engine_type: string | null;
  year: string | null;
  info: string | null;
}

export interface ClientStatusHistory {
  id: number;
  client_id: number;
  old_status: string;
  new_status: string;
  comment: string | null;
  author: string | null;
  created_at: string;
}

export interface Client {
  id: number;
  fio: string;
  phone: string | null;
  email: string | null;
  inn: string | null;
  firm: string | null;
  discount: number;
  is_bad: boolean;
  is_archived: boolean;
  info: string | null;
  created_at: string;
  vehicles: ClientVehicle[];
  status?: string;
  flags?: string;
  problem_reason?: string | null;
  problem_comment?: string | null;
  status_updated_at?: string | null;
  status_updated_by?: string | null;
  status_history?: ClientStatusHistory[];
}

export interface ClientListItem {
  id: number;
  fio: string;
  phone: string | null;
  firm: string | null;
  discount: number;
  is_bad: boolean;
  is_archived: boolean;
  status?: string;
  flags?: string;
  problem_reason?: string | null;
  problem_comment?: string | null;
}


export interface OrderPosition {
  id: number;
  order_id: number;
  code: string;
  analogs: string | null;
  name: string;
  supplier_id: number | null;
  quantity: number;
  price_purchase: string;  // Decimal comes as string from API
  price_sell: string;
  manufacturer: string | null;
  condition: string | null;
  arrival_date: string | null;
  sale_date: string | null;
  note: string | null;
  supplier_name: string | null;
}

export interface OrderListItem {
  id: number;
  client_id: number;
  date: string;
  client_name: string;
  client_phone: string | null;
  vehicle_display: string | null;
  positions_count: number;
  total: string;
  paid: string;
  debt: string;
  profit: string;
  group: string;
  is_active: boolean;
}

export interface Order extends OrderListItem {
  client_id: number;
  vehicle_id: number | null;
  currency: string;
  exchange_rate: number;
  markup: number;
  discount: number;
  archive_group: string | null;
  final_date: string | null;
  info: string | null;
  author: string | null;
  positions: OrderPosition[];
}

export interface Supplier {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  contact: string | null;
  email: string | null;
  delivery_days: number | null;
  info: string | null;
}

export interface CurrencyRate {
  currency: string;
  buy: number | null;
  sell: number | null;
  cross: number | null;
  date: number;
}

export interface DashboardStats {
  active_orders: number;
  total_debt: number;
  month_profit: number;
  total_clients: number;
  orders_with_debt: number;
  month_orders: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
