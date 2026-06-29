import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { products, priceHistory } from "@/lib/schema";
import { eq, like, or, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.sku, `%${search}%`),
          like(products.brand, `%${search}%`)
        )!
      );
    }

    if (category) {
      conditions.push(eq(products.brand, category));
    }

    let query = db.select().from(products).orderBy(asc(products.name));

    if (conditions.length === 1) {
      query = query.where(conditions[0]) as typeof query;
    } else if (conditions.length > 1) {
      const { and } = await import("drizzle-orm");
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = query.all();

    const items = rows.map((p) => ({
      ...p,
      marginPct:
        (p.costPrice ?? 0) > 0
          ? (((p.sellingPriceGst ?? 0) - (p.costPrice ?? 0)) /
              (p.costPrice ?? 1)) *
            100
          : 0,
    }));

    return NextResponse.json({ products: items });
  } catch (error) {
    console.error("Pricing GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, field, value } = body;

    if (!productId || !field || value === undefined) {
      return NextResponse.json(
        { error: "productId, field, and value are required" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "costPrice",
      "mrp",
      "sellingPriceGst",
      "sellingPriceCash",
    ];
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: `Invalid field. Allowed: ${allowedFields.join(", ")}` },
        { status: 400 }
      );
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
      return NextResponse.json(
        { error: "Value must be a non-negative number" },
        { status: 400 }
      );
    }

    const currentProduct = db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .get();

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const oldValue = currentProduct[field as keyof typeof currentProduct] as number;

    sqlite.transaction(() => {
      db.update(products)
        .set({ [field]: numericValue, updatedAt: new Date().toISOString() })
        .where(eq(products.id, productId))
        .run();

      db.insert(priceHistory)
        .values({
          productId,
          field,
          oldValue,
          newValue: numericValue,
        })
        .run();
    })();

    const updatedProduct = db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .get();

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Pricing PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update price" },
      { status: 500 }
    );
  }
}
