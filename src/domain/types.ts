export type Role = "manager" | "root";
export type OrderStatus =
  "draft" | "approved" | "shipped" | "completed" | "cancelled";
export type OrderFilter = "active" | "waiting" | "ready" | "all";
export type HistoryTab = "journal" | "receipts";
export interface Product {
  id: string;
  sku: string;
  name: string;
  detail: string;
  opening: number;
}
export interface Receipt {
  id: string;
  productId: string;
  amount: number;
  reference: string;
  at: string;
}
export interface Order {
  id: string;
  client: string;
  productId: string;
  amount: number;
  status: OrderStatus;
  paid: boolean;
  authorizedAt: string | null;
  authorizedBy: "root" | null;
  shippedAt?: string;
}
export interface Stock {
  opening: number;
  incoming: number;
  shipped: number;
  current: number;
  reserved: number;
  free: number;
}
export type Totals = Pick<Stock, "current" | "reserved" | "free">;
export interface AuditEvent {
  id: string;
  at: string | null;
  role: Role | "system";
  title: string;
  detail: string;
  productId?: string;
  before?: Stock;
  after?: Stock;
}
export interface WarehouseState {
  version: 1;
  revision: number;
  products: Product[];
  receipts: Receipt[];
  orders: Order[];
  events: AuditEvent[];
}
export type OrderActionType =
  "APPROVE" | "PAYMENT" | "AUTHORIZE" | "SHIP" | "DELIVER" | "CANCEL";
export type Action =
  | { type: "RECEIVE"; productId: string; quantity: string; reference?: string }
  | {
      type: "CREATE_ORDER";
      productId: string;
      quantity: string;
      client: string;
    }
  | { type: OrderActionType; id: string };
export type DialogMode =
  | { kind: "receive" | "order" | "reset" }
  | {
      kind: "confirm";
      action: { type: "AUTHORIZE" | "SHIP" | "CANCEL"; id: string };
    };
