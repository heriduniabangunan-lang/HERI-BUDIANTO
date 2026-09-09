import React from "react";
import { Product } from "../types";
import { AlertTriangle, X, Plus, PackageCheck, AlertCircle } from "lucide-react";

interface LowStockNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowStockProducts: Product[];
  onQuickRestock: (productId: string, qty: number) => void;
}

export const LowStockNotificationModal: React.FC<LowStockNotificationModalProps> = ({
  isOpen,
  onClose,
  lowStockProducts,
  onQuickRestock,
}) => {
  if (!isOpen) return null;

  const outOfStock = lowStockProducts.filter((p) => p.stock === 0);
  const runningLow = lowStockProducts.filter((p) => p.stock > 0 && p.stock <= p.minStock);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 bg-rose-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-500/30 rounded-lg text-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pemberitahuan Stok Barang</h3>
              <p className="text-[11px] text-rose-200">
                {lowStockProducts.length} menu membutuhkan restok segera
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-rose-200 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-stone-500 space-y-2">
              <PackageCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm text-stone-700">Semua Stok Barang Aman!</p>
              <p className="text-xs text-stone-400">Tidak ada produk yang habis atau di bawah batas minimum.</p>
            </div>
          ) : (
            <>
              {/* Out of stock list */}
              {outOfStock.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-xs uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4" />
                    <span>Barang Habis Total ({outOfStock.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {outOfStock.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-stone-900 truncate">{prod.name}</h5>
                          <span className="text-[10px] text-rose-600 font-semibold block">
                            Stok: 0 {prod.unit} (Min. {prod.minStock})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onQuickRestock(prod.id, 10)}
                            className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+10</span>
                          </button>
                          <button
                            onClick={() => onQuickRestock(prod.id, 25)}
                            className="px-2.5 py-1.5 bg-white border border-rose-300 text-rose-800 font-bold rounded-lg text-xs shadow-2xs hover:bg-rose-100"
                          >
                            +25
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Running low list */}
              {runningLow.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Stok Menipis Kritis ({runningLow.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {runningLow.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-stone-900 truncate">{prod.name}</h5>
                          <span className="text-[10px] text-amber-800 font-semibold block">
                            Sisa: {prod.stock} {prod.unit} (Batas min: {prod.minStock})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onQuickRestock(prod.id, 10)}
                            className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+10</span>
                          </button>
                          <button
                            onClick={() => onQuickRestock(prod.id, 20)}
                            className="px-2.5 py-1.5 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg text-xs shadow-2xs hover:bg-amber-100"
                          >
                            +20
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-semibold text-xs transition"
          >
            Tutup Pemberitahuan
          </button>
        </div>
      </div>
    </div>
  );
};
