"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface SaleItem {
  id: number;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  product: {
    name: string;
    sku: string;
    brand: string | null;
    hsnCode: string | null;
    unit: string;
    category: { name: string };
  };
}

interface Sale {
  id: number;
  invoiceNo: string | null;
  type: string;
  customerName: string | null;
  customerPhone: string | null;
  customerGstin: string | null;
  subtotal: number;
  gstAmount: number;
  discount: number;
  totalAmount: number;
  paymentMode: string;
  notes: string | null;
  items: SaleItem[];
  createdAt: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

function numberToWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (n === 0) return "Zero";
  const num = Math.floor(Math.abs(n));

  function convert(num: number): string {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " and " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  }

  const rupees = Math.floor(num);
  const paise = Math.round((n - rupees) * 100);
  let result = convert(rupees) + " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  result += " Only";
  return result;
}

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sales/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setSale(null);
        else setSale(data);
      })
      .catch(() => setSale(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Sale not found</p>
        <Link href="/sales" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to sales
        </Link>
      </div>
    );
  }

  const isGST = sale.type === "GST";
  const gstBreakup = isGST
    ? sale.items.reduce<Record<number, { taxable: number; cgst: number; sgst: number }>>((acc, item) => {
        if (!acc[item.gstRate]) acc[item.gstRate] = { taxable: 0, cgst: 0, sgst: 0 };
        acc[item.gstRate].taxable += item.unitPrice * item.quantity;
        acc[item.gstRate].cgst += item.gstAmount / 2;
        acc[item.gstRate].sgst += item.gstAmount / 2;
        return acc;
      }, {})
    : {};

  return (
    <div className="mx-auto max-w-4xl">
      {/* Action Bar (hidden in print) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/sales" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Sales
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
          </svg>
          Print
        </button>
      </div>

      {/* Invoice */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm print:border-none print:shadow-none">
        {/* Invoice Header */}
        <div className="border-b border-gray-200 p-6 sm:p-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isGST ? "Tax Invoice" : "Cash Memo"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Hardware Store</p>
            </div>
            <div className="text-right">
              {sale.invoiceNo && (
                <p className="text-lg font-bold text-blue-600">{sale.invoiceNo}</p>
              )}
              <p className="text-sm text-gray-500">
                {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${
                  isGST ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isGST ? "GST Bill" : "Cash Sale"}
              </span>
            </div>
          </div>

          {/* Customer & Store Info */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Bill To</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{sale.customerName || "Walk-in Customer"}</p>
              {sale.customerPhone && <p className="text-sm text-gray-600">Ph: {sale.customerPhone}</p>}
              {sale.customerGstin && <p className="text-sm text-gray-600">GSTIN: {sale.customerGstin}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Payment</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{sale.paymentMode}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto p-6 sm:p-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 text-left font-medium text-gray-500">#</th>
                <th className="pb-3 text-left font-medium text-gray-500">Product</th>
                {isGST && <th className="pb-3 text-left font-medium text-gray-500">HSN</th>}
                <th className="pb-3 text-center font-medium text-gray-500">Qty</th>
                <th className="pb-3 text-right font-medium text-gray-500">Price</th>
                {isGST && <th className="pb-3 text-right font-medium text-gray-500">GST</th>}
                <th className="pb-3 text-right font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sale.items.map((item, i) => (
                <tr key={item.id}>
                  <td className="py-3 text-gray-500">{i + 1}</td>
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{item.product.sku}</p>
                  </td>
                  {isGST && <td className="py-3 text-gray-600">{item.product.hsnCode || "—"}</td>}
                  <td className="py-3 text-center text-gray-700">
                    {item.quantity} {item.product.unit}
                  </td>
                  <td className="py-3 text-right text-gray-700">{fmt(item.unitPrice)}</td>
                  {isGST && (
                    <td className="py-3 text-right text-gray-500">
                      {fmt(item.gstAmount)}
                      <span className="ml-0.5 text-xs">({item.gstRate}%)</span>
                    </td>
                  )}
                  <td className="py-3 text-right font-medium text-gray-900">{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST Breakup (for GST invoices) */}
        {isGST && Object.keys(gstBreakup).length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 sm:px-8">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Tax Breakup</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">GST Rate</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Taxable</th>
                  <th className="pb-2 text-right font-medium text-gray-500">CGST</th>
                  <th className="pb-2 text-right font-medium text-gray-500">SGST</th>
                  <th className="pb-2 text-right font-medium text-gray-500">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(gstBreakup).map(([rate, data]) => (
                  <tr key={rate} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{rate}%</td>
                    <td className="py-2 text-right text-gray-700">{fmt(data.taxable)}</td>
                    <td className="py-2 text-right text-gray-600">{fmt(data.cgst)}</td>
                    <td className="py-2 text-right text-gray-600">{fmt(data.sgst)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{fmt(data.cgst + data.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 p-6 sm:p-8">
          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{fmt(sale.subtotal)}</span>
            </div>
            {isGST && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST</span>
                <span>{fmt(sale.gstAmount)}</span>
              </div>
            )}
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount</span>
                <span>-{fmt(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>Total Amount</span>
              <span>{fmt(sale.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <span className="font-medium">Amount in words: </span>
            {numberToWords(sale.totalAmount)}
          </div>

          {sale.notes && (
            <div className="mt-4 text-sm text-gray-500">
              <span className="font-medium text-gray-700">Notes: </span>
              {sale.notes}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 sm:px-8">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <p>Thank you for your business!</p>
            <p>Generated by Store Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}
