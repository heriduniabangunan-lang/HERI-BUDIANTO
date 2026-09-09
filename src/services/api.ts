import { Product, Transaction, Category, StoreSettings, DailyReport, SyncStatus } from "../types";

const LOCAL_PRODUCTS_KEY = "ktm_products_cache";
const LOCAL_TRANSACTIONS_KEY = "ktm_transactions_cache";
const LOCAL_PENDING_TX_KEY = "ktm_pending_tx_queue";
const LOCAL_SETTINGS_KEY = "ktm_settings_cache";
const LOCAL_CATEGORIES_KEY = "ktm_categories_cache";

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "KEDAI TERAS MAMIH",
  tagline: "Jajanan Halal & Murah",
  address: "Jl. Teras Rindang No. 08, Depan Masjid Jami'",
  phone: "0812-3456-7890",
  footerMessage: "Terima kasih atas kunjungannya!\nHalal, Enak & Berkah 😇",
  paperSize: "58mm",
  taxRate: 0,
  cashierName: "Kasir Mamih",
  allowNegativeStock: false,
  autoPrintReceipt: false,
  soundEnabled: true,
};

class ApiService {
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private currentStatus: SyncStatus = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingTransactionsCount: 0,
    error: null,
  };
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initListeners();
      this.loadPendingCount();
      // Auto sync every 30 seconds if online
      this.autoSyncInterval = setInterval(() => {
        if (this.currentStatus.isOnline && !this.currentStatus.isSyncing) {
          this.syncWithCloud();
        }
      }, 30000);
    }
  }

  private initListeners() {
    window.addEventListener("online", () => {
      this.updateStatus({ isOnline: true, error: null });
      this.syncWithCloud();
    });

    window.addEventListener("offline", () => {
      this.updateStatus({ isOnline: false, error: "Mode Offline Aktif. Transaksi disimpan lokal." });
    });
  }

  private loadPendingCount() {
    try {
      const queue = JSON.parse(localStorage.getItem(LOCAL_PENDING_TX_KEY) || "[]");
      this.updateStatus({ pendingTransactionsCount: queue.length });
    } catch {
      // ignore
    }
  }

  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private updateStatus(patch: Partial<SyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...patch };
    for (const listener of this.syncListeners) {
      listener(this.currentStatus);
    }
  }

  // --- Local Cache Helpers ---
  public getLocalProducts(): Product[] {
    try {
      const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveLocalProducts(products: Product[]) {
    try {
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }

  public getLocalTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveLocalTransactions(txs: Transaction[]) {
    try {
      localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(txs));
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }

  public getLocalSettings(): StoreSettings {
    try {
      const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public saveLocalSettings(settings: StoreSettings) {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Storage quota exceeded", e);
    }
  }

  public getPendingTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(LOCAL_PENDING_TX_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public queuePendingTransaction(tx: Transaction) {
    const queue = this.getPendingTransactions();
    queue.push(tx);
    localStorage.setItem(LOCAL_PENDING_TX_KEY, JSON.stringify(queue));
    this.updateStatus({ pendingTransactionsCount: queue.length });
  }

  public clearPendingTransactions() {
    localStorage.setItem(LOCAL_PENDING_TX_KEY, "[]");
    this.updateStatus({ pendingTransactionsCount: 0 });
  }

  // --- Remote API with Local Fallback ---

  public async fetchProducts(): Promise<Product[]> {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const data: Product[] = await res.json();
      this.saveLocalProducts(data);
      this.updateStatus({ isOnline: true, error: null });
      return data;
    } catch (err) {
      this.updateStatus({ isOnline: false, error: "Gagal terhubung ke Cloud. Memakai data lokal." });
      return this.getLocalProducts();
    }
  }

  public async saveProduct(product: Partial<Product> & { id?: string }): Promise<Product> {
    const isNew = !product.id;
    const url = isNew ? "/api/products" : `/api/products/${product.id}`;
    const method = isNew ? "POST" : "PUT";

    // Optimistically update locally
    const currentProducts = this.getLocalProducts();
    let savedProduct: Product;

    if (isNew) {
      savedProduct = {
        id: `prod-${Date.now()}`,
        name: product.name || "Menu Baru",
        category: product.category || "makanan",
        costPrice: Number(product.costPrice) || 0,
        sellingPrice: Number(product.sellingPrice) || 0,
        stock: Number(product.stock) || 0,
        minStock: Number(product.minStock) || 5,
        barcode: product.barcode || `${Date.now()}`,
        imageUrl: product.imageUrl || "/logo.jpg",
        unit: product.unit || "pcs",
        updatedAt: Date.now(),
      };
      currentProducts.push(savedProduct);
    } else {
      const idx = currentProducts.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        savedProduct = {
          ...currentProducts[idx],
          ...product,
          updatedAt: Date.now(),
        } as Product;
        currentProducts[idx] = savedProduct;
      } else {
        savedProduct = product as Product;
        currentProducts.push(savedProduct);
      }
    }
    this.saveLocalProducts(currentProducts);

    // If online, sync to server
    if (this.currentStatus.isOnline) {
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });
        if (res.ok) {
          const cloudProduct: Product = await res.json();
          // Update local cache with server data
          const idx = currentProducts.findIndex((p) => p.id === cloudProduct.id);
          if (idx >= 0) currentProducts[idx] = cloudProduct;
          this.saveLocalProducts(currentProducts);
          return cloudProduct;
        }
      } catch {
        // Fallback: remains in local cache and will sync next time
      }
    }

    return savedProduct;
  }

  public async deleteProduct(productId: string): Promise<boolean> {
    const currentProducts = this.getLocalProducts().filter((p) => p.id !== productId);
    this.saveLocalProducts(currentProducts);

    if (this.currentStatus.isOnline) {
      try {
        const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return true;
      }
    }
    return true;
  }

  public async restockProduct(productId: string, addedQty: number, reason?: string): Promise<Product | null> {
    const products = this.getLocalProducts();
    const prod = products.find((p) => p.id === productId);
    if (!prod) return null;

    prod.stock = Math.max(0, prod.stock + addedQty);
    prod.updatedAt = Date.now();
    this.saveLocalProducts(products);

    if (this.currentStatus.isOnline) {
      try {
        const res = await fetch("/api/products/restock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, addedQty, reason }),
        });
        if (res.ok) {
          const data = await res.json();
          return data.product;
        }
      } catch {
        // Handled locally
      }
    }
    return prod;
  }

  public async createTransaction(tx: Transaction): Promise<{ transaction: Transaction; lowStockAlerts: Product[] }> {
    // 1. Immediately deduct local stock
    const products = this.getLocalProducts();
    const lowStockAlerts: Product[] = [];

    for (const item of tx.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        p.stock = Math.max(0, p.stock - item.quantity);
        p.updatedAt = Date.now();
        if (p.stock <= p.minStock) {
          lowStockAlerts.push(p);
        }
      }
    }
    this.saveLocalProducts(products);

    // 2. Save transaction to local list
    const txs = this.getLocalTransactions();
    txs.unshift(tx);
    this.saveLocalTransactions(txs);

    // 3. Try sending to Cloud API
    if (this.currentStatus.isOnline) {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tx),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.products) {
            this.saveLocalProducts(data.products);
          }
          this.updateStatus({ lastSyncedAt: Date.now() });
          return { transaction: data.transaction, lowStockAlerts };
        }
      } catch {
        // Fallthrough to offline queue
      }
    }

    // Queue for sync if offline or request failed
    this.queuePendingTransaction(tx);
    return { transaction: tx, lowStockAlerts };
  }

  public async fetchTransactions(): Promise<Transaction[]> {
    if (this.currentStatus.isOnline) {
      try {
        const res = await fetch("/api/transactions");
        if (res.ok) {
          const data: Transaction[] = await res.json();
          this.saveLocalTransactions(data);
          return data;
        }
      } catch {
        // Fallback to local
      }
    }
    return this.getLocalTransactions();
  }

  public async fetchDailyReport(targetDate?: string): Promise<DailyReport> {
    const query = targetDate ? `?date=${targetDate}` : "";
    if (this.currentStatus.isOnline) {
      try {
        const res = await fetch(`/api/stats/daily${query}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback to local calculation
      }
    }

    // Compute locally from cached transactions
    const targetDateStr = targetDate || new Date().toISOString().split("T")[0];
    const txs = this.getLocalTransactions().filter((t) => t.date.split("T")[0] === targetDateStr);
    const products = this.getLocalProducts();

    const totalRevenue = txs.reduce((sum, t) => sum + (t.total || 0), 0);
    const totalCost = txs.reduce((sum, t) => sum + (t.costTotal || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const totalTransactions = txs.length;

    const hourlySales: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) hourlySales[h] = 0;
    const paymentBreakdown: Record<string, number> = { cash: 0, qris: 0, transfer: 0, debt: 0 };
    const itemSales: Record<string, { name: string; qty: number; totalSales: number }> = {};

    for (const tx of txs) {
      const h = new Date(tx.timestamp).getHours();
      hourlySales[h] = (hourlySales[h] || 0) + tx.total;
      paymentBreakdown[tx.paymentMethod] = (paymentBreakdown[tx.paymentMethod] || 0) + tx.total;

      for (const itm of tx.items) {
        if (!itemSales[itm.productId]) {
          itemSales[itm.productId] = { name: itm.name, qty: 0, totalSales: 0 };
        }
        itemSales[itm.productId].qty += itm.quantity;
        itemSales[itm.productId].totalSales += itm.subtotal;
      }
    }

    const topSelling = Object.entries(itemSales)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

    return {
      date: targetDateStr,
      totalRevenue,
      totalCost,
      totalProfit,
      totalTransactions,
      averageOrderValue: totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0,
      hourlySales,
      paymentBreakdown,
      topSelling,
      lowStockProducts,
    };
  }

  // Bidirectional Cloud Synchronization
  public async syncWithCloud(): Promise<boolean> {
    if (this.currentStatus.isSyncing) return false;

    this.updateStatus({ isSyncing: true, error: null });

    try {
      const pendingTxs = this.getPendingTransactions();
      const localProducts = this.getLocalProducts();

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingTransactions: pendingTxs,
          modifiedProducts: localProducts,
          clientTimestamp: Date.now(),
        }),
      });

      if (!res.ok) throw new Error("Sync failed with status " + res.status);

      const result = await res.json();
      if (result.success) {
        this.clearPendingTransactions();
        if (result.products) this.saveLocalProducts(result.products);
        if (result.transactions) this.saveLocalTransactions(result.transactions);
        if (result.settings) this.saveLocalSettings(result.settings);

        this.updateStatus({
          isOnline: true,
          isSyncing: false,
          lastSyncedAt: result.lastSyncedAt || Date.now(),
          pendingTransactionsCount: 0,
          error: null,
        });
        return true;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Sinkronisasi gagal";
      this.updateStatus({
        isSyncing: false,
        error: `Cloud Sync tertunda: ${msg}. Transaksi tetap aman di perangkat.`,
      });
      return false;
    }

    this.updateStatus({ isSyncing: false });
    return false;
  }
}

export const apiService = new ApiService();
