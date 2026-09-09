export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number; // Harga modal
  sellingPrice: number; // Harga jual
  stock: number;
  minStock: number; // Batas minimum stok
  barcode: string;
  imageUrl: string;
  unit: string;
  updatedAt: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = "cash" | "qris" | "transfer" | "debt";

export interface Transaction {
  id: string;
  receiptNumber: string;
  date: string;
  timestamp: number;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  cashPaid: number;
  change: number;
  customerName?: string;
  note?: string;
  cashierName: string;
  synced?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  footerMessage: string;
  paperSize: "58mm" | "80mm";
  taxRate: number;
  cashierName: string;
  allowNegativeStock: boolean;
  autoPrintReceipt: boolean;
  soundEnabled: boolean;
}

export interface DailyReport {
  date: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalTransactions: number;
  averageOrderValue: number;
  hourlySales: Record<number, number>;
  paymentBreakdown: Record<string, number>;
  topSelling: { id: string; name: string; qty: number; totalSales: number }[];
  lowStockProducts: Product[];
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingTransactionsCount: number;
  error: string | null;
}
