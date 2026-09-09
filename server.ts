import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "kedai_db.json");

interface Product {
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

interface TransactionItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  receiptNumber: string;
  date: string; // ISO string
  timestamp: number;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: "cash" | "qris" | "transfer" | "debt";
  cashPaid: number;
  change: number;
  customerName?: string;
  note?: string;
  cashierName: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  footerMessage: string;
  paperSize: "58mm" | "80mm";
  taxRate: number; // in percent (0 default for small stall)
}

interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  settings: StoreSettings;
  lastSyncedAt: number;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "KEDAI TERAS MAMIH",
  tagline: "Jajanan Halal & Murah",
  address: "Jl. Gg. Jambu H. Amsar No. 38 Cipondoh-Tangerang'",
  phone: "0895 3960 59134",
  footerMessage: "Terima kasih atas kunjungannya!\nHalal, Enak & Berkah 😇",
  paperSize: "58mm",
  taxRate: 0,
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "all", name: "Semua Menu" },
  { id: "makanan", name: "Jajanan & Gorengan" },
  { id: "minuman", name: "Minuman Segar" },
  { id: "cemilan", name: "Cemilan" },
  { id: "paket", name: "Paket Hemat" },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Mie Ayam Biasa",
    category: "makanan",
    sellingPrice: 13000,
    stock: 25,
    minStock: 5,
    barcode: "8991001001",
    imageUrl: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-2",
    name: "Mie Ayam Baso",
    category: "makanan",
    sellingPrice: 16000,
    stock: 15,
    minStock: 5,
    barcode: "8991001002",
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60",
    unit: "mangkuk",
    updatedAt: Date.now(),
  },
  {
    id: "prod-3",
    name: "Cilok Biasa",
    category: "makanan",
    sellingPrice: 5000,
    stock: 18,
    minStock: 4,
    barcode: "8991001003",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-4",
    name: "Cilok lengkap",
    category: "makanan",
    sellingPrice: 10000,
    stock: 12,
    minStock: 4,
    barcode: "8991001004",
    imageUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-5",
    name: "Fried Chicken",
    category: "cemilan",
    sellingPrice: 8000,
    stock: 20,
    minStock: 5,
    barcode: "8991001005",
    imageUrl: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-6",
    name: "Fried Chicken Nasi",
    category: "cemilan",
    sellingPrice: 13000,
    stock: 14,
    minStock: 4,
    barcode: "8991001006",
    imageUrl: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-7",
    name: "Sosis Bakar",
    category: "cemilan",
    sellingPrice: 6000,
    stock: 16,
    minStock: 5,
    barcode: "8991001007",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60",
    unit: "tusuk",
    updatedAt: Date.now(),
  },
  {
    id: "prod-8",
    name: "French fries",
    category: "cemilan",
    sellingPrice: 5000,
    stock: 3, // Menipis untuk contoh notifikasi
    minStock: 5,
    barcode: "8991001008",
    imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-9",
    name: "Nugged",
    category: "makanan",
    sellingPrice: 5000,
    stock: 0, // Habis untuk contoh notifikasi stok habis
    minStock: 5,
    barcode: "8991001009",
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60",
    unit: "porsi",
    updatedAt: Date.now(),
  },
  {
    id: "prod-10",
    name: "Aneka Minuman Es",
    category: "minuman",
    sellingPrice: 4000,
    stock: 50,
    minStock: 10,
    barcode: "8992001001",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60",
    unit: "cup",
    updatedAt: Date.now(),
  },
  {
    id: "prod-11",
    name: "Es Teh SOLO",
    category: "minuman",
    sellingPrice: 5000,
    stock: 30,
    minStock: 8,
    barcode: "8992001002",
    imageUrl: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60",
    unit: "cup",
    updatedAt: Date.now(),
  },
  {
    id: "prod-12",
    name: "Aneka Es KOPI",
    category: "minuman",
    sellingPrice: 5000,
    stock: 22,
    minStock: 6,
    barcode: "8992001003",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60",
    unit: "cup",
    updatedAt: Date.now(),
  },
  {
    id: "prod-13",
    name: "Paket Hemat: Mie Ayam + Es Teh Solo
    category: "paket",
    sellingPrice: 16000,
    stock: 12,
    minStock: 3,
    barcode: "8993001001",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60",
    unit: "paket",
    updatedAt: Date.now(),
  },
  {
    id: "prod-14",
    name: "Es Kopi Special",
    category: "paket",
    sellingPrice: 8000,
    stock: 15,
    minStock: 4,
    barcode: "8993001002",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60",
    unit: "paket",
    updatedAt: Date.now(),
  }
  {
    id: "prod-15",
    name: "Kerupuk",
    category: "paket",
    sellingPrice: 1000,
    stock: 15,
    minStock: 4,
    barcode: "8993001002",
    imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60",
    unit: "paket",
    updatedAt: Date.now(),
];

function initDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        products: parsed.products || DEFAULT_PRODUCTS,
        categories: parsed.categories || DEFAULT_CATEGORIES,
        transactions: parsed.transactions || [],
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        lastSyncedAt: parsed.lastSyncedAt || Date.now(),
      };
    } catch (e) {
      console.error("Error reading db file, restoring defaults:", e);
    }
  }

  const initialDb: DatabaseSchema = {
    products: DEFAULT_PRODUCTS,
    categories: DEFAULT_CATEGORIES,
    transactions: [],
    settings: DEFAULT_SETTINGS,
    lastSyncedAt: Date.now(),
  };

  saveDb(initialDb);
  return initialDb;
}

function saveDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save db:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  let db = initDb();

  // 1. Health check & Cloud Status
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      cloud: "connected",
      serverTime: Date.now(),
      store: db.settings.storeName,
      totalProducts: db.products.length,
      totalTransactions: db.transactions.length,
    });
  });

  // 2. Products API
  app.get("/api/products", (_req, res) => {
    res.json(db.products);
  });

  app.post("/api/products", (req, res) => {
    const newProduct: Product = {
      id: req.body.id || `prod-${Date.now()}`,
      name: req.body.name || "Produk Baru",
      category: req.body.category || "makanan",
      costPrice: Number(req.body.costPrice) || 0,
      sellingPrice: Number(req.body.sellingPrice) || 0,
      stock: Number(req.body.stock) || 0,
      minStock: Number(req.body.minStock) || 5,
      barcode: req.body.barcode || `${Date.now()}`,
      imageUrl: req.body.imageUrl || "/logo.jpg",
      unit: req.body.unit || "pcs",
      updatedAt: Date.now(),
    };

    db.products.push(newProduct);
    db.lastSyncedAt = Date.now();
    saveDb(db);

    res.status(201).json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }

    db.products[index] = {
      ...db.products[index],
      ...req.body,
      costPrice: req.body.costPrice !== undefined ? Number(req.body.costPrice) : db.products[index].costPrice,
      sellingPrice: req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : db.products[index].sellingPrice,
      stock: req.body.stock !== undefined ? Number(req.body.stock) : db.products[index].stock,
      minStock: req.body.minStock !== undefined ? Number(req.body.minStock) : db.products[index].minStock,
      updatedAt: Date.now(),
    };

    db.lastSyncedAt = Date.now();
    saveDb(db);
    res.json(db.products[index]);
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = db.products.length;
    db.products = db.products.filter((p) => p.id !== id);
    if (db.products.length === initialLen) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }
    db.lastSyncedAt = Date.now();
    saveDb(db);
    res.json({ success: true });
  });

  // Bulk restock / stock adjustment
  app.post("/api/products/restock", (req, res) => {
    const { productId, addedQty, reason } = req.body;
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    }

    const qty = Number(addedQty) || 0;
    product.stock = Math.max(0, product.stock + qty);
    product.updatedAt = Date.now();
    db.lastSyncedAt = Date.now();
    saveDb(db);

    res.json({ success: true, product, reason });
  });

  // 3. Transactions API
  app.get("/api/transactions", (_req, res) => {
    // Sort latest first
    const sorted = [...db.transactions].sort((a, b) => b.timestamp - a.timestamp);
    res.json(sorted);
  });

  app.post("/api/transactions", (req, res) => {
    const payload = req.body;
    const now = Date.now();
    const dateStr = new Date(now).toISOString();

    const receiptNumber = payload.receiptNumber || `KTM-${Date.now().toString().slice(-6)}`;

    // Process stock deductions automatically
    const lowStockAlerts: { id: string; name: string; remaining: number }[] = [];
    if (Array.isArray(payload.items)) {
      for (const item of payload.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - (Number(item.quantity) || 1));
          prod.updatedAt = now;
          if (prod.stock <= prod.minStock) {
            lowStockAlerts.push({
              id: prod.id,
              name: prod.name,
              remaining: prod.stock,
            });
          }
        }
      }
    }

    const newTx: Transaction = {
      id: payload.id || `tx-${now}-${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber,
      date: payload.date || dateStr,
      timestamp: payload.timestamp || now,
      items: payload.items || [],
      subtotal: Number(payload.subtotal) || 0,
      discount: Number(payload.discount) || 0,
      total: Number(payload.total) || 0,
      costTotal: Number(payload.costTotal) || 0,
      profit: (Number(payload.total) || 0) - (Number(payload.costTotal) || 0),
      paymentMethod: payload.paymentMethod || "cash",
      cashPaid: Number(payload.cashPaid) || 0,
      change: Number(payload.change) || 0,
      customerName: payload.customerName || "Pelanggan Teras",
      note: payload.note || "",
      cashierName: payload.cashierName || "Kasir Mamih",
    };

    db.transactions.unshift(newTx);
    db.lastSyncedAt = now;
    saveDb(db);

    res.status(201).json({
      transaction: newTx,
      lowStockAlerts,
      products: db.products, // return updated stock
    });
  });

  // 4. Categories API
  app.get("/api/categories", (_req, res) => {
    res.json(db.categories);
  });

  app.post("/api/categories", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nama kategori dibutuhkan" });
    const id = name.toLowerCase().replace(/\s+/g, "-");
    const existing = db.categories.find((c) => c.id === id);
    if (!existing) {
      db.categories.push({ id, name });
      saveDb(db);
    }
    res.json(db.categories);
  });

  // 5. Settings API
  app.get("/api/settings", (_req, res) => {
    res.json(db.settings);
  });

  app.put("/api/settings", (req, res) => {
    db.settings = { ...db.settings, ...req.body };
    db.lastSyncedAt = Date.now();
    saveDb(db);
    res.json(db.settings);
  });

  // 6. Cloud Sync Endpoint (Bidirectional)
  app.post("/api/sync", (req, res) => {
    const { pendingTransactions = [], modifiedProducts = [], clientTimestamp = 0 } = req.body;

    let stockChanges = false;

    // Process pending offline transactions from client
    if (Array.isArray(pendingTransactions) && pendingTransactions.length > 0) {
      for (const tx of pendingTransactions) {
        const exists = db.transactions.some((t) => t.id === tx.id || t.receiptNumber === tx.receiptNumber);
        if (!exists) {
          db.transactions.unshift(tx);
          // Apply inventory deductions
          for (const itm of tx.items || []) {
            const p = db.products.find((prod) => prod.id === itm.productId);
            if (p) {
              p.stock = Math.max(0, p.stock - (Number(itm.quantity) || 1));
              p.updatedAt = Date.now();
            }
          }
          stockChanges = true;
        }
      }
    }

    // Process client modified products if newer
    if (Array.isArray(modifiedProducts) && modifiedProducts.length > 0) {
      for (const clientProd of modifiedProducts) {
        const idx = db.products.findIndex((p) => p.id === clientProd.id);
        if (idx >= 0) {
          if ((clientProd.updatedAt || 0) > (db.products[idx].updatedAt || 0)) {
            db.products[idx] = clientProd;
            stockChanges = true;
          }
        } else {
          db.products.push(clientProd);
          stockChanges = true;
        }
      }
    }

    if (stockChanges || pendingTransactions.length > 0) {
      db.lastSyncedAt = Date.now();
      saveDb(db);
    }

    res.json({
      success: true,
      lastSyncedAt: db.lastSyncedAt,
      serverTime: Date.now(),
      products: db.products,
      categories: db.categories,
      transactions: db.transactions.slice(0, 300), // latest 300
      settings: db.settings,
    });
  });

  // 7. Daily Reports & Stats API
  app.get("/api/stats/daily", (req, res) => {
    const targetDateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

    const todayTxs = db.transactions.filter((t) => {
      const txDate = t.date.split("T")[0];
      return txDate === targetDateStr;
    });

    const totalRevenue = todayTxs.reduce((sum, t) => sum + (t.total || 0), 0);
    const totalCost = todayTxs.reduce((sum, t) => sum + (t.costTotal || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const totalTransactions = todayTxs.length;

    // Item sales aggregation
    const itemSales: Record<string, { name: string; qty: number; totalSales: number }> = {};
    const hourlySales: Record<number, number> = {};
    const paymentBreakdown: Record<string, number> = { cash: 0, qris: 0, transfer: 0, debt: 0 };

    for (let h = 8; h <= 22; h++) hourlySales[h] = 0;

    for (const tx of todayTxs) {
      const txHour = new Date(tx.timestamp).getHours();
      hourlySales[txHour] = (hourlySales[txHour] || 0) + tx.total;
      paymentBreakdown[tx.paymentMethod] = (paymentBreakdown[tx.paymentMethod] || 0) + tx.total;

      for (const item of tx.items) {
        if (!itemSales[item.productId]) {
          itemSales[item.productId] = { name: item.name, qty: 0, totalSales: 0 };
        }
        itemSales[item.productId].qty += item.quantity;
        itemSales[item.productId].totalSales += item.subtotal;
      }
    }

    const topSelling = Object.entries(itemSales)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const lowStockProducts = db.products.filter((p) => p.stock <= p.minStock);

    res.json({
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
    });
  });

  // 8. Backup & Restore
  app.get("/api/backup", (_req, res) => {
    res.setHeader("Content-Disposition", `attachment; filename="kedai_teras_mamih_backup_${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(db, null, 2));
  });

  app.post("/api/restore", (req, res) => {
    const backupData = req.body;
    if (!backupData || !Array.isArray(backupData.products)) {
      return res.status(400).json({ error: "Format backup data tidak valid" });
    }
    db = {
      products: backupData.products,
      categories: backupData.categories || DEFAULT_CATEGORIES,
      transactions: backupData.transactions || [],
      settings: backupData.settings || DEFAULT_SETTINGS,
      lastSyncedAt: Date.now(),
    };
    saveDb(db);
    res.json({ success: true, message: "Database berhasil dipulihkan dari cadangan cloud." });
  });

  // Reset to default menu
  app.post("/api/reset-defaults", (_req, res) => {
    db = {
      products: DEFAULT_PRODUCTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
      settings: DEFAULT_SETTINGS,
      lastSyncedAt: Date.now(),
    };
    saveDb(db);
    res.json({ success: true, message: "Menu toko berhasil direset ke menu awal Kedai Teras Mamih" });
  });

  // Vite middleware for development / Production Static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Kedai Teras Mamih] POS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
