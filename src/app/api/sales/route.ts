import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import {
  sales,
  saleItems,
  products,
  inventoryItems,
  stockMovements,
} from "@/lib/schema";
import { eq, like, or, and, desc, gte, sql, sum, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    const conditions = [];

    if (type && type !== "ALL") {
      conditions.push(eq(sales.type, type));
    }

    if (dateFrom) {
      conditions.push(gte(sales.createdAt, dateFrom));
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      const { lte } = await import("drizzle-orm");
      conditions.push(lte(sales.createdAt, end.toISOString()));
    }

    if (search) {
      conditions.push(
        or(
          like(sales.customerName, `%${search}%`),
          like(sales.customerPhone, `%${search}%`),
          like(sales.invoiceNo, `%${search}%`)
        )!
      );
    }

    let query = db
      .select()
      .from(sales)
      .orderBy(desc(sales.createdAt));

    if (conditions.length === 1) {
      query = query.where(conditions[0]) as typeof query;
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const salesRows = query.all();

    const allSaleItems = db
      .select()
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .all();

    const result = salesRows.map((sale) => ({
      ...sale,
      items: allSaleItems
        .filter((si) => si.sale_items.saleId === sale.id)
        .map((si) => ({ ...si.sale_items, product: si.products })),
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStr = monthStart.toISOString();

    const todayAgg = db
      .select({
        total: sum(sales.totalAmount),
        count: count(),
      })
      .from(sales)
      .where(gte(sales.createdAt, todayStr))
      .get();

    const monthAgg = db
      .select({
        total: sum(sales.totalAmount),
        count: count(),
      })
      .from(sales)
      .where(gte(sales.createdAt, monthStr))
      .get();

    return NextResponse.json({
      sales: result,
      summary: {
        todayTotal: parseFloat(String(todayAgg?.total ?? 0)) || 0,
        todayCount: todayAgg?.count ?? 0,
        monthTotal: parseFloat(String(monthAgg?.total ?? 0)) || 0,
        monthCount: monthAgg?.count ?? 0,
      },
    });
  } catch {
    return NextResponse.json({
      sales: [],
      summary: { todayTotal: 0, todayCount: 0, monthTotal: 0, monthCount: 0 },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      customerName,
      customerPhone,
      customerGstin,
      discount,
      paymentMode,
      notes,
      items,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    const result = sqlite.transaction(() => {
      let invoiceNo: string | null = null;

      if (type === "GST") {
        const now = new Date();
        const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const lastInvoice = db
          .select()
          .from(sales)
          .where(like(sales.invoiceNo, `${prefix}%`))
          .orderBy(desc(sales.invoiceNo))
          .limit(1)
          .get();

        let seq = 1;
        if (lastInvoice?.invoiceNo) {
          const lastSeq = parseInt(
            lastInvoice.invoiceNo.split("-").pop() || "0",
            10
          );
          seq = lastSeq + 1;
        }
        invoiceNo = `${prefix}-${String(seq).padStart(4, "0")}`;
      }

      let subtotal = 0;
      let gstAmount = 0;
      const itemsToInsert: Array<{
        productId: number;
        quantity: number;
        unitPrice: number;
        gstRate: number;
        gstAmount: number;
        total: number;
      }> = [];

      for (const item of items) {
        const product = db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .get();

        if (!product) throw new Error(`Product ${item.productId} not found`);

        const unitPrice =
          type === "GST"
            ? (product.sellingPriceGst ?? 0)
            : (product.sellingPriceCash ?? 0);
        const qty = item.quantity;
        const lineTotal = unitPrice * qty;
        const lineGst =
          type === "GST" ? (lineTotal * (product.gstRate ?? 0)) / 100 : 0;

        subtotal += lineTotal;
        gstAmount += lineGst;

        itemsToInsert.push({
          productId: product.id,
          quantity: qty,
          unitPrice,
          gstRate: type === "GST" ? (product.gstRate ?? 0) : 0,
          gstAmount: lineGst,
          total: lineTotal + lineGst,
        });
      }

      const totalAmount = subtotal + gstAmount - (discount || 0);

      const saleResult = db
        .insert(sales)
        .values({
          invoiceNo,
          type,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerGstin: customerGstin || null,
          subtotal,
          gstAmount,
          discount: discount || 0,
          totalAmount,
          paymentMode: paymentMode || "CASH",
          notes: notes || null,
        })
        .run();

      const saleId = Number(saleResult.lastInsertRowid);

      for (const saleItem of itemsToInsert) {
        db.insert(saleItems)
          .values({ saleId, ...saleItem })
          .run();

        const inv = db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.productId, saleItem.productId))
          .orderBy(desc(inventoryItems.quantity))
          .limit(1)
          .get();

        if (inv && (inv.quantity ?? 0) > 0) {
          db.update(inventoryItems)
            .set({
              quantity: (inv.quantity ?? 0) - saleItem.quantity,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(inventoryItems.id, inv.id))
            .run();
        }

        db.insert(stockMovements)
          .values({
            productId: saleItem.productId,
            type: "OUT",
            quantity: saleItem.quantity,
            reference: `SALE-${saleId}`,
          })
          .run();
      }

      const sale = db.select().from(sales).where(eq(sales.id, saleId)).get();
      const saleItemRows = db
        .select()
        .from(saleItems)
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, saleId))
        .all();

      return {
        ...sale,
        items: saleItemRows.map((si) => ({
          ...si.sale_items,
          product: si.products,
        })),
      };
    })();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create sale";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
