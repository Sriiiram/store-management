import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { godowns, locations } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  try {
    const allGodowns = db.select().from(godowns).orderBy(asc(godowns.name)).all();
    const allLocations = db
      .select()
      .from(locations)
      .orderBy(asc(locations.code))
      .all();

    const result = allGodowns.map((g) => ({
      ...g,
      locations: allLocations.filter((l) => l.godownId === g.id),
    }));

    return NextResponse.json({ godowns: result });
  } catch (error) {
    console.error("Locations GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (type === "godown") {
      const { name, address } = body;
      if (!name) {
        return NextResponse.json(
          { error: "Godown name is required" },
          { status: 400 }
        );
      }
      const result = db
        .insert(godowns)
        .values({ name, address: address || "" })
        .run();
      const godown = db
        .select()
        .from(godowns)
        .where(eq(godowns.id, Number(result.lastInsertRowid)))
        .get();
      return NextResponse.json(godown, { status: 201 });
    }

    if (type === "location") {
      const { godownId, code, rack, shelf, zone, description } = body;
      if (!godownId || !code) {
        return NextResponse.json(
          { error: "godownId and code are required" },
          { status: 400 }
        );
      }
      const result = db
        .insert(locations)
        .values({
          godownId,
          code,
          rack: rack || "",
          shelf: shelf || "",
          zone: zone || "",
          description: description || "",
        })
        .run();
      const location = db
        .select()
        .from(locations)
        .where(eq(locations.id, Number(result.lastInsertRowid)))
        .get();
      return NextResponse.json(location, { status: 201 });
    }

    return NextResponse.json(
      { error: "Invalid type. Use 'godown' or 'location'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Locations POST error:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
