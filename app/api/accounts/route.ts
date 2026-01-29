import { NextResponse } from "next/server";
import { updateDb, readDb } from "@/lib/db";
import { normalizeHandle } from "@/lib/normalize";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ accounts: db.accounts });
}

export async function POST(request: Request) {
  const body = await request.json();
  const handle = normalizeHandle(String(body.handle || ""));
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }
  const db = await updateDb((current) => {
    if (current.accounts.some((acc) => acc.handle === handle)) {
      return current;
    }
    return {
      ...current,
      accounts: [
        ...current.accounts,
        { handle, enabled: true, lastSeenId: current.accounts.find((a) => a.handle === handle)?.lastSeenId },
      ],
    };
  });
  return NextResponse.json({ accounts: db.accounts });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = normalizeHandle(String(searchParams.get("handle") || ""));
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }
  const db = await updateDb((current) => ({
    ...current,
    accounts: current.accounts.filter((acc) => acc.handle !== handle),
  }));
  return NextResponse.json({ accounts: db.accounts });
}
