import { db } from "@/lib/db";
import { products, sales } from "@/lib/schema";
import { count, sum, desc, gte, sql } from "drizzle-orm";
import Link from "next/link";

const INR = (amount: number) =>
  "₹" +
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default async function DashboardPage() {
  let totalProducts = 0;
  let monthRevenue = 0;
  let todaySalesCount = 0;
  let todaySalesAmount = 0;
  let recentSales: Array<{
    id: number;
    invoiceNo: string | null;
    type: string;
    totalAmount: number | null;
    createdAt: string | null;
    itemCount: number;
  }> = [];
  let lowStock: Array<{
    id: number;
    name: string;
    sku: string;
    reorderLevel: number | null;
    categoryName: string;
    totalStock: number;
  }> = [];

  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const todayStart = now.toISOString().slice(0, 10);

    totalProducts =
      db.select({ value: count() }).from(products).get()?.value ?? 0;

    monthRevenue = Number(
      db
        .select({ value: sum(sales.totalAmount) })
        .from(sales)
        .where(gte(sales.createdAt, monthStart))
        .get()?.value ?? 0
    );

    const todayRow = db
      .select({ cnt: count(), total: sum(sales.totalAmount) })
      .from(sales)
      .where(gte(sales.createdAt, todayStart))
      .get();
    todaySalesCount = todayRow?.cnt ?? 0;
    todaySalesAmount = Number(todayRow?.total ?? 0);

    recentSales = db
      .select({
        id: sales.id,
        invoiceNo: sales.invoiceNo,
        type: sales.type,
        totalAmount: sales.totalAmount,
        createdAt: sales.createdAt,
        itemCount:
          sql<number>`(SELECT COUNT(*) FROM sale_items WHERE sale_id = ${sales.id})`,
      })
      .from(sales)
      .orderBy(desc(sales.createdAt))
      .limit(10)
      .all();

    lowStock = db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        reorderLevel: products.reorderLevel,
        categoryName:
          sql<string>`COALESCE((SELECT name FROM categories WHERE id = ${products.categoryId}), 'Uncategorized')`,
        totalStock:
          sql<number>`COALESCE((SELECT SUM(quantity) FROM inventory_items WHERE product_id = ${products.id}), 0)`,
      })
      .from(products)
      .all()
      .filter((p) => p.totalStock <= (p.reorderLevel ?? 5));
  } catch {
    // defaults already set above
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hardware Store Overview
          </p>
        </div>
        <nav className="flex gap-2">
          <Link
            href="/analytics"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Analytics
          </Link>
        </nav>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={totalProducts.toString()}
          subtitle="in catalog"
          accent="blue"
        />
        <StatCard
          title="Revenue (This Month)"
          value={INR(monthRevenue)}
          subtitle="total sales"
          accent="green"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStock.length.toString()}
          subtitle="items below reorder level"
          accent={lowStock.length > 0 ? "red" : "gray"}
        />
        <StatCard
          title="Today's Sales"
          value={todaySalesCount.toString()}
          subtitle={INR(todaySalesAmount)}
          accent="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction href="/sales/new" label="New Sale" icon="🧾" />
          <QuickAction href="/products/new" label="Add Product" icon="📦" />
          <QuickAction href="/inventory/stock-in" label="Stock In" icon="📥" />
          <QuickAction href="/analytics" label="View Analytics" icon="📊" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Sales
              </h2>
            </div>
            {recentSales.length === 0 ? (
              <EmptyState message="No sales recorded yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-6 py-3">Invoice</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Items</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-3 font-medium text-gray-900">
                          {sale.invoiceNo ?? `#${sale.id}`}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              sale.type === "GST"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {sale.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {sale.itemCount} item
                          {sale.itemCount !== 1 ? "s" : ""}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-medium text-gray-900">
                          {INR(sale.totalAmount ?? 0)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-gray-500">
                          {sale.createdAt
                            ? new Date(sale.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Low Stock Alerts
              </h2>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState message="All stock levels are healthy" />
            ) : (
              <ul className="divide-y divide-gray-50">
                {lowStock.slice(0, 15).map((product) => (
                  <li key={product.id} className="px-6 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.categoryName} · SKU: {product.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            product.totalStock === 0
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {product.totalStock}
                        </p>
                        <p className="text-xs text-gray-400">
                          / {product.reorderLevel ?? 5}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: "blue" | "green" | "red" | "purple" | "gray";
}) {
  const accentColors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    red: "border-l-red-500",
    purple: "border-l-purple-500",
    gray: "border-l-gray-300",
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm ${accentColors[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
