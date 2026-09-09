import React, { useState } from "react";
import { Transaction, StoreSettings } from "../types";
import { bluetoothPrinter } from "../services/bluetoothPrinter";
import { Printer, Share2, Check, ArrowRight, Smartphone, AlertCircle } from "lucide-react";

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onNewTransaction: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  isOpen,
  onClose,
  onNewTransaction,
}) => {
  const [printing, setPrinting] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen || !transaction) return null;

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const formattedDate = new Date(transaction.timestamp).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const handleBluetoothPrint = async () => {
    setPrinting(true);
    setPrintStatus(null);
    try {
      // Check if connected
      const connected = bluetoothPrinter.getConnectedDevice();
      if (!connected) {
        // Prompt connection first
        await bluetoothPrinter.connect();
      }
      await bluetoothPrinter.printReceipt(transaction, settings);
      setPrintStatus({ success: true, message: "Struk berhasil dicetak ke Printer Bluetooth!" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPrintStatus({ success: false, message: msg });
    } finally {
      setPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const divider = "------------------------------";
    let text = `*${settings.storeName}*\n`;
    text += `${settings.tagline}\n`;
    text += `${settings.address}\n`;
    text += `${divider}\n`;
    text += `No. Struk: ${transaction.receiptNumber}\n`;
    text += `Waktu: ${formattedDate}\n`;
    text += `Kasir: ${transaction.cashierName}\n`;
    if (transaction.customerName) text += `Pelanggan: ${transaction.customerName}\n`;
    text += `${divider}\n`;

    transaction.items.forEach((item) => {
      text += `${item.name}\n`;
      text += `  ${item.quantity} x ${formatRupiah(item.price)} = ${formatRupiah(item.subtotal)}\n`;
    });

    text += `${divider}\n`;
    text += `Subtotal: ${formatRupiah(transaction.subtotal)}\n`;
    if (transaction.discount > 0) {
      text += `Diskon: -${formatRupiah(transaction.discount)}\n`;
    }
    text += `*TOTAL: ${formatRupiah(transaction.total)}*\n`;
    text += `Metode: ${transaction.paymentMethod.toUpperCase()}\n`;
    if (transaction.paymentMethod === "cash") {
      text += `Tunai: ${formatRupiah(transaction.cashPaid)}\n`;
      text += `Kembalian: ${formatRupiah(transaction.change)}\n`;
    }
    text += `${divider}\n`;
    text += `${settings.footerMessage.replace(/\n/g, " ")}\n`;
    text += `_Halal & Murah_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl my-auto border border-stone-200">
        {/* Modal Top Banner */}
        <div className="p-3.5 bg-amber-900 text-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Transaksi Berhasil</h3>
              <p className="text-[11px] text-amber-200">Struk siap dicetak atau dibagikan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white text-xs px-2 py-1 rounded-md hover:bg-amber-800 transition"
          >
            Tutup
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-4 bg-amber-50/50 flex justify-center">
          <div
            id="thermal-receipt-preview"
            className="w-full max-w-[280px] bg-white p-4 rounded-lg shadow-sm border border-stone-200 font-mono text-xs text-stone-800 space-y-2 select-text"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-stone-300">
              <div className="w-10 h-10 mx-auto rounded-full overflow-hidden mb-1 border border-stone-300">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h4 className="font-extrabold text-sm tracking-tight">{settings.storeName}</h4>
              <p className="text-[10px] text-stone-500">{settings.tagline}</p>
              <p className="text-[9px] text-stone-400 mt-0.5">{settings.address}</p>
              <p className="text-[9px] text-stone-400">Telp: {settings.phone}</p>
            </div>

            {/* Meta */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-stone-300 pb-2">
              <div className="flex justify-between">
                <span>No: {transaction.receiptNumber}</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>{formattedDate}</span>
                <span className="font-bold uppercase text-amber-800">{transaction.paymentMethod}</span>
              </div>
              {transaction.customerName && transaction.customerName !== "Pelanggan Teras" && (
                <div className="text-stone-600">Pelanggan: {transaction.customerName}</div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-1.5 py-1 border-b border-dashed border-stone-300">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="flex justify-between text-[10px] text-stone-500 pl-1">
                    <span>
                      {item.quantity} x {formatRupiah(item.price)}
                    </span>
                    <span className="font-semibold text-stone-700">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation */}
            <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-stone-300 pb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-1">
                <span>TOTAL</span>
                <span className="text-amber-900">{formatRupiah(transaction.total)}</span>
              </div>
              {transaction.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-[10px] text-stone-600 pt-0.5">
                    <span>Tunai Diterima</span>
                    <span>{formatRupiah(transaction.cashPaid)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                    <span>Kembalian</span>
                    <span>{formatRupiah(transaction.change)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-2 text-[10px] text-stone-500 space-y-1">
              <p className="whitespace-pre-line leading-relaxed">{settings.footerMessage}</p>
              <p className="text-[8px] text-stone-400">=== POS KEDAI TERAS MAMIH ===</p>
            </div>
          </div>
        </div>

        {/* Print Feedback Notification */}
        {printStatus && (
          <div
            className={`mx-4 mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              printStatus.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {printStatus.success ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <p className="text-[11px]">{printStatus.message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Bluetooth Thermal Print */}
            <button
              id="btn-print-bluetooth"
              onClick={handleBluetoothPrint}
              disabled={printing}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{printing ? "Mencetak..." : "Print Bluetooth"}</span>
            </button>

            {/* Share to WhatsApp */}
            <button
              id="btn-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>Kirim WA</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* System Print (PDF/RawBT) */}
            <button
              id="btn-system-print"
              onClick={handleSystemPrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-medium transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cetak Sistem/PDF</span>
            </button>

            {/* Next Transaction */}
            <button
              id="btn-next-transaction"
              onClick={onNewTransaction}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition"
            >
              <span>Transaksi Baru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
