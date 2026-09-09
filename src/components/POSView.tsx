import React, { useState, useMemo } from "react";
import { Product, CartItem, Transaction, Category, StoreSettings, PaymentMethod } from "../types";
import { audioAlert } from "../services/audioAlert";
import {
  Search,
  ScanBarcode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  CreditCard,
  QrCode,
  Banknote,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  User,
  Tag
} from "lucide-react";

interface POSViewProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  onOpenScanner: () => void;
  onCompleteTransaction: (tx: Transaction) => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  settings,
  onOpenScanner,
  onCompleteTransaction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>("");
  const [orderNote, setOrderNote] = useState<string>("");

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  // Filter products by category & search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Add to cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0 && !settings.allowNegativeStock) {
      audioAlert.playWarningAlert();
      alert(`Stok untuk "${product.name}" sudah habis! Silakan lakukan restok terlebih dahulu.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock && !settings.allowNegativeStock) {
          audioAlert.playWarningAlert();
          alert(`Jumlah di keranjang sudah mencapai sisa stok produk (${product.stock} pcs).`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.product.sellingPrice,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            subtotal: product.sellingPrice,
          },
        ];
      }
    });

    audioAlert.playScanBeep();
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;

            if (newQty > item.product.stock && !settings.allowNegativeStock && delta > 0) {
              alert(`Jumlah melebihi stok barang yang ada (${item.product.stock} pcs).`);
              return item;
            }

            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.product.sellingPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Kosongkan keranjang belanja?")) {
      setCart([]);
      setIsCartOpen(false);
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    setCashAmount(cartTotal);
    setIsCheckoutOpen(true);
  };

  const handleProcessPayment = () => {
    if (paymentMethod === "cash" && cashAmount < cartTotal) {
      alert("Jumlah uang tunai kurang dari total belanja!");
      return;
    }

    const now = Date.now();
    const receiptNumber = `KTM-${now.toString().slice(-6)}`;

    const transactionItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.sellingPrice,
      costPrice: item.product.costPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    const costTotal = transactionItems.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);

    const newTx: Transaction = {
      id: `tx-${now}`,
      receiptNumber,
      date: new Date(now).toISOString(),
      timestamp: now,
      items: transactionItems,
      subtotal: cartSubtotal,
      discount: discountAmount,
      total: cartTotal,
      costTotal,
      profit: cartTotal - costTotal,
      paymentMethod,
      cashPaid: paymentMethod === "cash" ? cashAmount : cartTotal,
      change: paymentMethod === "cash" ? Math.max(0, cashAmount - cartTotal) : 0,
      customerName: customerName.trim() || "Pelanggan Teras",
      note: orderNote.trim(),
      cashierName: settings.cashierName || "Kasir Mamih",
    };

    audioAlert.playSuccessChime();

    // Reset local checkout state
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setDiscountAmount(0);
    setCustomerName("");
    setOrderNote("");

    // Notify parent
    onCompleteTransaction(newTx);
  };

  // Quick cash amount presets
  const quickCashPresets = useMemo(() => {
    if (cartTotal === 0) return [];
    const presets = [cartTotal];
    const roundedUp10k = Math.ceil(cartTotal / 10000) * 10000;
    const roundedUp20k = Math.ceil(cartTotal / 20000) * 20000;
    const roundedUp50k = Math.ceil(cartTotal / 50000) * 50000;
    const roundedUp100k = Math.ceil(cartTotal / 100000) * 100000;

    [roundedUp10k, roundedUp20k, roundedUp50k, roundedUp100k].forEach((val) => {
      if (val > cartTotal && !presets.includes(val)) {
        presets.push(val);
      }
    });

    if (!presets.includes(50000) && cartTotal < 50000) presets.push(50000);
    if (!presets.includes(100000) && cartTotal < 100000) presets.push(100000);

    return presets.sort((a, b) => a - b).slice(0, 5);
  }, [cartTotal]);

  return (
    <div className="flex flex-col lg:flex-row h-full max-w-7xl mx-auto pb-20 lg:pb-6">
      {/* LEFT COLUMN: Product Catalog */}
      <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-4 gap-3">
        {/* Search & Barcode Header Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-pos-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jajanan, minuman, atau ketik barcode..."
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            id="btn-pos-scan-camera"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition shrink-0"
            title="Buka Scanner Barcode Kamera"
          >
            <ScanBarcode className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Pindai</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              id={`cat-pill-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-2xs ${
                selectedCategory === cat.id
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 active:scale-95"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white/70 rounded-2xl border border-dashed border-stone-300 p-6">
              <ShoppingBag className="w-12 h-12 text-amber-900/30 mx-auto mb-3" />
              <h4 className="font-bold text-stone-700 text-sm">Tidak ada menu yang cocok</h4>
              <p className="text-xs text-stone-500 mt-1">Coba gunakan kata kunci pencarian atau kategori lain</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock <= product.minStock && product.stock > 0;

                return (
                  <div
                    key={product.id}
                    id={`product-card-${product.id}`}
                    onClick={() => handleAddToCart(product)}
                    className={`group relative bg-white border rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer shadow-xs hover:shadow-md active:scale-98 ${
                      isOutOfStock
                        ? "border-stone-200 opacity-60 grayscale-[40%]"
                        : inCart
                        ? "border-amber-600 ring-2 ring-amber-500/20"
                        : "border-stone-200/90 hover:border-amber-300"
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
                      <img
                        src={product.imageUrl || "/logo.jpg"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.jpg";
                        }}
                      />

                      {/* Stock Badge Overlay */}
                      <div className="absolute top-2 left-2">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
                            HABIS
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-xs text-stone-950 text-[10px] font-bold shadow-xs">
                            Sisa {product.stock}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-stone-900/60 backdrop-blur-xs text-stone-200 text-[10px] font-medium">
                            Stok: {product.stock}
                          </span>
                        )}
                      </div>

                      {/* In Cart Count Badge */}
                      {inCart && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-black flex items-center justify-center shadow-md animate-in zoom-in-50">
                          {inCart.quantity}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-stone-800 line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                        <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                          {product.barcode}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-stone-100">
                        <span className="font-extrabold text-xs sm:text-sm text-amber-900">
                          {formatRupiah(product.sellingPrice)}
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium">/{product.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING BOTTOM CART BAR (Mobile Only) */}
      <div className="lg:hidden fixed bottom-15 left-0 right-0 p-3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-20">
        {cart.length > 0 && (
          <button
            id="btn-open-cart-drawer"
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full max-w-md mx-auto flex items-center justify-between p-3.5 bg-amber-900 hover:bg-amber-950 text-white rounded-2xl shadow-xl border border-amber-700/80 transition active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-800 flex items-center justify-center text-amber-200 font-bold text-xs">
                {cartItemCount}
              </div>
              <div className="text-left">
                <span className="text-xs text-amber-200 block font-medium">Keranjang Pesanan</span>
                <span className="text-sm font-black">{formatRupiah(cartTotal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-amber-600 px-3 py-1.5 rounded-xl text-white">
              <span>Buka Kasir</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        )}
      </div>

      {/* RIGHT COLUMN: Persistent Cart Panel on Tablet/Desktop & Slide Drawer on Mobile */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out lg:static lg:w-80 xl:w-96 lg:shadow-md lg:rounded-2xl lg:m-4 lg:border lg:border-stone-200 ${
          isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Cart Header */}
        <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-800" />
            <h3 className="font-bold text-sm text-stone-800">Keranjang Kasir</h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              {cartItemCount} item
            </span>
          </div>

          <div className="flex items-center gap-1">
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-stone-100 transition text-xs flex items-center gap-1"
                title="Kosongkan Keranjang"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <ShoppingBag className="w-12 h-12 stroke-1 text-stone-300 mb-2" />
              <p className="text-xs font-medium">Keranjang masih kosong</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Pilih menu di samping atau scan barcode jajanan
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-stone-50/90 border border-stone-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-stone-800 truncate">{item.product.name}</h5>
                  <span className="text-[11px] text-amber-900 font-semibold block">
                    {formatRupiah(item.product.sellingPrice)}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0 bg-white border border-stone-200 rounded-lg p-0.5">
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, -1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-stone-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-stone-600 hover:bg-stone-100 active:bg-stone-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="text-right shrink-0 min-w-16">
                  <span className="text-xs font-extrabold text-stone-800 block">
                    {formatRupiah(item.subtotal)}
                  </span>
                  <button
                    onClick={() => handleRemoveFromCart(item.product.id)}
                    className="text-[10px] text-stone-400 hover:text-rose-500"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        {cart.length > 0 && (
          <div className="p-3.5 border-t border-stone-200 bg-stone-50/80 space-y-2.5">
            {/* Quick Note & Discount Toggle */}
            <div className="flex gap-2 text-xs">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="Diskon (Rp)..."
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-7 pr-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="relative flex-1">
                <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nama Pelanggan..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs placeholder-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Calculations */}
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{formatRupiah(cartSubtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Potongan Diskon</span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm sm:text-base text-stone-900 pt-1 border-t border-stone-200">
                <span>Total Bayar</span>
                <span className="text-amber-900">{formatRupiah(cartTotal)}</span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              id="btn-process-checkout"
              onClick={openCheckout}
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-98"
            >
              <CreditCard className="w-4 h-4" />
              <span>Bayar {formatRupiah(cartTotal)}</span>
            </button>
          </div>
        )}
      </div>

      {/* CHECKOUT & PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-3.5 bg-amber-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Pembayaran Kasir</h3>
                <p className="text-[11px] text-amber-200">Pilih metode & nominal pembayaran</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-amber-200 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Total Due Banner */}
              <div className="text-center p-3.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-900 font-semibold block">Total Tagihan Belanja</span>
                <span className="text-2xl sm:text-3xl font-black text-amber-950 block mt-0.5">
                  {formatRupiah(cartTotal)}
                </span>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  {cartItemCount} item jajanan & minuman
                </span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-2">Metode Pembayaran</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === "cash"
                        ? "bg-amber-100 border-amber-600 text-amber-950 font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <Banknote className="w-5 h-5 text-amber-800" />
                    <span className="text-[11px]">Tunai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("qris")}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === "qris"
                        ? "bg-amber-100 border-amber-600 text-amber-950 font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-amber-800" />
                    <span className="text-[11px]">QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === "transfer"
                        ? "bg-amber-100 border-amber-600 text-amber-950 font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-amber-800" />
                    <span className="text-[11px]">Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("debt")}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      paymentMethod === "debt"
                        ? "bg-amber-100 border-amber-600 text-amber-950 font-bold"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-amber-800" />
                    <span className="text-[11px]">Catat Hutang</span>
                  </button>
                </div>
              </div>

              {/* Cash Input & Quick Presets */}
              {paymentMethod === "cash" && (
                <div className="space-y-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      id="input-cash-amount"
                      type="number"
                      value={cashAmount || ""}
                      onChange={(e) => setCashAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-base sm:text-lg font-bold bg-white border border-stone-300 rounded-xl text-stone-800 focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  {/* Quick Cash Presets */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                      Nominal Cepat:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCashAmount(cartTotal)}
                        className="px-2.5 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 shadow-2xs"
                      >
                        Uang Pas
                      </button>
                      {quickCashPresets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashAmount(val)}
                          className="px-2.5 py-1 bg-white border border-stone-200 text-stone-700 rounded-lg text-xs font-medium hover:bg-stone-100 shadow-2xs"
                        >
                          {formatRupiah(val)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kembalian Calculation */}
                  <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-700">Kembalian:</span>
                    <span
                      className={`font-black text-sm sm:text-base ${
                        cashAmount >= cartTotal ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {cashAmount >= cartTotal
                        ? formatRupiah(cashAmount - cartTotal)
                        : `Kurang ${formatRupiah(cartTotal - cashAmount)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS Display */}
              {paymentMethod === "qris" && (
                <div className="text-center p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl mx-auto border-2 border-stone-300 flex items-center justify-center shadow-xs">
                    <QrCode className="w-32 h-32 text-stone-900" />
                  </div>
                  <span className="text-xs font-bold text-stone-800 block">QRIS KEDAI TERAS MAMIH</span>
                  <p className="text-[10px] text-stone-500">
                    Scan via BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, atau DANA
                  </p>
                </div>
              )}

              {/* Transfer Info */}
              {paymentMethod === "transfer" && (
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 text-stone-700">
                  <p className="font-bold text-amber-900">Rekening Resmi Kedai Teras Mamih:</p>
                  <p>• BCA: <strong>123-456-7890</strong> (a.n Mamih Suhaeti)</p>
                  <p>• DANA / OVO: <strong>0812-3456-7890</strong></p>
                  <p className="text-[10px] text-stone-500 pt-1">Pastikan dana telah masuk sebelum cetak struk.</p>
                </div>
              )}

              {/* Debt Note */}
              {paymentMethod === "debt" && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-1.5 text-rose-800">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Catat Bon / Kasbon Pelanggan</span>
                  </div>
                  <p className="text-[11px]">
                    Pastikan nama pelanggan diisi dengan jelas untuk rekapan piutang warung.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Payment Action Button */}
            <div className="p-3.5 bg-stone-50 border-t border-stone-200">
              <button
                id="btn-confirm-transaction"
                onClick={handleProcessPayment}
                disabled={paymentMethod === "cash" && cashAmount < cartTotal}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Selesaikan & Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
