import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";

function toCsv(items: { handle: string; content: string; url: string; createdAt?: string; capturedAt: string; read?: boolean }[]) {
  const header = ["handle", "content", "url", "createdAt", "capturedAt", "read"];
  const rows = items.map((item) => [
    item.handle,
    item.content.replace(/\n/g, " "),
    item.url,
    item.createdAt ?? "",
    item.capturedAt,
    item.read ? "true" : "false",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const db = await readDb();
  const items = [...db.items].sort((a, b) => (b.capturedAt || "").localeCompare(a.capturedAt || ""));

  if (format === "csv") {
    return new NextResponse(toCsv(items), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=items.csv",
      },
    });
  }

  if (format === "json") {
    return new NextResponse(JSON.stringify(items, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=items.json",
      },
    });
  }

  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const read = Boolean(body.read);

  const db = await updateDb((current) => ({
    ...current,
    items: current.items.map((item) =>
      ids.includes(item.id) ? { ...item, read } : item
    ),
  }));

  return NextResponse.json({ items: db.items });
}
