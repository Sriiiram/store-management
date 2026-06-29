import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import {
  products,
  categories,
  suppliers,
  productKnowledge,
  inventoryItems,
  locations,
  godowns,
  priceHistory,
  stockMovements,
} from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);

    const row = db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, productId))
      .get();

    if (!row) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const knowledgeRow = db
      .select()
      .from(productKnowledge)
      .where(eq(productKnowledge.productId, productId))
      .get();

    const inventoryRows = db
      .select()
      .from(inventoryItems)
      .leftJoin(locations, eq(inventoryItems.locationId, locations.id))
      .leftJoin(godowns, eq(locations.godownId, godowns.id))
      .where(eq(inventoryItems.productId, productId))
      .all();

    const priceHistoryRows = db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.productId, productId))
      .orderBy(desc(priceHistory.changedAt))
      .limit(20)
      .all();

    const product = {
      ...row.products,
      category: row.categories,
      supplier: row.suppliers,
      knowledge: knowledgeRow || null,
      inventory: inventoryRows.map((inv) => ({
        ...inv.inventory_items,
        location: inv.locations
          ? { ...inv.locations, godown: inv.godowns }
          : null,
      })),
      priceHistory: priceHistoryRows,
    };

    return NextResponse.json(product);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);
    const body = await request.json();
    const { knowledge, ...productData } = body;

    const existing = db
      .select({
        costPrice: products.costPrice,
        mrp: products.mrp,
        sellingPriceGst: products.sellingPriceGst,
        sellingPriceCash: products.sellingPriceCash,
      })
      .from(products)
      .where(eq(products.id, productId))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const priceFields = [
      "costPrice",
      "mrp",
      "sellingPriceGst",
      "sellingPriceCash",
    ] as const;

    sqlite.transaction(() => {
      for (const field of priceFields) {
        const newVal = parseFloat(productData[field]);
        if (!isNaN(newVal) && newVal !== existing[field]) {
          db.insert(priceHistory)
            .values({
              productId,
              field,
              oldValue: existing[field]!,
              newValue: newVal,
            })
            .run();
        }
      }

      db.update(products)
        .set({
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
          updatedAt: new Date().toISOString(),
        })
        .where(eq(products.id, productId))
        .run();

      if (knowledge) {
        const existingKnowledge = db
          .select()
          .from(productKnowledge)
          .where(eq(productKnowledge.productId, productId))
          .get();

        const knowledgeValues = {
          whatItDoes: knowledge.whatItDoes || null,
          whatItCantDo: knowledge.whatItCantDo || null,
          bestFor: knowledge.bestFor || null,
          notSuitableFor: knowledge.notSuitableFor || null,
          keySpecs: knowledge.keySpecs || null,
          commonQuestions: knowledge.commonQuestions || null,
          accessories: knowledge.accessories || null,
          alternatives: knowledge.alternatives || null,
          proTips: knowledge.proTips || null,
          updatedAt: new Date().toISOString(),
        };

        if (existingKnowledge) {
          db.update(productKnowledge)
            .set(knowledgeValues)
            .where(eq(productKnowledge.productId, productId))
            .run();
        } else {
          db.insert(productKnowledge)
            .values({ productId, ...knowledgeValues })
            .run();
        }
      }
    })();

    const updated = db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, productId))
      .get();

    const knowledgeRow = db
      .select()
      .from(productKnowledge)
      .where(eq(productKnowledge.productId, productId))
      .get();

    const product = updated
      ? {
          ...updated.products,
          category: updated.categories,
          supplier: updated.suppliers,
          knowledge: knowledgeRow || null,
        }
      : null;

    return NextResponse.json(product);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);

    sqlite.transaction(() => {
      db.delete(productKnowledge)
        .where(eq(productKnowledge.productId, productId))
        .run();
      db.delete(priceHistory)
        .where(eq(priceHistory.productId, productId))
        .run();
      db.delete(inventoryItems)
        .where(eq(inventoryItems.productId, productId))
        .run();
      db.delete(stockMovements)
        .where(eq(stockMovements.productId, productId))
        .run();
      db.delete(products).where(eq(products.id, productId)).run();
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
