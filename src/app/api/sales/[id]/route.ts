import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sales, saleItems, products, categories } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const saleId = parseInt(id, 10);

    const sale = db.select().from(sales).where(eq(sales.id, saleId)).get();

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const itemRows = db
      .select()
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(saleItems.saleId, saleId))
      .all();

    const result = {
      ...sale,
      items: itemRows.map((row) => ({
        ...row.sale_items,
        product: row.products
          ? { ...row.products, category: row.categories }
          : null,
      })),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}
