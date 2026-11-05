export type Category = "playstation-games" | "pc-games" | "playstation-plus";
export type Platform = "PS5" | "PS4" | "PC";
/** Consoles we currently sell for. */
export type Console = "PS5" | "PS4";
/** Rent is a Secondary slot for RENT_DAYS days, starting when the order is delivered. */
export type Slot = "Primary" | "Secondary" | "Rent";

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: Category;
  platforms: Platform[];
  /** Primary slot price. */
  price: number;
  /** Secondary slot price; null when Secondary isn't offered. */
  secondary_price: number | null;
  /** 30-day rent price (Secondary slot); null when rent isn't offered. */
  rent_price: number | null;
  compare_at_price: number | null;
  cover_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
};

export type OrderStatus =
  | "awaiting_payment"
  | "payment_submitted"
  | "processing"
  | "delivered"
  | "rejected"
  | "cancelled";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  platform: Platform;
  slot: Slot;
  unit_price: number;
  quantity: number;
  /** Rent only: when the 30 days end (set on delivery) and when the "rent is over" email went out. */
  rent_ends_at: string | null;
  rent_notified_at: string | null;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  email: string;
  whatsapp: string;
  psn_id: string | null;
  console: Platform | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  utr: string | null;
  payment_screenshot_path: string | null;
  receipt_path: string | null;
  admin_note: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  notified_at: string | null;
  created_at: string;
  payment_submitted_at: string | null;
  verified_at: string | null;
  delivered_at: string | null;
  order_items?: OrderItem[];
};

export type CartItem = {
  productId: string;
  slug: string;
  title: string;
  platform: Console;
  slot: Slot;
  price: number;
  coverUrl: string | null;
  quantity: number;
};
