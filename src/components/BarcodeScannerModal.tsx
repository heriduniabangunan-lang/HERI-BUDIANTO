import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Product } from "../types";
import { audioAlert } from "../services/audioAlert";
import { X, Camera, RefreshCw, Keyboard, Volume2, VolumeX, CheckCircle, AlertCircle } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onProductScanned: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onProductScanned,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState<string>("");
  const [lastScannedItem, setLastScannedItem] = useState<{ name: string; barcode: string; time: number } | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "interactive-barcode-reader";

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText) => {
          handleDetectedBarcode(decodedText);
        },
        () => {
          // Frame scan error - ignore frame by frame
        }
      );

      setCameraActive(true);
    } catch (err: unknown) {
      console.warn("Camera start error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(
        msg.includes("Permission") || msg.includes("NotAllowedError")
          ? "Izin kamera ditolak. Silakan berikan izin kamera pada browser atau gunakan input manual kode batang."
          : "Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Error stopping camera:", err);
      }
    }
    scannerRef.current = null;
    setCameraActive(false);
  };

  const handleDetectedBarcode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Prevent immediate duplicate scans within 1.2 seconds
    if (lastScannedItem && lastScannedItem.barcode === trimmed && Date.now() - lastScannedItem.time < 1200) {
      return;
    }

    if (soundOn) {
      audioAlert.playScanBeep();
    }

    const matchedProduct = products.find(
      (p) => p.barcode.toLowerCase() === trimmed.toLowerCase() || p.id === trimmed
    );

    if (matchedProduct) {
      setLastScannedItem({
        name: matchedProduct.name,
        barcode: trimmed,
        time: Date.now(),
      });
      onProductScanned(matchedProduct);
    } else {
      setLastScannedItem({
        name: "Barang tidak terdaftar",
        barcode: trimmed,
        time: Date.now(),
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetectedBarcode(manualCode.trim());
    setManualCode("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-stone-900 border border-stone-700 text-stone-100 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Pemindai Barcode / QR</h3>
              <p className="text-[11px] text-stone-400">Arahkan kamera ke kode batang produk</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSoundOn(!soundOn)}
              className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
              title={soundOn ? "Bip Aktif" : "Bip Bisu"}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[320px] flex items-center justify-center overflow-hidden">
          <div id={readerElementId} className="w-full h-full object-cover"></div>

          {/* Scanner Overlay Laser */}
          {cameraActive && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-40 border-2 border-amber-400/80 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                {/* Red animated laser line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-[bounce_2s_infinite]" />
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-400" />
              </div>
              <span className="text-[11px] text-amber-200/90 mt-2 bg-stone-900/80 px-3 py-1 rounded-full backdrop-blur-xs">
                Posisikan barcode di dalam kotak
              </span>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="p-4 text-center max-w-xs text-rose-300 bg-stone-900/90 rounded-xl border border-rose-900/80 mx-4">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-xs leading-relaxed mb-3">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold"
              >
                Coba Akses Lagi
              </button>
            </div>
          )}

          {/* Flip camera button */}
          <button
            onClick={() => setFacingMode(facingMode === "environment" ? "user" : "environment")}
            className="absolute top-3 right-3 p-2 bg-stone-900/80 hover:bg-stone-800 text-amber-300 rounded-full border border-stone-700 shadow-sm"
            title="Ganti Kamera Depan/Belakang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Scan Feedback Banner */}
        {lastScannedItem && (
          <div
            className={`p-2.5 px-4 text-xs flex items-center gap-2 border-y ${
              lastScannedItem.name === "Barang tidak terdaftar"
                ? "bg-rose-950/80 text-rose-300 border-rose-900"
                : "bg-emerald-950/80 text-emerald-200 border-emerald-900"
            }`}
          >
            {lastScannedItem.name === "Barang tidak terdaftar" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div className="flex-1 truncate">
              <span className="font-bold">{lastScannedItem.name}</span>
              <span className="text-[10px] opacity-75 ml-1.5">({lastScannedItem.barcode})</span>
            </div>
            {lastScannedItem.name !== "Barang tidak terdaftar" && (
              <span className="text-[10px] font-semibold bg-emerald-800 text-white px-1.5 py-0.5 rounded">
                +1 Masuk
              </span>
            )}
          </div>
        )}

        {/* Manual Barcode Input & Quick Simulation */}
        <div className="p-3.5 bg-stone-950 border-t border-stone-800 space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-manual-barcode"
                type="text"
                placeholder="Ketik/Paste barcode atau scan USB..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              id="btn-submit-manual-barcode"
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition"
            >
              Cari & Masuk
            </button>
          </form>

          {/* Quick Simulation Chips for test convenience */}
          <div>
            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold block mb-1.5">
              Simulasi Cepat (Klik untuk test scan):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {products.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleDetectedBarcode(p.barcode)}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-[11px] text-amber-200 rounded-lg border border-stone-700/80 transition truncate max-w-[140px]"
                >
                  ⚡ {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
