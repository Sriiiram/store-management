"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface InventoryAtLocation {
  locationId: string;
  locationCode: string;
  godownName: string;
  quantity: number;
}

export default function StockOutPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryAtLocations, setInventoryAtLocations] = useState<InventoryAtLocation[]>([]);

  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/pricing");
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setError("Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!productId) {
      setInventoryAtLocations([]);
      return;
    }
    const fetchStock = async () => {
      setLoadingLocations(true);
      try {
        const res = await fetch(`/api/inventory?search=`);
        const data = await res.json();
        const items = (data.items || [])
          .filter((i: { productId: string }) => i.productId === productId)
          .map((i: { location: { id: string; code: string; godown: { name: string } }; quantity: number }) => ({
            locationId: i.location.id,
            locationCode: i.location.code,
            godownName: i.location.godown.name,
            quantity: i.quantity,
          }));
        setInventoryAtLocations(items);
      } catch {
        setError("Failed to load stock locations");
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchStock();
  }, [productId]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectedLocation = inventoryAtLocations.find((l) => l.locationId === locationId);
  const maxQty = selectedLocation?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!productId || !locationId || !quantity) {
      setError("Please fill in all required fields");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be a positive number");
      return;
    }

    if (qty > maxQty) {
      setError(`Cannot exceed available quantity (${maxQty})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/stock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, locationId, quantity: qty, reference, notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record stock outward");
      }

      setSuccess("Stock outward recorded successfully!");
      setTimeout(() => router.push("/inventory"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="text-gray-500 hover:text-gray-700">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Stock Outward</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
          <input
            type="text"
            placeholder="Search product..."
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setProductId("");
              setLocationId("");
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {productSearch && !productId && (
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.slice(0, 10).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setProductId(p.id);
                    setProductSearch(`${p.name} (${p.sku})`);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                >
                  {p.name} <span className="text-gray-400">({p.sku})</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">No products found</p>
              )}
            </div>
          )}
        </div>

        {/* Location with available stock */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
          {loadingLocations ? (
            <p className="text-sm text-gray-500">Loading available locations...</p>
          ) : !productId ? (
            <p className="text-sm text-gray-400">Select a product first</p>
          ) : inventoryAtLocations.length === 0 ? (
            <p className="text-sm text-red-500">No stock available for this product</p>
          ) : (
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select location</option>
              {inventoryAtLocations.map((l) => (
                <option key={l.locationId} value={l.locationId}>
                  {l.locationCode} ({l.godownName}) — Available: {l.quantity}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity * {maxQty > 0 && <span className="text-gray-400 font-normal">(max: {maxQty})</span>}
          </label>
          <input
            type="number"
            min="1"
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            disabled={!locationId}
          />
        </div>

        {/* Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. Sale invoice, internal use..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !locationId}
          className="w-full py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Recording..." : "Record Stock Outward"}
        </button>
      </form>
    </div>
  );
}
