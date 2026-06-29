import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, categories, suppliers, inventoryItems, locations, productKnowledge } from "@/lib/schema";
import { eq, like, or, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");

    let query = db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .orderBy(desc(products.updatedAt));

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

    if (categoryId) {
      conditions.push(eq(products.categoryId, parseInt(categoryId, 10)));
    }

    if (conditions.length === 1) {
      query = query.where(conditions[0]) as typeof query;
    } else if (conditions.length > 1) {
      const { and } = await import("drizzle-orm");
      query = query.where(and(...conditions)) as typeof query;
    }

    const rows = query.all();

    const productIds = rows.map((r) => r.products.id);

    const inventoryRows = productIds.length > 0
      ? db
          .select()
          .from(inventoryItems)
          .leftJoin(locations, eq(inventoryItems.locationId, locations.id))
          .all()
          .filter((inv) => productIds.includes(inv.inventory_items.productId))
      : [];

    const result = rows.map((row) => ({
      ...row.products,
      category: row.categories,
      supplier: row.suppliers,
      inventory: inventoryRows
        .filter((inv) => inv.inventory_items.productId === row.products.id)
        .map((inv) => ({ ...inv.inventory_items, location: inv.locations })),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { knowledge, ...productData } = body;

    const result = db
      .insert(products)
      .values({
        sku: productData.sku,
        name: productData.name,
        brand: productData.brand || null,
        categoryId: parseInt(productData.categoryId, 10),
        hsnCode: productData.hsnCode || null,
        unit: productData.unit || "PCS",
        gstRate: parseFloat(productData.gstRate) || 18,
        description: productData.description || null,
        costPrice: parseFloat(productData.costPrice) || 0,
        mrp: parseFloat(productData.mrp) || 0,
        sellingPriceGst: parseFloat(productData.sellingPriceGst) || 0,
        sellingPriceCash: parseFloat(productData.sellingPriceCash) || 0,
        minMarginPct: parseFloat(productData.minMarginPct) || 10,
        reorderLevel: parseInt(productData.reorderLevel, 10) || 5,
        maxStock: parseInt(productData.maxStock, 10) || 100,
        supplierId: productData.supplierId
          ? parseInt(productData.supplierId, 10)
          : null,
      })
      .run();

    const newProductId = Number(result.lastInsertRowid);

    if (knowledge) {
      db.insert(productKnowledge)
        .values({
          productId: newProductId,
          whatItDoes: knowledge.whatItDoes || null,
          whatItCantDo: knowledge.whatItCantDo || null,
          bestFor: knowledge.bestFor || null,
          notSuitableFor: knowledge.notSuitableFor || null,
          keySpecs: knowledge.keySpecs || null,
          commonQuestions: knowledge.commonQuestions || null,
          accessories: knowledge.accessories || null,
          alternatives: knowledge.alternatives || null,
          proTips: knowledge.proTips || null,
        })
        .run();
    }

    const product = db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, newProductId))
      .get();

    const knowledgeRow = db
      .select()
      .from(productKnowledge)
      .where(eq(productKnowledge.productId, newProductId))
      .get();

    const response = product
      ? {
          ...product.products,
          category: product.categories,
          supplier: product.suppliers,
          knowledge: knowledgeRow || null,
        }
      : null;

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
