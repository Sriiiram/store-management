"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
}
interface Supplier {
  id: number;
  name: string;
}

const UNITS = ["PCS", "KG", "MTR", "LTR", "BOX", "SET", "PAIR", "ROLL", "FT", "SQ.FT"];
const GST_RATES = [0, 5, 12, 18, 28];

function SectionHeader({ title, number }: { title: string; number: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
        {number}
      </span>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

function Field({
  label, required, children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

const textareaClass = `${inputClass} min-h-[80px] resize-y`;

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
    ]).then(([catResult, supResult]) => {
      if (catResult.status === "fulfilled" && Array.isArray(catResult.value))
        setCategories(catResult.value);
      if (supResult.status === "fulfilled" && Array.isArray(supResult.value))
        setSuppliers(supResult.value);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const get = (key: string) => (form.get(key) as string) || "";

    const body = {
      sku: get("sku"),
      name: get("name"),
      brand: get("brand"),
      categoryId: get("categoryId"),
      hsnCode: get("hsnCode"),
      unit: get("unit"),
      gstRate: get("gstRate"),
      description: get("description"),
      costPrice: get("costPrice"),
      mrp: get("mrp"),
      sellingPriceGst: get("sellingPriceGst"),
      sellingPriceCash: get("sellingPriceCash"),
      minMarginPct: get("minMarginPct"),
      reorderLevel: get("reorderLevel"),
      maxStock: get("maxStock"),
      supplierId: get("supplierId"),
      knowledge: {
        whatItDoes: get("whatItDoes"),
        whatItCantDo: get("whatItCantDo"),
        bestFor: get("bestFor"),
        notSuitableFor: get("notSuitableFor"),
        keySpecs: get("keySpecs"),
        commonQuestions: get("commonQuestions"),
        accessories: get("accessories"),
        alternatives: get("alternatives"),
        proTips: get("proTips"),
      },
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create product");
      }

      const product = await res.json();
      router.push(`/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Add New Product</h1>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Basic Info" number={1} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="SKU" required>
              <input name="sku" required placeholder="e.g. DRL-001" className={inputClass} />
            </Field>
            <Field label="Product Name" required>
              <input name="name" required placeholder="e.g. Bosch Impact Drill 13mm" className={inputClass} />
            </Field>
            <Field label="Brand">
              <input name="brand" placeholder="e.g. Bosch" className={inputClass} />
            </Field>
            <Field label="Category" required>
              <select name="categoryId" required className={inputClass} defaultValue="">
                <option value="" disabled>Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="HSN Code">
              <input name="hsnCode" placeholder="e.g. 8467" className={inputClass} />
            </Field>
            <Field label="Unit">
              <select name="unit" defaultValue="PCS" className={inputClass}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label="GST Rate (%)">
              <select name="gstRate" defaultValue="18" className={inputClass}>
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Description">
                <textarea name="description" placeholder="Brief product description..." className={textareaClass} rows={2} />
              </Field>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Pricing" number={2} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Cost Price (₹)">
              <input name="costPrice" type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="MRP (₹)">
              <input name="mrp" type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="Selling Price — GST (₹)">
              <input name="sellingPriceGst" type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="Selling Price — Cash (₹)">
              <input name="sellingPriceCash" type="number" step="0.01" min="0" placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="Min Margin (%)">
              <input name="minMarginPct" type="number" step="0.1" min="0" defaultValue="10" className={inputClass} />
            </Field>
          </div>
        </div>

        {/* Section 3: Stock Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SectionHeader title="Stock Settings" number={3} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Reorder Level">
              <input name="reorderLevel" type="number" min="0" defaultValue="5" className={inputClass} />
            </Field>
            <Field label="Max Stock">
              <input name="maxStock" type="number" min="0" defaultValue="100" className={inputClass} />
            </Field>
            <Field label="Supplier">
              <select name="supplierId" className={inputClass} defaultValue="">
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Section 4: Knowledge Base */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <SectionHeader title="Knowledge Base" number={4} />
          <p className="mt-2 text-sm text-gray-500">
            Help your staff sell better — describe what this product does and who it&apos;s for.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="What It Does">
              <textarea name="whatItDoes" placeholder="What can this product do?" className={textareaClass} rows={3} />
            </Field>
            <Field label="What It Can't Do">
              <textarea name="whatItCantDo" placeholder="Known limitations..." className={textareaClass} rows={3} />
            </Field>
            <Field label="Best For">
              <textarea name="bestFor" placeholder="Ideal use cases..." className={textareaClass} rows={3} />
            </Field>
            <Field label="Not Suitable For">
              <textarea name="notSuitableFor" placeholder="When NOT to recommend..." className={textareaClass} rows={3} />
            </Field>
            <Field label="Key Specs">
              <textarea name="keySpecs" placeholder="Power, dimensions, capacity..." className={textareaClass} rows={3} />
            </Field>
            <Field label="Common Questions">
              <textarea name="commonQuestions" placeholder="Q&A customers often ask..." className={textareaClass} rows={3} />
            </Field>
            <Field label="Accessories Needed">
              <textarea name="accessories" placeholder="What else the customer needs..." className={textareaClass} rows={3} />
            </Field>
            <Field label="Alternatives">
              <textarea name="alternatives" placeholder="Similar products to compare..." className={textareaClass} rows={3} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Pro Tips">
                <textarea name="proTips" placeholder="Expert selling advice..." className={textareaClass} rows={3} />
              </Field>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
          <Link
            href="/products"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </>
            ) : (
              "Create Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
