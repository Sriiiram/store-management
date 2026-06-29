"use client";

import { useState } from "react";
import Link from "next/link";

interface Category { id: number; name: string }
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
interface InventoryItem { quantity: number }
interface MatchedProduct {
  id: number;
  sku: string;
  name: string;
  brand: string | null;
  category: Category;
  sellingPriceGst: number;
  knowledge: Knowledge | null;
  inventory: InventoryItem[];
  reorderLevel: number;
}

function KnowledgeSnippet({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{label}</span>
      <p className="mt-0.5 text-sm text-gray-700 line-clamp-3">{value}</p>
    </div>
  );
}

export default function AssistantPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/assistant?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const totalStock = (p: MatchedProduct) =>
    p.inventory?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100">
          <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Product Assistant</h1>
        <p className="mt-2 text-sm text-gray-500">
          Describe what the customer needs — we&apos;ll find the right products from our knowledge base.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mx-auto mt-8 max-w-2xl">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "drill for concrete wall", "waterproof paint for bathroom", "cut metal rods"'
            className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-5 pr-14 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary-600 p-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      {loading && (
        <div className="mt-12 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="mt-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-900">No matching products found</p>
          <p className="mt-1 text-sm text-gray-500">Try different keywords or a broader description.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500">
            Found <span className="font-semibold text-gray-900">{results.length}</span> matching product{results.length !== 1 ? "s" : ""}
          </p>

          {results.map((product) => {
            const stock = totalStock(product);
            const k = product.knowledge;
            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
                      {product.brand && (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {product.brand}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {product.sku} · {product.category?.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-lg font-bold text-gray-900">₹{product.sellingPriceGst.toFixed(0)}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      stock === 0
                        ? "bg-red-100 text-red-800"
                        : stock <= product.reorderLevel
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                    }`}>
                      {stock === 0 ? "Out of Stock" : `${stock} in stock`}
                    </span>
                  </div>
                </div>

                {k && (
                  <div className="mt-4 grid gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    <KnowledgeSnippet label="What It Does" value={k.whatItDoes} />
                    <KnowledgeSnippet label="Best For" value={k.bestFor} />
                    <KnowledgeSnippet label="Key Specs" value={k.keySpecs} />
                    <KnowledgeSnippet label="Accessories" value={k.accessories} />
                    <KnowledgeSnippet label="Pro Tips" value={k.proTips} />
                    <KnowledgeSnippet label="Alternatives" value={k.alternatives} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Suggestions when no search yet */}
      {!searched && (
        <div className="mt-12">
          <p className="text-center text-sm font-medium text-gray-500">Try searching for</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {[
              "drill for concrete",
              "waterproof sealant",
              "cut metal pipes",
              "wood finishing",
              "plumbing fittings",
              "electrical wiring",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setTimeout(() => {
                    const form = document.querySelector("form");
                    form?.requestSubmit();
                  }, 0);
                }}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
