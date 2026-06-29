"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  gstRate: number;
  sellingPriceGst: number;
  sellingPriceCash: number;
  hsnCode: string | null;
  unit: string;
  inventory: { quantity: number }[];
}

interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  total: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default function NewSalePage() {
  const router = useRouter();

  const [saleType, setSaleType] = useState<"GST" | "CASH">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [notes, setNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((data) => {
          const products = Array.isArray(data) ? data : [];
          setSearchResults(products);
          setShowSearch(true);
        })
        .catch(() => setSearchResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addToCart = useCallback(
    (product: Product) => {
      const existing = cart.find((c) => c.productId === product.id);
      if (existing) {
        updateQuantity(product.id, existing.quantity + 1);
      } else {
        const unitPrice = saleType === "GST" ? product.sellingPriceGst : product.sellingPriceCash;
        const gstAmt = saleType === "GST" ? (unitPrice * product.gstRate) / 100 : 0;
        setCart((prev) => [
          ...prev,
          {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice,
            gstRate: saleType === "GST" ? product.gstRate : 0,
            gstAmount: gstAmt,
            total: unitPrice + gstAmt,
          },
        ]);
      }
      setSearchQuery("");
      setShowSearch(false);
      searchInputRef.current?.focus();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, saleType]
  );

  function updateQuantity(productId: number, qty: number) {
    if (qty < 1) return removeFromCart(productId);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const lineTotal = item.unitPrice * qty;
        const gstAmt = (lineTotal * item.gstRate) / 100;
        return { ...item, quantity: qty, gstAmount: gstAmt, total: lineTotal + gstAmt };
      })
    );
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  function recalcCartPrices(type: "GST" | "CASH") {
    setCart((prev) =>
      prev.map((item) => {
        const unitPrice = type === "GST" ? item.product.sellingPriceGst : item.product.sellingPriceCash;
        const gstRate = type === "GST" ? item.product.gstRate : 0;
        const lineTotal = unitPrice * item.quantity;
        const gstAmt = (lineTotal * gstRate) / 100;
        return { ...item, unitPrice, gstRate, gstAmount: gstAmt, total: lineTotal + gstAmt };
      })
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const gstAmount = cart.reduce((s, i) => s + i.gstAmount, 0);
  const totalAmount = subtotal + gstAmount - discount;

  async function handleSubmit() {
    if (cart.length === 0) {
      setError("Add at least one product");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: saleType,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerGstin: saleType === "GST" ? customerGstin || null : null,
          discount,
          paymentMode,
          notes: notes || null,
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create sale");
      }
      router.push("/sales?success=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const stock = (p: Product) => p.inventory?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sales" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
            <p className="text-sm text-gray-500">Create a new bill or cash sale</p>
          </div>
        </div>

        {/* Sale Type Toggle */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => { setSaleType("GST"); recalcCartPrices("GST"); }}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              saleType === "GST"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            GST Bill
          </button>
          <button
            onClick={() => { setSaleType("CASH"); recalcCartPrices("CASH"); }}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              saleType === "CASH"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Cash Sale
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column: Product search + Cart */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Customer Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder={saleType === "GST" ? "Customer Name *" : "Customer Name (optional)"}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {saleType === "GST" && (
                <input
                  type="text"
                  placeholder="GSTIN"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:col-span-2"
                />
              )}
            </div>
          </div>

          {/* Product Search */}
          <div ref={searchRef} className="relative">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products by name, SKU, or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="off"
              />
            </div>

            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.name}
                        {p.brand && <span className="ml-1 text-gray-400">({p.brand})</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        SKU: {p.sku} &middot; Stock: {stock(p)} {p.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {fmt(saleType === "GST" ? p.sellingPriceGst : p.sellingPriceCash)}
                      </p>
                      {saleType === "GST" && (
                        <p className="text-xs text-gray-400">+{p.gstRate}% GST</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Cart
                {cart.length > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {cart.length}
                  </span>
                )}
              </h3>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-400">Search and add products above</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Table Header */}
                <div className="hidden grid-cols-12 gap-2 px-4 py-2 text-xs font-medium uppercase text-gray-400 sm:grid">
                  <div className="col-span-4">Product</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  {saleType === "GST" && <div className="col-span-2 text-right">GST</div>}
                  <div className={`text-right ${saleType === "GST" ? "col-span-1" : "col-span-3"}`}>Total</div>
                  <div className="col-span-1" />
                </div>

                {cart.map((item) => (
                  <div key={item.productId} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                    <div className="col-span-12 sm:col-span-4">
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.product.sku}</p>
                    </div>
                    <div className="col-span-4 flex items-center justify-center gap-1 sm:col-span-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                        className="h-7 w-12 rounded-md border border-gray-200 text-center text-sm"
                      />
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="col-span-3 text-right text-sm text-gray-700 sm:col-span-2">
                      {fmt(item.unitPrice)}
                    </div>
                    {saleType === "GST" && (
                      <div className="col-span-2 text-right text-sm text-gray-500">
                        {fmt(item.gstAmount)}
                        <span className="ml-0.5 text-xs text-gray-400">({item.gstRate}%)</span>
                      </div>
                    )}
                    <div className={`text-right text-sm font-semibold text-gray-900 ${saleType === "GST" ? "col-span-2 sm:col-span-1" : "col-span-3 sm:col-span-3"}`}>
                      {fmt(item.total)}
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Summary & Payment */}
        <div className="lg:col-span-2 space-y-4">
          <div className="sticky top-6 space-y-4">
            {/* Order Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Order Summary</h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{fmt(subtotal)}</span>
                </div>

                {saleType === "GST" && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span className="text-blue-600">{fmt(gstAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-gray-600">
                  <span>Discount</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24 rounded-md border border-gray-200 px-2 py-1 text-right text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="border-t border-gray-200 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">{fmt(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Payment Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                {(["CASH", "UPI", "CARD", "CREDIT"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      paymentMode === mode
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {mode === "CASH" && "💵 "}
                    {mode === "UPI" && "📱 "}
                    {mode === "CARD" && "💳 "}
                    {mode === "CREDIT" && "📒 "}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0}
              className="w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing...
                </span>
              ) : (
                `Complete ${saleType === "GST" ? "GST" : "Cash"} Sale — ${fmt(totalAmount)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
