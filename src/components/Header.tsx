import React from "react";
import { StoreSettings, SyncStatus, Product } from "../types";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, ScanBarcode } from "lucide-react";

interface HeaderProps {
  settings: StoreSettings;
  syncStatus: SyncStatus;
  lowStockProducts: Product[];
  onOpenScanner: () => void;
  onOpenLowStock: () => void;
  onManualSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  syncStatus,
  lowStockProducts,
  onOpenScanner,
  onOpenLowStock,
  onManualSync,
}) => {
  const outOfStockCount = lowStockProducts.filter((p) => p.stock === 0).length;
  const lowCount = lowStockProducts.length;

  return (
    <header className="sticky top-0 z-30 bg-amber-900 text-amber-50 shadow-md border-b border-amber-800/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-amber-100 border-2 border-amber-400/70 shadow-sm shrink-0 flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt={settings.storeName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if logo not loaded yet
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="text-amber-950 font-bold text-xs">KTM</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                {settings.storeName}
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-700 text-amber-200 uppercase tracking-wider">
                POS Android
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 truncate flex items-center gap-1">
              <span>{settings.tagline}</span>
            </p>
          </div>
        </div>

        {/* Action Badges & Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Barcode Scanner Shortcut */}
          <button
            id="btn-quick-barcode"
            onClick={onOpenScanner}
            aria-label="Pindai Barcode"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-800 hover:bg-amber-700 active:bg-amber-950 text-white text-xs font-semibold rounded-lg border border-amber-700 transition shadow-xs"
          >
            <ScanBarcode className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">Scan Barcode</span>
          </button>

          {/* Cloud Sync Status Pill */}
          <button
            id="btn-cloud-sync-status"
            onClick={onManualSync}
            disabled={syncStatus.isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
              syncStatus.isOnline
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900"
                : "bg-rose-950/80 border-rose-500/50 text-rose-200 hover:bg-rose-900"
            }`}
            title={
              syncStatus.isOnline
                ? `Cloud Aktif - Terakhir sinkron: ${syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString("id-ID") : "Baru saja"}`
                : "Mode Offline - Transaksi disimpan lokal"
            }
          >
            {syncStatus.isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            ) : syncStatus.isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            )}

            <span className="hidden sm:inline">
              {syncStatus.isSyncing
                ? "Sinkronisasi..."
                : syncStatus.isOnline
                ? "Cloud Online"
                : "Offline"}
            </span>

            {syncStatus.pendingTransactionsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-amber-950 text-[10px] font-bold rounded-full">
                {syncStatus.pendingTransactionsCount}
              </span>
            )}
          </button>

          {/* Low Stock Alert Bell */}
          <button
            id="btn-low-stock-alert"
            onClick={onOpenLowStock}
            className={`relative p-2 rounded-lg border transition ${
              lowCount > 0
                ? "bg-amber-800/90 border-amber-500 text-amber-200 hover:bg-amber-700"
                : "bg-amber-900/60 border-amber-700/60 text-amber-300/70 hover:bg-amber-800"
            }`}
            title={`${lowCount} produk membutuhkan restok`}
          >
            <AlertTriangle className={`w-4 h-4 ${outOfStockCount > 0 ? "text-rose-400 animate-pulse" : "text-amber-300"}`} />
            {lowCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-xs">
                {lowCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
