import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  products,
  categories,
  productKnowledge,
  inventoryItems,
} from "@/lib/schema";
import { eq, like, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q) return NextResponse.json([]);

    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

    const knowledgeConditions = terms.flatMap((term) => [
      like(productKnowledge.whatItDoes, `%${term}%`),
      like(productKnowledge.whatItCantDo, `%${term}%`),
      like(productKnowledge.bestFor, `%${term}%`),
      like(productKnowledge.notSuitableFor, `%${term}%`),
      like(productKnowledge.keySpecs, `%${term}%`),
      like(productKnowledge.commonQuestions, `%${term}%`),
      like(productKnowledge.accessories, `%${term}%`),
      like(productKnowledge.alternatives, `%${term}%`),
      like(productKnowledge.proTips, `%${term}%`),
    ]);

    const knowledgeMatches = db
      .select()
      .from(productKnowledge)
      .innerJoin(products, eq(productKnowledge.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(or(...knowledgeConditions))
      .limit(20)
      .all();

    const matchedIds = knowledgeMatches.map((r) => r.products.id);

    const nameConditions = terms.flatMap((term) => [
      like(products.name, `%${term}%`),
      like(products.description, `%${term}%`),
    ]);

    let nameMatches = db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(
        productKnowledge,
        eq(products.id, productKnowledge.productId)
      )
      .where(or(...nameConditions))
      .limit(10)
      .all();

    nameMatches = nameMatches.filter(
      (r) => !matchedIds.includes(r.products.id)
    );

    const allProductIds = [
      ...matchedIds,
      ...nameMatches.map((r) => r.products.id),
    ];

    const inventoryRows =
      allProductIds.length > 0
        ? db
            .select()
            .from(inventoryItems)
            .all()
            .filter((inv) => allProductIds.includes(inv.productId))
        : [];

    const buildResult = (
      row: { products: typeof products.$inferSelect; categories: typeof categories.$inferSelect | null; product_knowledge: typeof productKnowledge.$inferSelect | null },
      inv: typeof inventoryRows
    ) => ({
      ...row.products,
      category: row.categories,
      knowledge: row.product_knowledge,
      inventory: inv.filter((i) => i.productId === row.products.id),
    });

    const results = [
      ...knowledgeMatches.map((r) =>
        buildResult(r, inventoryRows)
      ),
      ...nameMatches.map((r) =>
        buildResult(r, inventoryRows)
      ),
    ];

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
