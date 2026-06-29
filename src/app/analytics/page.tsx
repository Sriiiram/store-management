import { db } from "@/lib/db";
import { products, sales, saleItems } from "@/lib/schema";
import { count, sum, desc, gte, eq, and, sql } from "drizzle-orm";
import Link from "next/link";

const INR = (amount: number) =>
  "₹" +
  amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type DateRange = "week" | "month" | "quarter";

function getDateRange(range: DateRange): string {
  const now = new Date();
  let start: Date;

  switch (range) {
    case "week": {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
  }

  return start.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = (
    ["week", "month", "quarter"].includes(params.range ?? "")
      ? params.range
      : "month"
  ) as DateRange;

  let gstRevenue = 0;
  let gstTax = 0;
  let gstCount = 0;
  let cashRevenue = 0;
  let cashCount = 0;
  let topSelling: Array<{
    id: number;
    name: string;
    sku: string;
    totalQuantity: number;
    totalRevenue: number;
  }> = [];
  let deadInventory: Array<{
    id: number;
    name: string;
    sku: string;
    categoryName: string;
    totalStock: number;
  }> = [];
  let categoryData: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }> = [];
  let dailySales: Array<{
    date: string;
    total: number;
    count: number;
  }> = [];

  try {
    const startStr = getDateRange(range);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysStr = sixtyDaysAgo.toISOString().slice(0, 10);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10);

    // GST revenue
    const gstRow = db
      .select({
        total: sum(sales.totalAmount),
        gst: sum(sales.gstAmount),
        cnt: count(),
      })
      .from(sales)
      .where(and(eq(sales.type, "GST"), gte(sales.createdAt, startStr)))
      .get();
    gstRevenue = Number(gstRow?.total ?? 0);
    gstTax = Number(gstRow?.gst ?? 0);
    gstCount = gstRow?.cnt ?? 0;

    // Cash revenue
    const cashRow = db
      .select({
        total: sum(sales.totalAmount),
        cnt: count(),
      })
      .from(sales)
      .where(and(eq(sales.type, "CASH"), gte(sales.createdAt, startStr)))
      .get();
    cashRevenue = Number(cashRow?.total ?? 0);
    cashCount = cashRow?.cnt ?? 0;

    // Top 10 products by revenue (join saleItems → products → sales)
    topSelling = db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        totalQuantity: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${saleItems.total}), 0)`,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(gte(sales.createdAt, startStr))
      .groupBy(saleItems.productId)
      .orderBy(desc(sql`SUM(${saleItems.total})`))
      .limit(10)
      .all();

    // Dead inventory: products with stock but no sales in 60 days
    const allWithStock = db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        categoryName:
          sql<string>`COALESCE((SELECT name FROM categories WHERE id = ${products.categoryId}), 'Unknown')`,
        totalStock:
          sql<number>`COALESCE((SELECT SUM(quantity) FROM inventory_items WHERE product_id = ${products.id}), 0)`,
        recentSaleCount:
          sql<number>`(SELECT COUNT(*) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = ${products.id} AND s.created_at >= ${sixtyDaysStr})`,
      })
      .from(products)
      .all();

    deadInventory = allWithStock
      .filter((p) => p.totalStock > 0 && p.recentSaleCount === 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryName: p.categoryName,
        totalStock: p.totalStock,
      }));

    // Category breakdown
    const catRows = db
      .select({
        categoryName:
          sql<string>`COALESCE((SELECT name FROM categories WHERE id = ${products.categoryId}), 'Unknown')`,
        quantity: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${saleItems.total}), 0)`,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(gte(sales.createdAt, startStr))
      .groupBy(products.categoryId)
      .orderBy(desc(sql`SUM(${saleItems.total})`))
      .all();

    categoryData = catRows.map((r) => ({
      name: r.categoryName,
      quantity: r.quantity,
      revenue: r.revenue,
    }));

    // Daily sales trend (last 30 days)
    const dailySalesRaw = db
      .select({
        createdAt: sales.createdAt,
        totalAmount: sales.totalAmount,
      })
      .from(sales)
      .where(gte(sales.createdAt, thirtyDaysStr))
      .orderBy(sales.createdAt)
      .all();

    const dailyMap = new Map<string, { total: number; count: number }>();
    for (let d = 29; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      dailyMap.set(date.toISOString().slice(0, 10), { total: 0, count: 0 });
    }
    for (const row of dailySalesRaw) {
      const key = (row.createdAt ?? "").slice(0, 10);
      const existing = dailyMap.get(key);
      if (existing) {
        existing.total += row.totalAmount ?? 0;
        existing.count += 1;
      }
    }
    dailySales = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    // defaults already set above
  }

  const totalRevenue = gstRevenue + cashRevenue;
  const totalTransactions = gstCount + cashCount;

  const rangeLabels: Record<DateRange, string> = {
    week: "This Week",
    month: "This Month",
    quarter: "This Quarter",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sales & inventory insights — {rangeLabels[range]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Dashboard
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        {(["week", "month", "quarter"] as const).map((r) => (
          <Link
            key={r}
            href={`/analytics?range=${r}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              range === r
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {rangeLabels[r]}
          </Link>
        ))}
      </div>

      {/* Revenue Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Revenue"
          value={INR(totalRevenue)}
          detail={`${totalTransactions} transactions`}
          accent="blue"
        />
        <SummaryCard
          title="GST Sales"
          value={INR(gstRevenue)}
          detail={`${gstCount} bills · Tax: ${INR(gstTax)}`}
          accent="green"
        />
        <SummaryCard
          title="Cash Sales"
          value={INR(cashRevenue)}
          detail={`${cashCount} transactions`}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top 10 Selling Products */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Top 10 Selling Products
            </h2>
          </div>
          {topSelling.length === 0 ? (
            <EmptyState message="No sales data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3 text-right">Qty Sold</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topSelling.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.sku}</p>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">
                        {item.totalQuantity}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">
                        {INR(item.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category-wise Sales */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Category-wise Sales
            </h2>
          </div>
          {categoryData.length === 0 ? (
            <EmptyState message="No category data yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-right">Qty Sold</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                    <th className="px-6 py-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {categoryData.map((cat) => (
                    <tr
                      key={cat.name}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {cat.name}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">
                        {cat.quantity}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900">
                        {INR(cat.revenue)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {totalRevenue > 0
                          ? ((cat.revenue / totalRevenue) * 100).toFixed(1)
                          : "0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dead Inventory */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Dead Inventory
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Products with stock but no sales in 60+ days
            </p>
          </div>
          {deadInventory.length === 0 ? (
            <EmptyState message="No dead inventory — all products are moving" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deadInventory.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.sku}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {item.categoryName}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          {item.totalStock} units
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily Sales Trend */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Daily Sales Trend
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">Last 30 days</p>
          </div>
          {dailySales.length === 0 ? (
            <EmptyState message="No daily sales data yet" />
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Sales</th>
                    <th className="px-6 py-3 text-right">Revenue</th>
                    <th className="w-32 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dailySales.map((day) => {
                    const maxRevenue = Math.max(
                      ...dailySales.map((d) => d.total),
                      1
                    );
                    const barWidth = (day.total / maxRevenue) * 100;
                    return (
                      <tr
                        key={day.date}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-6 py-2.5 text-gray-700">
                          {new Date(day.date + "T00:00:00").toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              weekday: "short",
                            }
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-right text-gray-600">
                          {day.count}
                        </td>
                        <td className="whitespace-nowrap px-6 py-2.5 text-right font-medium text-gray-900">
                          {INR(day.total)}
                        </td>
                        <td className="px-6 py-2.5">
                          <div className="h-2 w-full rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  accent,
}: {
  title: string;
  value: string;
  detail: string;
  accent: "blue" | "green" | "amber";
}) {
  const colors = {
    blue: "border-l-blue-500",
    green: "border-l-green-500",
    amber: "border-l-amber-500",
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 bg-white p-5 shadow-sm ${colors[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{detail}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
