"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

interface SaleItem {
  id: number;
  productId: number;
  quantity: number;
  product: { name: string };
}

interface Sale {
  id: number;
  invoiceNo: string | null;
  type: string;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paymentMode: string;
  items: SaleItem[];
  createdAt: string;
}

interface Summary {
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TABS = [
  { key: "ALL", label: "All" },
  { key: "GST", label: "GST Bills" },
  { key: "CASH", label: "Cash Sales" },
] as const;

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary>({ todayTotal: 0, todayCount: 0, monthTotal: 0, monthCount: 0 });
  const [tab, setTab] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("type", tab);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    setLoading(true);
    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSales(data.sales || []);
        setSummary(data.summary || { todayTotal: 0, todayCount: 0, monthTotal: 0, monthCount: 0 });
      })
      .catch(() => {
        setSales([]);
      })
      .finally(() => setLoading(false));
  }, [tab, dateFrom, dateTo]);

  return (
    <div>
      <PageHeader
        title="Sales & Billing"
        description="Manage invoices, track sales, and create new bills"
        actions={
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Sale
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Today&apos;s Sales</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{fmt(summary.todayTotal)}</p>
          <p className="mt-1 text-sm text-gray-500">{summary.todayCount} transactions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">This Month</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{fmt(summary.monthTotal)}</p>
          <p className="mt-1 text-sm text-gray-500">{summary.monthCount} transactions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Avg. Transaction</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {summary.monthCount ? fmt(summary.monthTotal / summary.monthCount) : "—"}
          </p>
          <p className="mt-1 text-sm text-gray-500">this month</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Sales Listed</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{sales.length}</p>
          <p className="mt-1 text-sm text-gray-500">matching filters</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          </div>
        ) : sales.length === 0 ? (
          <div className="py-20 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500">No sales found</p>
            <Link href="/sales/new" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              Create your first sale
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Invoice No</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Items</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Payment</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`transition-colors hover:bg-gray-50 ${
                      sale.type === "GST" ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {sale.invoiceNo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          {sale.invoiceNo}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                          Cash
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{sale.customerName || "Walk-in"}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{sale.items.length}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {fmt(sale.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          sale.paymentMode === "CASH"
                            ? "bg-green-100 text-green-700"
                            : sale.paymentMode === "UPI"
                            ? "bg-purple-100 text-purple-700"
                            : sale.paymentMode === "CARD"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {sale.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sales/${sale.id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
