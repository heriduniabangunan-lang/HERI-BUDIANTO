import React, { useState, useMemo } from "react";
import { Transaction, DailyReport, StoreSettings } from "../types";
import { exportTransactionsToExcel, printOrExportPdf } from "../services/exportService";
import {
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  Printer,
  Calendar,
  CreditCard,
  Clock,
  Eye,
  Award,
  BarChart2,
  Receipt,
  X
} from "lucide-react";

interface ReportsViewProps {
  transactions: Transaction[];
  dailyReport: DailyReport | null;
  settings: StoreSettings;
  onViewReceipt: (tx: Transaction) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  dailyReport,
  settings,
  onViewReceipt,
}) => {
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  // Filter transactions based on date filter
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return transactions.filter((t) => {
      const txDate = new Date(t.timestamp);
      const txDateStr = t.date ? t.date.split("T")[0] : txDate.toISOString().split("T")[0];

      if (dateFilter === "today") return txDateStr === todayStr;
      if (dateFilter === "yesterday") return txDateStr === yesterdayStr;
      if (dateFilter === "week") return txDate >= sevenDaysAgo;
      if (dateFilter === "month") return txDate >= firstDayOfMonth;
      if (dateFilter === "custom") return txDateStr === customStartDate;
      return true;
    });
  }, [transactions, dateFilter, customStartDate]);

  // Aggregate metrics
  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + t.total, 0);
  }, [filteredTransactions]);

  const totalCost = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + t.costTotal, 0);
  }, [filteredTransactions]);

  const totalProfit = useMemo(() => {
    return totalRevenue - totalCost;
  }, [totalRevenue, totalCost]);

  const totalItemsSold = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => acc + t.items.reduce((sum, i) => sum + i.quantity, 0),
      0
    );
  }, [filteredTransactions]);

  const aov = filteredTransactions.length > 0 ? Math.round(totalRevenue / filteredTransactions.length) : 0;

  // Hourly breakdown for visual chart
  const hourlyData = useMemo(() => {
    const hours: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) hours[h] = 0;

    filteredTransactions.forEach((t) => {
      const h = new Date(t.timestamp).getHours();
      if (hours[h] !== undefined) {
        hours[h] += t.total;
      }
    });

    const maxVal = Math.max(...Object.values(hours), 1);
    return { hours, maxVal };
  }, [filteredTransactions]);

  // Top Selling Items in this filtered view
  const topSellingItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    filteredTransactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = { name: item.name, qty: 0, total: 0 };
        }
        map[item.productId].qty += item.quantity;
        map[item.productId].total += item.subtotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      debt: { count: 0, total: 0 },
    };

    filteredTransactions.forEach((t) => {
      if (summary[t.paymentMethod]) {
        summary[t.paymentMethod].count += 1;
        summary[t.paymentMethod].total += t.total;
      }
    });

    return summary;
  }, [filteredTransactions]);

  const filterLabel = {
    today: "Hari Ini",
    yesterday: "Kemarin",
    week: "7 Hari Terakhir",
    month: "Bulan Ini",
    custom: `Tanggal ${customStartDate}`,
  }[dateFilter];

  const handleExportExcel = () => {
    exportTransactionsToExcel(filteredTransactions, dailyReport, settings, filterLabel);
  };

  const handleExportPdf = () => {
    printOrExportPdf(filteredTransactions, dailyReport, settings, filterLabel);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 pb-24 space-y-4">
      {/* Date Filter & Export Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Calendar className="w-4 h-4 text-amber-800 shrink-0 mr-1" />
          {[
            { id: "today", label: "Hari Ini" },
            { id: "yesterday", label: "Kemarin" },
            { id: "week", label: "7 Hari" },
            { id: "month", label: "Bulan Ini" },
            { id: "custom", label: "Pilih Tgl" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setDateFilter(pill.id as typeof dateFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                dateFilter === pill.id
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {pill.label}
            </button>
          ))}

          {dateFilter === "custom" && (
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-800"
            />
          )}
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export Excel */}
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Unduh Excel (.xlsx)</span>
          </button>

          {/* Export / Print PDF */}
          <button
            id="btn-export-pdf"
            onClick={handleExportPdf}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-amber-200" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Revenue, Gross Profit, Total Orders, Items Sold */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
            Total Omset Penjualan
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1 truncate">
            {formatRupiah(totalRevenue)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">Periode: {filterLabel}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide block">
            Estimasi Laba Bersih
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 truncate">
            {formatRupiah(totalProfit)}
          </div>
          <span className="text-[10px] text-emerald-700 mt-1 block">
            {totalRevenue > 0 ? `${Math.round((totalProfit / totalRevenue) * 100)}% margin keuntungan` : "0%"}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
            Total Transaksi
          </span>
          <div className="text-xl sm:text-2xl font-black text-stone-800 mt-1">
            {filteredTransactions.length} <span className="text-xs text-stone-400 font-normal">struk</span>
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Rata-rata: {formatRupiah(aov)} / struk
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block">
            Menu Terjual
          </span>
          <div className="text-xl sm:text-2xl font-black text-stone-800 mt-1">
            {totalItemsSold} <span className="text-xs text-stone-400 font-normal">porsi</span>
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">Total porsi jajanan & minuman</span>
        </div>
      </div>

      {/* Middle Row: Hourly Sales Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Hourly Rush Hours Visual Bar Chart */}
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-800" />
              <h4 className="font-bold text-xs sm:text-sm text-stone-800">
                Grafik Jam Ramai Penjualan (08:00 - 22:00)
              </h4>
            </div>
            <span className="text-[11px] text-stone-400">Real-time</span>
          </div>

          <div className="h-44 flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-1 border-b border-stone-100">
            {Object.entries(hourlyData.hours).map(([hour, value]) => {
              const val = Number(value) || 0;
              const heightPct = (val / hourlyData.maxVal) * 100;
              return (
                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-stone-900 text-white text-[9px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
                    {formatRupiah(val)}
                  </div>
                  {/* Bar */}
                  <div className="w-full bg-amber-100 rounded-t-md relative flex items-end justify-center min-h-2 h-32">
                    <div
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        val > 0 ? "bg-amber-800 group-hover:bg-amber-700" : "bg-transparent"
                      }`}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-stone-400">
                    {hour}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Payment Method Breakdown Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 block">Tunai</span>
              <strong className="text-stone-800">{formatRupiah(paymentBreakdown.cash.total)}</strong>
              <span className="text-[10px] text-stone-400 block">{paymentBreakdown.cash.count} transaksi</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 block">QRIS</span>
              <strong className="text-amber-900">{formatRupiah(paymentBreakdown.qris.total)}</strong>
              <span className="text-[10px] text-stone-400 block">{paymentBreakdown.qris.count} transaksi</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 block">Transfer</span>
              <strong className="text-stone-800">{formatRupiah(paymentBreakdown.transfer.total)}</strong>
              <span className="text-[10px] text-stone-400 block">{paymentBreakdown.transfer.count} transaksi</span>
            </div>
            <div className="bg-stone-50 p-2 rounded-xl border border-stone-200">
              <span className="text-[10px] text-stone-500 block">Bon/Hutang</span>
              <strong className="text-rose-600">{formatRupiah(paymentBreakdown.debt.total)}</strong>
              <span className="text-[10px] text-stone-400 block">{paymentBreakdown.debt.count} transaksi</span>
            </div>
          </div>
        </div>

        {/* Top 5 Best Selling Items */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-800" />
              <h4 className="font-bold text-xs sm:text-sm text-stone-800">Menu Paling Laris</h4>
            </div>

            {topSellingItems.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-8">Belum ada transaksi pada periode ini</p>
            ) : (
              <div className="space-y-2.5">
                {topSellingItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 bg-stone-50 rounded-xl border border-stone-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-stone-800 truncate">{item.name}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-amber-900 block">{item.qty} porsi</span>
                      <span className="text-[10px] text-stone-400 block">{formatRupiah(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-400 text-center">
            Paling digemari pelanggan Kedai Teras Mamih
          </div>
        </div>
      </div>

      {/* Transaction History Log Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-800" />
            <h4 className="font-bold text-xs sm:text-sm text-stone-800">Riwayat Transaksi Kasir</h4>
          </div>
          <span className="text-xs font-semibold text-stone-500">
            {filteredTransactions.length} transaksi tercatat
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            Tidak ada transaksi pada filter tanggal yang dipilih.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {filteredTransactions.map((tx) => {
              const dateObj = new Date(tx.timestamp);
              const timeStr = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
              const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

              return (
                <div
                  key={tx.id}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-stone-50 transition cursor-pointer"
                  onClick={() => setSelectedTxDetail(tx)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-stone-900 font-mono">
                        {tx.receiptNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.paymentMethod === "cash"
                            ? "bg-stone-100 text-stone-700"
                            : tx.paymentMethod === "qris"
                            ? "bg-amber-100 text-amber-800"
                            : tx.paymentMethod === "transfer"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 mt-1 truncate">
                      <span>{tx.items.length} macam jajanan</span>
                      <span className="mx-1.5">•</span>
                      <span>{dateStr}, {timeStr}</span>
                      {tx.customerName && tx.customerName !== "Pelanggan Teras" && (
                        <>
                          <span className="mx-1.5">•</span>
                          <span>Plg: {tx.customerName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-black text-amber-950 block">
                      {formatRupiah(tx.total)}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold block">
                      Laba: +{formatRupiah(tx.profit)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Detail Popup */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-3.5 bg-amber-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Detail Transaksi</h4>
                <p className="text-[11px] text-amber-200">{selectedTxDetail.receiptNumber}</p>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              <div className="flex justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Waktu Transaksi</span>
                <span className="font-medium text-stone-800">
                  {new Date(selectedTxDetail.timestamp).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Kasir</span>
                <span className="font-medium text-stone-800">{selectedTxDetail.cashierName}</span>
              </div>

              {/* Items */}
              <div>
                <span className="font-bold text-stone-700 block mb-1.5">Daftar Menu:</span>
                <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                  {selectedTxDetail.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-stone-700">
                      <span>{i.name} (x{i.quantity})</span>
                      <span className="font-semibold">{formatRupiah(i.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-stone-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedTxDetail.subtotal)}</span>
                </div>
                {selectedTxDetail.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon</span>
                    <span>-{formatRupiah(selectedTxDetail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-stone-900 pt-1">
                  <span>Total Bayar</span>
                  <span className="text-amber-900">{formatRupiah(selectedTxDetail.total)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-semibold pt-0.5">
                  <span>Estimasi Laba Kotor</span>
                  <span>+{formatRupiah(selectedTxDetail.profit)}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    const tx = selectedTxDetail;
                    setSelectedTxDetail(null);
                    onViewReceipt(tx);
                  }}
                  className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Ulang Struk Struk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
