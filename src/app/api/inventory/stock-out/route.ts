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

      if (!existing || (existing.quantity ?? 0) < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${existing?.quantity ?? 0}, Requested: ${quantity}`
        );
      }

      const movementResult = db
        .insert(stockMovements)
        .values({
          productId,
          type: "OUT",
          quantity,
          fromLocation: String(locationId),
          reference: reference || null,
          notes: notes || null,
        })
        .run();

      const movement = {
        id: Number(movementResult.lastInsertRowid),
        productId,
        type: "OUT",
        quantity,
        fromLocation: String(locationId),
        reference: reference || null,
        notes: notes || null,
      };

      db.update(inventoryItems)
        .set({
          quantity: (existing.quantity ?? 0) - quantity,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(inventoryItems.id, existing.id))
        .run();

      const inventoryItem = {
        ...existing,
        quantity: (existing.quantity ?? 0) - quantity,
      };

      return { movement, inventoryItem };
    })();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Stock-out POST error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to record stock outward";
    const status = message.includes("Insufficient stock") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
