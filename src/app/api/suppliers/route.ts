import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suppliers } from "@/lib/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const result = db
      .select()
      .from(suppliers)
      .orderBy(asc(suppliers.name))
      .all();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json([]);
  }
}
