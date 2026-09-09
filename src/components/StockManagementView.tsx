import React, { useState, useMemo } from "react";
import { Product, Category } from "../types";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingUp,
  Boxes,
  Barcode,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  DollarSign
} from "lucide-react";

interface StockManagementViewProps {
  products: Product[];
  categories: Category[];
  onSaveProduct: (product: Partial<Product> & { id?: string }) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onRestockProduct: (id: string, addedQty: number, reason?: string) => Promise<void>;
  onOpenScanner: () => void;
}

const PRESET_SNACK_IMAGES = [
  { name: "Gorengan / Cireng", url: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500&auto=format&fit=crop&q=60" },
  { name: "Cilok / Kuah Pedas", url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60" },
  { name: "Tahu Gejrot", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60" },
  { name: "Seblak Pedas", url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60" },
  { name: "Dimsum Kukus", url: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&auto=format&fit=crop&q=60" },
  { name: "Pisang Bakar Keju", url: "https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&auto=format&fit=crop&q=60" },
  { name: "Sosis Bakar", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60" },
  { name: "Risol Mayo", url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=60" },
  { name: "Es Teh Manis", url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60" },
  { name: "Es Kopi Susu", url: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=60" },
  { name: "Es Cincau Susu", url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60" },
  { name: "Paket Makanan", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60" },
];

export const StockManagementView: React.FC<StockManagementViewProps> = ({
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onRestockProduct,
}) => {
  const [search, setSearch] = useState<string>("");
  const [filterStock, setFilterStock] = useState<"all" | "low" | "out">("all");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  // Add / Edit Product modal
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Restock Modal
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockReason, setRestockReason] = useState<string>("Belanja Stok Harian");

  // Form states
  const [formName, setFormName] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("makanan");
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formBarcode, setFormBarcode] = useState<string>("");
  const [formImageUrl, setFormImageUrl] = useState<string>("/logo.jpg");
  const [formUnit, setFormUnit] = useState<string>("porsi");

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === "all" || p.category === selectedCat;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());

      let matchStock = true;
      if (filterStock === "low") {
        matchStock = p.stock <= p.minStock && p.stock > 0;
      } else if (filterStock === "out") {
        matchStock = p.stock === 0;
      }

      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCat, search, filterStock]);

  // Overall Inventory Stats
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalStockQty = products.reduce((acc, p) => acc + p.stock, 0);
    const totalAssetValue = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
    const totalPotentialRevenue = products.reduce((acc, p) => acc + p.stock * p.sellingPrice, 0);
    const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    return {
      totalItems,
      totalStockQty,
      totalAssetValue,
      totalPotentialRevenue,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategory("makanan");
    setFormCostPrice(4000);
    setFormSellingPrice(8000);
    setFormStock(20);
    setFormMinStock(5);
    setFormBarcode(`899${Date.now().toString().slice(-7)}`);
    setFormImageUrl("/logo.jpg");
    setFormUnit("porsi");
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormCostPrice(product.costPrice);
    setFormSellingPrice(product.sellingPrice);
    setFormStock(product.stock);
    setFormMinStock(product.minStock);
    setFormBarcode(product.barcode);
    setFormImageUrl(product.imageUrl);
    setFormUnit(product.unit);
    setIsFormOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Nama produk wajib diisi!");
      return;
    }

    const payload: Partial<Product> & { id?: string } = {
      name: formName.trim(),
      category: formCategory,
      costPrice: Number(formCostPrice) || 0,
      sellingPrice: Number(formSellingPrice) || 0,
      stock: Number(formStock) || 0,
      minStock: Number(formMinStock) || 5,
      barcode: formBarcode.trim() || `${Date.now()}`,
      imageUrl: formImageUrl || "/logo.jpg",
      unit: formUnit || "pcs",
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
    }

    await onSaveProduct(payload);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus menu "${name}" dari sistem stok?`)) {
      await onDeleteProduct(id);
    }
  };

  const handleApplyRestock = async () => {
    if (!restockProduct) return;
    const qty = Number(restockQty);
    if (isNaN(qty) || qty <= 0) {
      alert("Masukkan jumlah restok yang valid!");
      return;
    }

    await onRestockProduct(restockProduct.id, qty, restockReason);
    setRestockProduct(null);
  };

  // Generate unique barcode number
  const handleGenerateBarcode = () => {
    const randomCode = `899${Math.floor(1000000 + Math.random() * 9000000)}`;
    setFormBarcode(randomCode);
  };

  // Image Upload handler (supports photo from camera/file)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFormImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 pb-24 space-y-4">
      {/* Top Banner: Inventory Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Menu</span>
            <Package className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-stone-800">
            {stats.totalItems} <span className="text-xs text-stone-400 font-normal">produk</span>
          </div>
          <span className="text-[10px] text-stone-500">{stats.totalStockQty} unit fisik di kedai</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Nilai Modal Stok</span>
            <DollarSign className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-900 truncate">
            {formatRupiah(stats.totalAssetValue)}
          </div>
          <span className="text-[10px] text-stone-500">Aset bahan baku berjalan</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-600">
            {stats.lowStockCount} <span className="text-xs font-normal">menu</span>
          </div>
          <span className="text-[10px] text-amber-700">Perlu belanja bahan segera</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Stok Habis</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-rose-600">
            {stats.outOfStockCount} <span className="text-xs font-normal">menu</span>
          </div>
          <span className="text-[10px] text-rose-700">Tidak dapat dijual di POS</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Tambah Produk Button */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-stock-search"
              type="text"
              placeholder="Cari berdasarkan nama jajanan atau barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            id="btn-add-product"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu Baru</span>
          </button>
        </div>

        {/* Filter Badges (All, Stok Menipis, Habis) & Categories */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
          <div className="flex gap-1">
            <button
              onClick={() => setFilterStock("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterStock === "all"
                  ? "bg-amber-800 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setFilterStock("low")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterStock === "low"
                  ? "bg-amber-500 text-stone-950"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Menipis ({stats.lowStockCount})
            </button>
            <button
              onClick={() => setFilterStock("out")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterStock === "out"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100"
              }`}
            >
              Habis ({stats.outOfStockCount})
            </button>
          </div>

          <div className="h-5 w-px bg-stone-200 mx-1 hidden sm:block" />

          {/* Category Dropdown */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-2.5 py-1 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-700 font-medium focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.filter((c) => c.id !== "all").map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product List Table / Grid */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300">
            <Boxes className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-600">Tidak ada produk ditemukan</p>
            <p className="text-xs text-stone-400 mt-0.5">Silakan tambah produk baru atau ubah filter pencarian</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isOut = product.stock === 0;
            const isLow = product.stock <= product.minStock && !isOut;
            const margin = product.sellingPrice - product.costPrice;
            const marginPct = product.costPrice > 0 ? Math.round((margin / product.costPrice) * 100) : 100;

            return (
              <div
                key={product.id}
                id={`stock-item-${product.id}`}
                className={`bg-white border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition ${
                  isOut
                    ? "border-rose-300 bg-rose-50/20"
                    : isLow
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-stone-200"
                }`}
              >
                {/* Product Info with Image */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                    <img
                      src={product.imageUrl || "/logo.jpg"}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.jpg";
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-stone-900 truncate">{product.name}</h4>
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stok Habis
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stok Kritis
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Stok Aman
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap font-mono">
                      <span>Barcode: {product.barcode}</span>
                      <span>•</span>
                      <span className="capitalize">{product.category}</span>
                    </div>

                    {/* Cost & Selling Price info */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="text-stone-500">
                        Modal: <strong>{formatRupiah(product.costPrice)}</strong>
                      </span>
                      <span>→</span>
                      <span className="text-amber-900 font-bold">
                        Jual: <strong>{formatRupiah(product.sellingPrice)}</strong>
                      </span>
                      <span className="text-[11px] text-emerald-600 font-semibold">
                        (+{formatRupiah(margin)} / {marginPct}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock Level & Action Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {/* Current Stock */}
                  <div className="text-left sm:text-right">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-lg sm:text-xl font-black ${
                          isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-stone-800"
                        }`}
                      >
                        {product.stock}
                      </span>
                      <span className="text-xs text-stone-500">{product.unit}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 block">Min. {product.minStock} pcs</span>
                  </div>

                  {/* Quick Restock Button */}
                  <button
                    onClick={() => {
                      setRestockProduct(product);
                      setRestockQty(10);
                    }}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restok</span>
                  </button>

                  {/* Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="p-2 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                      title="Edit Menu"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Menu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl my-auto border border-stone-200">
            <div className="p-3.5 bg-amber-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct ? "Edit Data Menu" : "Tambah Menu Jajanan Baru"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Nama Produk / Jajanan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cireng Isi Ayam Pedas"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none"
                  >
                    <option value="makanan">Jajanan & Gorengan</option>
                    <option value="minuman">Minuman Segar</option>
                    <option value="cemilan">Cemilan & Dimsum</option>
                    <option value="paket">Paket Hemat</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="porsi / cup / pcs"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cost Price & Selling Price */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCostPrice || ""}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formSellingPrice || ""}
                    onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-amber-600 font-bold text-amber-900"
                  />
                </div>
              </div>

              {/* Profit preview */}
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs text-emerald-800">
                <span>Estimasi Laba per Porsi:</span>
                <strong>
                  {formatRupiah(Math.max(0, formSellingPrice - formCostPrice))}
                </strong>
              </div>

              {/* Initial Stock & Min Stock Alert */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Jumlah Stok Saat Ini</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Batas Minimum Stok (Alert)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Barcode with Auto Generate */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Barcode / Kode Batang</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan atau ketik kode barcode..."
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="px-2.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1"
                    title="Buat kode unik otomatis"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Auto</span>
                  </button>
                </div>
              </div>

              {/* Product Photo: Upload & Preset Jajanan */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Foto / Gambar Menu</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Foto / Kamera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Atau masukkan URL gambar..."
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Preset image picker */}
                <div className="mt-2">
                  <span className="text-[10px] text-stone-400 block mb-1">Preset Foto Jajanan Teras:</span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_SNACK_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormImageUrl(preset.url)}
                        className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-stone-200 hover:border-amber-600 focus:border-amber-600 transition"
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  {editingProduct ? "Simpan Perubahan" : "Tambahkan ke Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK RESTOCK */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-3.5 bg-amber-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Restok Barang</h3>
                <p className="text-[11px] text-amber-200">{restockProduct.name}</p>
              </div>
              <button onClick={() => setRestockProduct(null)} className="p-1 text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                <span>Stok Sekarang:</span>
                <span className="font-bold text-sm text-stone-800">
                  {restockProduct.stock} {restockProduct.unit}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Jumlah Tambahan Stok ({restockProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-lg font-black text-amber-900 text-center focus:outline-none focus:border-amber-600"
                />

                {/* Quick Add Buttons */}
                <div className="flex justify-center gap-1.5 mt-2">
                  {[5, 10, 20, 50].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setRestockQty(qty)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold"
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Catatan / Sumber Restok</label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="Misal: Belanja Pasar Pagi / Bikin Adonan Baru"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleApplyRestock}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Konfirmasi Tambah Stok (+{restockQty})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
