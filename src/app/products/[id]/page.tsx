"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Category { id: number; name: string }
interface Supplier { id: number; name: string; phone: string | null; gstin: string | null }
interface Godown { id: number; name: string }
interface Location { id: number; code: string; godown: Godown }
interface InventoryItem { id: number; quantity: number; location: Location }
interface PriceHistory {
  id: number;
  field: string;
  oldValue: number;
  newValue: number;
  changedAt: string;
}
interface Knowledge {
  whatItDoes: string | null;
  whatItCantDo: string | null;
  bestFor: string | null;
  notSuitableFor: string | null;
  keySpecs: string | null;
  commonQuestions: string | null;
  accessories: string | null;
  alternatives: string | null;
  proTips: string | null;
}
interface Product {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  categoryId: number;
  category: Category;
  hsnCode: string | null;
  unit: string;
  gstRate: number;
  description: string | null;
  costPrice: number;
  mrp: number;
  sellingPriceGst: number;
  sellingPriceCash: number;
  minMarginPct: number;
  reorderLevel: number;
  maxStock: number;
  supplierId: number | null;
  supplier: Supplier | null;
  knowledge: Knowledge | null;
  inventory: InventoryItem[];
  priceHistory: PriceHistory[];
  createdAt: string;
  updatedAt: string;
}

function KnowledgeCard({ title, icon, content }: { title: string; icon: string; content: string | null }) {
  if (!content) return null;
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <span>{icon}</span>
        {title}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-blue-800">{content}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  costPrice: "Cost Price",
  mrp: "MRP",
  sellingPriceGst: "Selling (GST)",
  sellingPriceCash: "Selling (Cash)",
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error();
      setProduct(await res.json());
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/products");
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-xl font-bold text-gray-900">Product not found</h2>
        <p className="mt-2 text-sm text-gray-500">This product may have been deleted.</p>
        <Link href="/products" className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-800">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const totalStock = product.inventory.reduce((s, i) => s + i.quantity, 0);
  const k = product.knowledge;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Products
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            <span className="font-mono">{product.sku}</span>
            {product.brand && <> · {product.brand}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/products/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Product?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will permanently remove <strong>{product.name}</strong> and all its related data. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Left Column - Product Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
            {product.description && (
              <p className="mt-2 text-sm text-gray-600">{product.description}</p>
            )}
            <div className="mt-4 grid gap-0 sm:grid-cols-2">
              <div className="pr-4 sm:border-r sm:border-gray-100">
                <InfoRow label="Category" value={product.category.name} />
                <InfoRow label="HSN Code" value={product.hsnCode || "—"} />
                <InfoRow label="Unit" value={product.unit} />
                <InfoRow label="GST Rate" value={`${product.gstRate}%`} />
              </div>
              <div className="sm:pl-4">
                <InfoRow label="Supplier" value={product.supplier?.name || "—"} />
                <InfoRow label="Reorder Level" value={product.reorderLevel} />
                <InfoRow label="Max Stock" value={product.maxStock} />
                <InfoRow label="Total Stock" value={
                  <span className={totalStock <= product.reorderLevel ? "text-red-600" : "text-green-600"}>
                    {totalStock} {product.unit}
                  </span>
                } />
              </div>
            </div>
          </div>

          {/* Knowledge Base */}
          {k && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-900">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                Product Knowledge Base
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <KnowledgeCard icon="✅" title="What It Does" content={k.whatItDoes} />
                <KnowledgeCard icon="⚠️" title="What It Can't Do" content={k.whatItCantDo} />
                <KnowledgeCard icon="🎯" title="Best For" content={k.bestFor} />
                <KnowledgeCard icon="🚫" title="Not Suitable For" content={k.notSuitableFor} />
                <KnowledgeCard icon="📋" title="Key Specs" content={k.keySpecs} />
                <KnowledgeCard icon="❓" title="Common Questions" content={k.commonQuestions} />
                <KnowledgeCard icon="🔧" title="Accessories Needed" content={k.accessories} />
                <KnowledgeCard icon="🔄" title="Alternatives" content={k.alternatives} />
                {k.proTips && (
                  <div className="sm:col-span-2">
                    <KnowledgeCard icon="💡" title="Pro Tips" content={k.proTips} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stock by Location */}
          {product.inventory.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Stock by Location</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Location</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Godown</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {product.inventory.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2.5 font-mono text-sm text-gray-900">{inv.location.code}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600">{inv.location.godown.name}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900">{inv.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Pricing & History */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
            <div className="mt-4 space-y-1">
              <InfoRow label="Cost Price" value={`₹${product.costPrice.toFixed(2)}`} />
              <InfoRow label="MRP" value={`₹${product.mrp.toFixed(2)}`} />
              <InfoRow
                label="Selling (GST)"
                value={<span className="text-lg font-bold text-primary-600">₹{product.sellingPriceGst.toFixed(2)}</span>}
              />
              <InfoRow label="Selling (Cash)" value={`₹${product.sellingPriceCash.toFixed(2)}`} />
              <InfoRow label="Min Margin" value={`${product.minMarginPct}%`} />
            </div>
          </div>

          {/* Price History */}
          {product.priceHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Price History</h2>
              <div className="mt-4 space-y-3">
                {product.priceHistory.map((ph) => (
                  <div key={ph.id} className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        {FIELD_LABELS[ph.field] || ph.field}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(ph.changedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="text-gray-500 line-through">₹{ph.oldValue.toFixed(2)}</span>
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                      <span className="font-semibold text-gray-900">₹{ph.newValue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplier Card */}
          {product.supplier && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Supplier</h2>
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-gray-900">{product.supplier.name}</p>
                {product.supplier.phone && (
                  <p className="text-sm text-gray-500">📞 {product.supplier.phone}</p>
                )}
                {product.supplier.gstin && (
                  <p className="font-mono text-xs text-gray-400">GSTIN: {product.supplier.gstin}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
