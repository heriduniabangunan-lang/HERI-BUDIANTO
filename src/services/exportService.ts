import * as XLSX from "xlsx";
import { Transaction, DailyReport, StoreSettings } from "../types";

export function exportTransactionsToExcel(
  transactions: Transaction[],
  report: DailyReport | null,
  settings: StoreSettings,
  filterName: string = "Harian"
) {
  // Format rows for Excel
  const rows = transactions.map((t, index) => {
    const d = new Date(t.timestamp);
    const dateFormatted = d.toLocaleDateString("id-ID");
    const timeFormatted = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const itemsSummary = t.items.map((i) => `${i.name} (x${i.quantity})`).join(", ");

    return {
      No: index + 1,
      "No. Struk": t.receiptNumber,
      Tanggal: dateFormatted,
      Jam: timeFormatted,
      Kasir: t.cashierName,
      Pelanggan: t.customerName || "-",
      "Daftar Menu Dibeli": itemsSummary,
      "Metode Pembayaran": t.paymentMethod.toUpperCase(),
      "Subtotal (Rp)": t.subtotal,
      "Diskon (Rp)": t.discount,
      "Total Omset (Rp)": t.total,
      "Total Modal (Rp)": t.costTotal,
      "Laba Kotor (Rp)": t.profit,
    };
  });

  const totalOmset = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalModal = transactions.reduce((acc, t) => acc + t.costTotal, 0);
  const totalLaba = totalOmset - totalModal;

  // Add Summary row
  rows.push({
    No: "" as unknown as number,
    "No. Struk": "TOTAL REKAP",
    Tanggal: "",
    Jam: "",
    Kasir: "",
    Pelanggan: "",
    "Daftar Menu Dibeli": `Total ${transactions.length} Transaksi`,
    "Metode Pembayaran": "",
    "Subtotal (Rp)": totalOmset,
    "Diskon (Rp)": 0,
    "Total Omset (Rp)": totalOmset,
    "Total Modal (Rp)": totalModal,
    "Laba Kotor (Rp)": totalLaba,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 5 },  // No
    { wch: 15 }, // Struk
    { wch: 12 }, // Tanggal
    { wch: 8 },  // Jam
    { wch: 14 }, // Kasir
    { wch: 16 }, // Pelanggan
    { wch: 35 }, // Items
    { wch: 14 }, // Metode
    { wch: 15 }, // Subtotal
    { wch: 12 }, // Diskon
    { wch: 16 }, // Total Omset
    { wch: 16 }, // Modal
    { wch: 16 }, // Laba
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");

  const todayStr = new Date().toISOString().split("T")[0];
  const fileName = `Laporan_Penjualan_${settings.storeName.replace(/\s+/g, "_")}_${filterName}_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

export function printOrExportPdf(
  transactions: Transaction[],
  report: DailyReport | null,
  settings: StoreSettings,
  filterName: string = "Hari Ini"
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Mohon izinkan pop-up untuk mencetak atau menyimpan laporan PDF.");
    return;
  }

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const totalOmset = transactions.reduce((acc, t) => acc + t.total, 0);
  const totalModal = transactions.reduce((acc, t) => acc + t.costTotal, 0);
  const totalLaba = totalOmset - totalModal;

  const rowsHtml = transactions
    .map((t, idx) => {
      const d = new Date(t.timestamp);
      const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const items = t.items.map((i) => `${i.name} (${i.quantity}x)`).join(", ");
      return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: 600;">${t.receiptNumber}</td>
        <td style="padding: 8px;">${time}</td>
        <td style="padding: 8px;">${items}</td>
        <td style="padding: 8px; text-transform: uppercase;">${t.paymentMethod}</td>
        <td style="padding: 8px; text-align: right;">${formatRupiah(t.total)}</td>
        <td style="padding: 8px; text-align: right; color: #16a34a;">${formatRupiah(t.profit)}</td>
      </tr>
    `;
    })
    .join("");

  const topItemsHtml = (report?.topSelling || [])
    .map(
      (item, i) => `
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">
      <span>${i + 1}. ${item.name}</span>
      <strong>${item.qty} porsi (${formatRupiah(item.totalSales)})</strong>
    </div>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Penjualan - ${settings.storeName}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          margin: 20px;
          font-size: 13px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #b45309;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: #78350f;
          font-size: 24px;
        }
        .header p {
          margin: 4px 0;
          color: #666;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #fdfaf6;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 10px 14px;
          text-align: center;
        }
        .stat-label {
          font-size: 11px;
          color: #78350f;
          text-transform: uppercase;
          font-weight: 600;
        }
        .stat-val {
          font-size: 16px;
          font-weight: bold;
          color: #1f2937;
          margin-top: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th {
          background-color: #fef3c7;
          color: #78350f;
          padding: 10px 8px;
          text-align: left;
          font-size: 12px;
          border-bottom: 2px solid #f59e0b;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 11px;
          color: #888;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="background: #b45309; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
          🖨️ Cetak / Simpan PDF
        </button>
      </div>

      <div class="header">
        <h1>${settings.storeName}</h1>
        <p>${settings.tagline}</p>
        <p>${settings.address} | Telp: ${settings.phone}</p>
        <p style="margin-top: 8px; font-weight: bold; color: #b45309;">
          LAPORAN PENJUALAN (${filterName.toUpperCase()}) - ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}
        </p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Omset</div>
          <div class="stat-val">${formatRupiah(totalOmset)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Modal</div>
          <div class="stat-val">${formatRupiah(totalModal)}</div>
        </div>
        <div class="stat-card" style="border-color: #86efac; background: #f0fdf4;">
          <div class="stat-label" style="color: #15803d;">Estimasi Laba Kotor</div>
          <div class="stat-val" style="color: #16a34a;">${formatRupiah(totalLaba)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Transaksi</div>
          <div class="stat-val">${transactions.length} Struk</div>
        </div>
      </div>

      ${
        topItemsHtml
          ? `
        <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
          <strong style="color: #44403c; display: block; margin-bottom: 6px;">Menu Paling Laris:</strong>
          ${topItemsHtml}
        </div>
      `
          : ""
      }

      <table>
        <thead>
          <tr>
            <th style="text-align: center; width: 30px;">No</th>
            <th>No. Struk</th>
            <th>Waktu</th>
            <th>Menu Terjual</th>
            <th>Bayar</th>
            <th style="text-align: right;">Total Omset</th>
            <th style="text-align: right;">Laba</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold; background: #fffbeb;">
            <td colspan="5" style="padding: 10px 8px; text-align: right;">TOTAL:</td>
            <td style="padding: 10px 8px; text-align: right; color: #b45309;">${formatRupiah(totalOmset)}</td>
            <td style="padding: 10px 8px; text-align: right; color: #16a34a;">${formatRupiah(totalLaba)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        <p>Dicetak otomatis oleh Sistem Kasir Android - ${settings.storeName}</p>
        <p>${new Date().toLocaleString("id-ID")}</p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
