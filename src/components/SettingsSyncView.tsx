import React, { useState } from "react";
import { StoreSettings, SyncStatus } from "../types";
import { bluetoothPrinter } from "../services/bluetoothPrinter";
import { audioAlert } from "../services/audioAlert";
import {
  Printer,
  Cloud,
  RefreshCw,
  Store,
  ShieldCheck,
  Download,
  Upload,
  Volume2,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Info,
  RotateCcw
} from "lucide-react";

interface SettingsSyncViewProps {
  settings: StoreSettings;
  syncStatus: SyncStatus;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  onManualSync: () => void;
  onResetDefaults: () => Promise<void>;
}

export const SettingsSyncView: React.FC<SettingsSyncViewProps> = ({
  settings,
  syncStatus,
  onUpdateSettings,
  onManualSync,
  onResetDefaults,
}) => {
  // Bluetooth printer state
  const [btStatus, setBtStatus] = useState<string | null>(null);
  const [connectingBt, setConnectingBt] = useState<boolean>(false);
  const connectedDevice = bluetoothPrinter.getConnectedDevice();

  // Local form state for settings
  const [formSettings, setFormSettings] = useState<StoreSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Restore backup state
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const handleConnectPrinter = async () => {
    setConnectingBt(true);
    setBtStatus(null);
    try {
      const dev = await bluetoothPrinter.connect();
      setBtStatus(`Terhubung ke printer "${dev.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBtStatus(`Gagal: ${msg}`);
    } finally {
      setConnectingBt(false);
    }
  };

  const handleDisconnectPrinter = async () => {
    await bluetoothPrinter.disconnect();
    setBtStatus("Printer Bluetooth telah diputuskan.");
  };

  const handleTestPrint = async () => {
    try {
      await bluetoothPrinter.printTest(formSettings);
      setBtStatus("Tes print berhasil dikirim ke printer thermal!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBtStatus(`Gagal mencetak: ${msg}`);
    }
  };

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    audioAlert.setSoundEnabled(formSettings.soundEnabled);
    onUpdateSettings(formSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleBackupDownload = () => {
    window.open("/api/backup", "_blank");
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await fetch("/api/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(json),
        });

        if (res.ok) {
          setRestoreMessage("Database berhasil dipulihkan dari file cadangan! Memuat ulang...");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setRestoreMessage("Format file cadangan tidak cocok.");
        }
      } catch {
        setRestoreMessage("Gagal membaca file backup JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetConfirm = async () => {
    if (
      confirm(
        "Apakah Anda yakin ingin mengatur ulang data menu ke awal default KEDAI TERAS MAMIH (Jajanan Halal & Murah)?"
      )
    ) {
      await onResetDefaults();
      alert("Menu default berhasil dimuat ulang!");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 pb-24 space-y-4">
      {/* 1. BLUETOOTH THERMAL PRINTER CARD */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900">Printer Thermal Bluetooth</h3>
              <p className="text-[11px] text-stone-500">
                Hubungkan printer kasir mini ESC/POS untuk cetak struk langsung
              </p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              connectedDevice?.connected
                ? "bg-emerald-100 text-emerald-800"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {connectedDevice?.connected ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Terhubung
              </>
            ) : (
              "Belum Terhubung"
            )}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
            <div>
              <span className="text-xs font-bold text-stone-800 block">
                {connectedDevice ? connectedDevice.name : "Tidak ada printer aktif"}
              </span>
              <span className="text-[11px] text-stone-500">
                {bluetoothPrinter.isSupported()
                  ? "Didukung pada Google Chrome Android & Web Bluetooth."
                  : "Web Bluetooth tidak aktif di browser ini. Anda tetap bisa mencetak via Cetak Sistem / RawBT."}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {connectedDevice?.connected ? (
                <>
                  <button
                    onClick={handleTestPrint}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-bold"
                  >
                    Tes Print
                  </button>
                  <button
                    onClick={handleDisconnectPrinter}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold"
                  >
                    Putuskan
                  </button>
                </>
              ) : (
                <button
                  id="btn-connect-bluetooth"
                  onClick={handleConnectPrinter}
                  disabled={connectingBt}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  {connectingBt ? "Mencari Printer..." : "Hubungkan Printer"}
                </button>
              )}
            </div>
          </div>

          {/* Paper Size Setting */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-stone-700 font-medium">Ukuran Kertas Struk:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, paperSize: "58mm" })}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  formSettings.paperSize === "58mm"
                    ? "bg-amber-800 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                58 mm (Standar Mini)
              </button>
              <button
                type="button"
                onClick={() => setFormSettings({ ...formSettings, paperSize: "80mm" })}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  formSettings.paperSize === "80mm"
                    ? "bg-amber-800 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                80 mm (Lebar)
              </button>
            </div>
          </div>

          {btStatus && (
            <div className="p-2 rounded-lg bg-stone-100 text-xs text-stone-700 border border-stone-200">
              {btStatus}
            </div>
          )}
        </div>
      </div>

      {/* 2. CLOUD DATA STORAGE & MULTI-DEVICE SYNC CARD */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900">Cloud Storage & Multi-Perangkat</h3>
              <p className="text-[11px] text-stone-500">
                Penyimpanan cloud aman & sinkronisasi otomatis saat terhubung internet
              </p>
            </div>
          </div>

          <button
            onClick={onManualSync}
            disabled={syncStatus.isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? "animate-spin" : ""}`} />
            <span>{syncStatus.isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                Status Koneksi Cloud:
              </span>
              <strong className={syncStatus.isOnline ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                {syncStatus.isOnline ? "🟢 Cloud Aktif & Terhubung" : "🔴 Mode Offline Mandiri"}
              </strong>
              <p className="text-[11px] text-stone-500 mt-1">
                Terakhir sinkron:{" "}
                {syncStatus.lastSyncedAt
                  ? new Date(syncStatus.lastSyncedAt).toLocaleString("id-ID")
                  : "Baru saja"}
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 font-semibold block uppercase">
                Antrean Transaksi Offline:
              </span>
              <strong className="text-stone-800">
                {syncStatus.pendingTransactionsCount} transaksi menunggu sinkron
              </strong>
              <p className="text-[11px] text-stone-500 mt-1">
                Akan otomatis diunggah ke server cloud saat internet tersambung kembali.
              </p>
            </div>
          </div>

          {/* Multi-Device Access Banner */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-amber-950">
            <Info className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="text-[11px] space-y-1">
              <p className="font-bold">Akses dari Berbagai Perangkat Secara Bersamaan</p>
              <p className="text-stone-600 leading-relaxed">
                Anda dapat membuka tautan aplikasi POS ini dari HP kasir lain, tablet counter, ataupun laptop owner. Semua perubahan stok dan transaksi penjualan tersinkronisasi secara real-time ke database cloud.
              </p>
            </div>
          </div>

          {/* Backup & Restore Buttons */}
          <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <button
              onClick={handleBackupDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold transition"
            >
              <Download className="w-4 h-4 text-stone-600" />
              <span>Unduh Cadangan Cloud (.json)</span>
            </button>

            <label className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold transition cursor-pointer">
              <Upload className="w-4 h-4 text-stone-600" />
              <span>Pulihkan Cadangan (Restore)</span>
              <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>

          {restoreMessage && (
            <div className="p-2 bg-amber-100 text-amber-900 rounded-lg text-xs">
              {restoreMessage}
            </div>
          )}
        </div>
      </div>

      {/* 3. STORE PROFILE & RECEIPT DETAILS */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-900">Identitas Kedai & Struk</h3>
              <p className="text-[11px] text-stone-500">
                Informasi yang dicetak pada struk belanja dan laporan
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveStoreProfile} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Nama Toko / Kedai</label>
              <input
                type="text"
                value={formSettings.storeName}
                onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-bold focus:outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Slogan / Tagline</label>
              <input
                type="text"
                value={formSettings.tagline}
                onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Alamat Kedai</label>
              <input
                type="text"
                value={formSettings.address}
                onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={formSettings.phone}
                onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Nama Kasir Saat Ini</label>
              <input
                type="text"
                value={formSettings.cashierName}
                onChange={(e) => setFormSettings({ ...formSettings, cashierName: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Pesan Penutup Struk</label>
              <input
                type="text"
                value={formSettings.footerMessage}
                onChange={(e) => setFormSettings({ ...formSettings, footerMessage: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Toggle Preferences */}
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-stone-50">
              <div>
                <span className="font-bold text-stone-800 block">Efek Suara POS & Scan Barcode</span>
                <span className="text-[11px] text-stone-400">
                  Bunyi bip saat scan kode batang dan suara kasir saat transaksi berhasil
                </span>
              </div>
              <input
                type="checkbox"
                checked={formSettings.soundEnabled}
                onChange={(e) => setFormSettings({ ...formSettings, soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-800 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-stone-50">
              <div>
                <span className="font-bold text-stone-800 block">Izinkan Penjualan Stok Minus</span>
                <span className="text-[11px] text-stone-400">
                  Jika aktif, kasir tetap bisa menjual produk meskipun stok di aplikasi tercatat 0
                </span>
              </div>
              <input
                type="checkbox"
                checked={formSettings.allowNegativeStock}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, allowNegativeStock: e.target.checked })
                }
                className="w-4 h-4 accent-amber-800 rounded"
              />
            </label>
          </div>

          <div className="pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetConfirm}
              className="text-stone-400 hover:text-rose-600 text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Menu ke Default</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-xs transition"
            >
              Simpan Pengaturan
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan berhasil disimpan!</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
