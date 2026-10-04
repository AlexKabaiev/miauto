export interface ProductListItem {
  id: number;
  code: string;
  name: string;
  group_name: string | null;
  manufacturer_name: string | null;
  stock: number;
  price: string;
  analogs: string | null;
}

export interface ProductGroup {
  id: number;
  name: string;
}

export interface ManufacturerItem {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  group_id: number | null;
  manufacturer_id: number | null;
  stock: number;
  price: string | number;
  supplier_id: number | null;
  location: string | null;
  analogs: string | null;
  info: string | null;
  group_name: string | null;
  manufacturer_name: string | null;
  supplier_name: string | null;
}

export interface ProductCreate {
  code: string;
  name: string;
  group_id: number | null;
  manufacturer_id: number | null;
  stock: number;
  price: string | number;
  supplier_id: number | null;
  location: string | null;
  analogs: string | null;
  info: string | null;
}
