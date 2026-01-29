import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export async function GET() {
  const db = await readDb();
  const items = [...db.items].sort((a, b) => (b.capturedAt || "").localeCompare(a.capturedAt || ""));
  return NextResponse.json({ items });
}
