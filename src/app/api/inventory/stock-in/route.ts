import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { inventoryItems, stockMovements } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, locationId, quantity, reference, notes } = body;

    if (!productId || !locationId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "productId, locationId, and a positive quantity are required" },
        { status: 400 }
      );
    }

    const result = sqlite.transaction(() => {
      const movementResult = db
        .insert(stockMovements)
        .values({
          productId,
          type: "IN",
          quantity,
          toLocation: String(locationId),
          reference: reference || null,
          notes: notes || null,
        })
        .run();

      const movement = {
        id: Number(movementResult.lastInsertRowid),
        productId,
        type: "IN",
        quantity,
        toLocation: String(locationId),
        reference: reference || null,
        notes: notes || null,
      };

      const existing = db
        .select()
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.productId, productId),
            eq(inventoryItems.locationId, locationId)
          )
        )
        .get();

      let inventoryItem;
      if (existing) {
        db.update(inventoryItems)
          .set({
            quantity: (existing.quantity ?? 0) + quantity,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(inventoryItems.id, existing.id))
          .run();

        inventoryItem = {
          ...existing,
          quantity: (existing.quantity ?? 0) + quantity,
        };
      } else {
        const insertResult = db
          .insert(inventoryItems)
          .values({ productId, locationId, quantity })
          .run();

        inventoryItem = {
          id: Number(insertResult.lastInsertRowid),
          productId,
          locationId,
          quantity,
        };
      }

      return { movement, inventoryItem };
    })();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Stock-in POST error:", error);
    return NextResponse.json(
      { error: "Failed to record stock inward" },
      { status: 500 }
    );
  }
}
