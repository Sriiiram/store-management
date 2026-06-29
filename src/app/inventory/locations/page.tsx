"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Location {
  id: string;
  code: string;
  rack: string;
  shelf: string;
  zone: string;
  description: string;
}

interface Godown {
  id: string;
  name: string;
  address: string;
  locations: Location[];
}

export default function LocationsPage() {
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Godown form
  const [godownName, setGodownName] = useState("");
  const [godownAddress, setGodownAddress] = useState("");

  // Location form
  const [locGodownId, setLocGodownId] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locRack, setLocRack] = useState("");
  const [locShelf, setLocShelf] = useState("");
  const [locZone, setLocZone] = useState("");

  const fetchGodowns = async () => {
    try {
      const res = await fetch("/api/inventory/locations");
      const data = await res.json();
      setGodowns(data.godowns || []);
    } catch {
      setError("Failed to load godowns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGodowns();
  }, []);

  const handleAddGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!godownName.trim()) {
      setError("Godown name is required");
      return;
    }

    try {
      const res = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "godown", name: godownName.trim(), address: godownAddress.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create godown");
      }

      setSuccess("Godown created successfully!");
      setGodownName("");
      setGodownAddress("");
      fetchGodowns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!locGodownId || !locCode.trim()) {
      setError("Godown and location code are required");
      return;
    }

    try {
      const res = await fetch("/api/inventory/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "location",
          godownId: locGodownId,
          code: locCode.trim(),
          rack: locRack.trim(),
          shelf: locShelf.trim(),
          zone: locZone.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create location");
      }

      setSuccess("Location created successfully!");
      setLocCode("");
      setLocRack("");
      setLocShelf("");
      setLocZone("");
      fetchGodowns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory" className="text-gray-500 hover:text-gray-700">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Godowns & Locations</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Add Godown */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Godown</h2>
          <form onSubmit={handleAddGodown} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={godownName}
                onChange={(e) => setGodownName(e.target.value)}
                placeholder="e.g. Main Warehouse"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={godownAddress}
                onChange={(e) => setGodownAddress(e.target.value)}
                placeholder="e.g. Plot 5, Industrial Area"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Add Godown
            </button>
          </form>
        </div>

        {/* Add Location */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Location</h2>
          <form onSubmit={handleAddLocation} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Godown *</label>
              <select
                value={locGodownId}
                onChange={(e) => setLocGodownId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select godown</option>
                {godowns.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={locCode}
                onChange={(e) => setLocCode(e.target.value)}
                placeholder="e.g. GD1-R2-S3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                <input
                  type="text"
                  value={locRack}
                  onChange={(e) => setLocRack(e.target.value)}
                  placeholder="R2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf</label>
                <input
                  type="text"
                  value={locShelf}
                  onChange={(e) => setLocShelf(e.target.value)}
                  placeholder="S3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
                <input
                  type="text"
                  value={locZone}
                  onChange={(e) => setLocZone(e.target.value)}
                  placeholder="A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Add Location
            </button>
          </form>
        </div>
      </div>

      {/* Godowns List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">All Godowns & Locations</h2>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : godowns.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No godowns created yet.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {godowns.map((godown) => (
              <div key={godown.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{godown.name}</h3>
                  {godown.address && (
                    <span className="text-sm text-gray-500">— {godown.address}</span>
                  )}
                  <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {godown.locations.length} location{godown.locations.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {godown.locations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {godown.locations.map((loc) => (
                      <span
                        key={loc.id}
                        className="inline-flex items-center px-2.5 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-mono"
                        title={`Rack: ${loc.rack}, Shelf: ${loc.shelf}, Zone: ${loc.zone}`}
                      >
                        {loc.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
