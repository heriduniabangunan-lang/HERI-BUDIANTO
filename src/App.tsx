import React, { useState, useEffect, useCallback } from "react";
import { Product, Transaction, Category, StoreSettings, SyncStatus, DailyReport } from "./types";
import { apiService, DEFAULT_SETTINGS } from "./services/api";
import { audioAlert } from "./services/audioAlert";
import { Header } from "./components/Header";
import { BottomNav, NavTab } from "./components/BottomNav";
import { POSView } from "./components/POSView";
import { StockManagementView } from "./components/StockManagementView";
import { ReportsView } from "./components/ReportsView";
import { SettingsSyncView } from "./components/SettingsSyncView";
import { BarcodeScannerModal } from "./components/BarcodeScannerModal";
import { ReceiptModal } from "./components/ReceiptModal";
import { LowStockNotificationModal } from "./components/LowStockNotificationModal";

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>("pos");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: "all", name: "Semua Menu" },
    { id: "makanan", name: "Jajanan & Gorengan" },
    { id: "minuman", name: "Minuman Segar" },
    { id: "cemilan", name: "Cemilan & Dimsum" },
    { id: "paket", name: "Paket Hemat" },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingTransactionsCount: 0,
    error: null,
  });

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [currentReceiptTx, setCurrentReceiptTx] = useState<Transaction | null>(null);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState<boolean>(false);

  // Cart item count for badge
  const [cartCount, setCartCount] = useState<number>(0);

  // Initial Data Load
  useEffect(() => {
    const cachedSettings = apiService.getLocalSettings();
    setSettings(cachedSettings);
    audioAlert.setSoundEnabled(cachedSettings.soundEnabled);

    // Subscribe to cloud sync status
    const unsubscribeSync = apiService.subscribeStatus((status) => {
      setSyncStatus(status);
    });

    loadInitialData();

    return () => {
      unsubscribeSync();
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [prods, txs, report] = await Promise.all([
        apiService.fetchProducts(),
        apiService.fetchTransactions(),
        apiService.fetchDailyReport(),
      ]);
      setProducts(prods);
      setTransactions(txs);
      setDailyReport(report);
    } catch (err) {
      console.warn("Failed to load initial data:", err);
    }
  };

  // Low stock products
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  // Manual Sync trigger
  const handleManualSync = async () => {
    const success = await apiService.syncWithCloud();
    if (success) {
      await loadInitialData();
    }
  };

  // Handle complete transaction from POS
  const handleCompleteTransaction = async (tx: Transaction) => {
    const result = await apiService.createTransaction(tx);
    setCurrentReceiptTx(result.transaction);
    setIsReceiptOpen(true);

    // Refresh products and daily report
    const updatedProducts = apiService.getLocalProducts();
    setProducts(updatedProducts);
    const updatedTxs = apiService.getLocalTransactions();
    setTransactions(updatedTxs);
    const updatedReport = await apiService.fetchDailyReport();
    setDailyReport(updatedReport);

    // If any items hit low stock or out of stock during this checkout, trigger gentle warning alert
    if (result.lowStockAlerts && result.lowStockAlerts.length > 0) {
      setTimeout(() => {
        audioAlert.playWarningAlert();
      }, 700);
    }
  };

  // Product CRUD
  const handleSaveProduct = async (productData: Partial<Product> & { id?: string }) => {
    await apiService.saveProduct(productData);
    const fresh = apiService.getLocalProducts();
    setProducts(fresh);
    const updatedReport = await apiService.fetchDailyReport();
    setDailyReport(updatedReport);
  };

  const handleDeleteProduct = async (id: string) => {
    await apiService.deleteProduct(id);
    const fresh = apiService.getLocalProducts();
    setProducts(fresh);
    const updatedReport = await apiService.fetchDailyReport();
    setDailyReport(updatedReport);
  };

  const handleRestockProduct = async (id: string, addedQty: number, reason?: string) => {
    await apiService.restockProduct(id, addedQty, reason);
    const fresh = apiService.getLocalProducts();
    setProducts(fresh);
    const updatedReport = await apiService.fetchDailyReport();
    setDailyReport(updatedReport);
    audioAlert.playSuccessChime();
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
    apiService.saveLocalSettings(newSettings);
    // Push to server
    if (syncStatus.isOnline) {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      }).catch(() => {});
    }
  };

  // Reset to default
  const handleResetDefaults = async () => {
    await fetch("/api/reset-defaults", { method: "POST" });
    await loadInitialData();
  };

  // Callback when scanner finds a product
  const handleScannedProduct = (product: Product) => {
    // If currently on another tab, switch to POS
    if (currentTab !== "pos") {
      setCurrentTab("pos");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 selection:bg-amber-200">
      {/* Top Application Bar with Logo & Sync Status */}
      <Header
        settings={settings}
        syncStatus={syncStatus}
        lowStockProducts={lowStockProducts}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenLowStock={() => setIsLowStockModalOpen(true)}
        onManualSync={handleManualSync}
      />

      {/* Main Content Body */}
      <main className="flex-1 overflow-x-hidden">
        {currentTab === "pos" && (
          <POSView
            products={products}
            categories={categories}
            settings={settings}
            onOpenScanner={() => setIsScannerOpen(true)}
            onCompleteTransaction={handleCompleteTransaction}
          />
        )}

        {currentTab === "stock" && (
          <StockManagementView
            products={products}
            categories={categories}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onRestockProduct={handleRestockProduct}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {currentTab === "reports" && (
          <ReportsView
            transactions={transactions}
            dailyReport={dailyReport}
            settings={settings}
            onViewReceipt={(tx) => {
              setCurrentReceiptTx(tx);
              setIsReceiptOpen(true);
            }}
          />
        )}

        {currentTab === "settings" && (
          <SettingsSyncView
            settings={settings}
            syncStatus={syncStatus}
            onUpdateSettings={handleUpdateSettings}
            onManualSync={handleManualSync}
            onResetDefaults={handleResetDefaults}
          />
        )}
      </main>

      {/* Android Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        cartCount={cartCount}
        lowStockCount={lowStockProducts.length}
      />

      {/* Barcode / QR Scanner Camera Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        onProductScanned={handleScannedProduct}
      />

      {/* Thermal Receipt Preview & Print Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={currentReceiptTx}
        settings={settings}
        onNewTransaction={() => {
          setIsReceiptOpen(false);
          setCurrentReceiptTx(null);
          setCurrentTab("pos");
        }}
      />

      {/* Low Stock Notification & Quick Restock Modal */}
      <LowStockNotificationModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        lowStockProducts={lowStockProducts}
        onQuickRestock={async (id, qty) => {
          await handleRestockProduct(id, qty, "Restok dari Notifikasi");
        }}
      />
    </div>
  );
}
