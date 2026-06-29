import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryItems, products, locations, godowns } from "@/lib/schema";
import { eq, like, or, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const godownId = searchParams.get("godownId");
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const search = searchParams.get("search");

    const conditions = [];

    if (godownId) {
      conditions.push(eq(locations.godownId, parseInt(godownId, 10)));
    }

    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.sku, `%${search}%`)
        )!
      );
    }

    let query = db
      .select()
      .from(inventoryItems)
      .innerJoin(products, eq(inventoryItems.productId, products.id))
      .innerJoin(locations, eq(inventoryItems.locationId, locations.id))
      .leftJoin(godowns, eq(locations.godownId, godowns.id));

    if (conditions.length === 1) {
      query = query.where(conditions[0]) as typeof query;
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = query.all();

    const items = rows.map((row) => {
      const quantity = row.inventory_items.quantity ?? 0;
      const reorderLevel = row.products.reorderLevel ?? 5;
      let status: "OK" | "Low" | "Out" = "OK";
      if (quantity <= 0) status = "Out";
      else if (quantity < reorderLevel) status = "Low";

      return {
        ...row.inventory_items,
        product: row.products,
        location: { ...row.locations, godown: row.godowns },
        status,
      };
    });

    const filtered = lowStockOnly
      ? items.filter((i) => i.status === "Low" || i.status === "Out")
      : items;

    const totalItems = items.reduce(
      (sum, i) => sum + (i.quantity ?? 0),
      0
    );
    const lowStockCount = items.filter((i) => i.status === "Low").length;
    const outOfStockCount = items.filter((i) => i.status === "Out").length;

    return NextResponse.json({
      items: filtered,
      stats: { totalItems, lowStockCount, outOfStockCount },
    });
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
