import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/db";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ keywords: db.keywords, notifications: db.notifications });
}

export async function POST(request: Request) {
  const body = await request.json();
  const keyword = String(body.keyword || "").trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  const db = await updateDb((current) => {
    if (current.keywords.some((item) => item.toLowerCase() === keyword.toLowerCase())) {
      return current;
    }
    return {
      ...current,
      keywords: [...current.keywords, keyword],
    };
  });

  return NextResponse.json({ keywords: db.keywords });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = String(searchParams.get("keyword") || "").trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  const db = await updateDb((current) => ({
    ...current,
    keywords: current.keywords.filter((item) => item.toLowerCase() !== keyword.toLowerCase()),
  }));

  return NextResponse.json({ keywords: db.keywords });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const enabled = Boolean(body.telegramEnabled);
  const db = await updateDb((current) => ({
    ...current,
    notifications: {
      ...current.notifications,
      telegram: {
        ...current.notifications.telegram,
        enabled,
      },
    },
  }));
  return NextResponse.json({ notifications: db.notifications });
}
