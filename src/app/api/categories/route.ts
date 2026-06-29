import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const result = db
      .select()
      .from(categories)
      .orderBy(asc(categories.name))
      .all();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json([]);
  }
}
