export interface ProductListItem {
  id: number;
  code: string;
  name: string;
  group_name: string | null;
  manufacturer_name: string | null;
  stock: number;
  price: string;
}

export interface ProductGroup {
  id: number;
  name: string;
}

export interface ManufacturerItem {
  id: number;
  name: string;
}
