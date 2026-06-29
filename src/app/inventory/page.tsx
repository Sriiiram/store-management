"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  sku: string;
  reorderLevel: number;
}

interface Godown {
  id: string;
  name: string;
}

interface Location {
  id: string;
  code: string;
  godown: Godown;
}

interface InventoryItem {
  id: string;
  productId: string;
  product: Product;
  locationId: string;
  location: Location;
  quantity: number;
  status: "OK" | "Low" | "Out";
}

interface Stats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalItems: 0, lowStockCount: 0, outOfStockCount: 0 });
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [selectedGodown, setSelectedGodown] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedGodown) params.set("godownId", selectedGodown);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setItems(data.items || []);
      setStats(data.stats || { totalItems: 0, lowStockCount: 0, outOfStockCount: 0 });
    } catch {
      console.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  }, [selectedGodown, search]);

  const fetchGodowns = async () => {
    try {
      const res = await fetch("/api/inventory/locations");
      const data = await res.json();
      setGodowns(data.godowns || []);
    } catch {
      console.error("Failed to fetch godowns");
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const statusBadge = (status: "OK" | "Low" | "Out") => {
    const styles = {
      OK: "bg-green-100 text-green-800",
      Low: "bg-yellow-100 text-yellow-800",
      Out: "bg-red-100 text-red-800",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status === "Out" ? "Out of Stock" : status === "Low" ? "Low Stock" : "OK"}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <Link
            href="/inventory/stock-in"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Stock In
          </Link>
          <Link
            href="/inventory/stock-out"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            Stock Out
          </Link>
          <Link
            href="/inventory/locations"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            Locations
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Items in Stock</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalItems.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600">Low Stock Items</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.lowStockCount}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700">{stats.outOfStockCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search product name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={selectedGodown}
          onChange={(e) => setSelectedGodown(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Godowns</option>
          {godowns.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.product.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="font-mono">{item.location.code}</span>
                      <span className="text-xs text-gray-400 ml-1">({item.location.godown.name})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">{item.product.reorderLevel}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
