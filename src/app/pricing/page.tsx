"use client";

import { useEffect, useState, useMemo } from "react";

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  costPrice: number;
  mrp: number;
  sellingPriceGst: number;
  sellingPriceCash: number;
  minMarginPct: number;
  marginPct: number;
}

type SortField = "name" | "sku" | "costPrice" | "mrp" | "sellingPriceGst" | "sellingPriceCash" | "marginPct";
type SortDir = "asc" | "desc";

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Inline edit state
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/pricing?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      console.error("Failed to fetch pricing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  const categories = useMemo(() => {
    const brands = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(brands).sort();
  }, [products]);

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [products, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const startEdit = (productId: string, field: string, currentValue: number) => {
    setEditingCell({ productId, field });
    setEditValue(currentValue.toString());
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    setSaving(true);

    try {
      const res = await fetch("/api/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: editingCell.productId,
          field: editingCell.field,
          value: editValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update price");
        return;
      }

      // Refresh data
      await fetchProducts();
      cancelEdit();
    } catch {
      alert("Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  const formatCurrency = (val: number) =>
    `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  const renderPriceCell = (product: Product, field: "costPrice" | "mrp" | "sellingPriceGst" | "sellingPriceCash") => {
    const isEditing = editingCell?.productId === product.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
          autoFocus
          disabled={saving}
          className="w-24 px-1.5 py-0.5 border border-primary-400 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      );
    }

    return (
      <button
        onClick={() => startEdit(product.id, field, product[field])}
        className="text-right w-full hover:bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
        title="Click to edit"
      >
        {formatCurrency(product[field])}
      </button>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Price List</h1>
        <button
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 border border-gray-300"
          title="Export CSV (coming soon)"
          disabled
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, SKU, or brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Brands</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500 mb-2">Click any price cell to edit inline. Press Enter to save, Escape to cancel.</p>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Product {sortIcon("name")}
                </th>
                <th
                  onClick={() => handleSort("sku")}
                  className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  SKU {sortIcon("sku")}
                </th>
                <th
                  onClick={() => handleSort("costPrice")}
                  className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Cost {sortIcon("costPrice")}
                </th>
                <th
                  onClick={() => handleSort("mrp")}
                  className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  MRP {sortIcon("mrp")}
                </th>
                <th
                  onClick={() => handleSort("sellingPriceGst")}
                  className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Selling (GST) {sortIcon("sellingPriceGst")}
                </th>
                <th
                  onClick={() => handleSort("sellingPriceCash")}
                  className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Selling (Cash) {sortIcon("sellingPriceCash")}
                </th>
                <th
                  onClick={() => handleSort("marginPct")}
                  className="px-3 py-2.5 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Margin % {sortIcon("marginPct")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No products found.</td>
                </tr>
              ) : (
                sorted.map((p) => {
                  const marginLow = p.marginPct < p.minMarginPct;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{p.name}</td>
                      <td className="px-3 py-2 text-gray-600 font-mono text-xs">{p.sku}</td>
                      <td className="px-3 py-2 text-right">{renderPriceCell(p, "costPrice")}</td>
                      <td className="px-3 py-2 text-right">{renderPriceCell(p, "mrp")}</td>
                      <td className="px-3 py-2 text-right">{renderPriceCell(p, "sellingPriceGst")}</td>
                      <td className="px-3 py-2 text-right">{renderPriceCell(p, "sellingPriceCash")}</td>
                      <td className={`px-3 py-2 text-right font-medium ${marginLow ? "text-red-600" : "text-gray-700"}`}>
                        {p.marginPct.toFixed(1)}%
                        {marginLow && (
                          <span className="ml-1 text-xs" title={`Min: ${p.minMarginPct}%`}>⚠</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
