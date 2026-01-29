import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ settings: db.settings });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const pollIntervalMs = Number(body.pollIntervalMs);
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 60000) {
    return NextResponse.json({ error: "pollIntervalMs must be >= 60000" }, { status: 400 });
  }

  const db = await updateDb((current) => ({
    ...current,
    settings: {
      ...current.settings,
      pollIntervalMs,
    },
  }));

  return NextResponse.json({ settings: db.settings });
}
