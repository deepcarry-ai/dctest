import { NextResponse } from "next/server";
import { updateDb } from "@/lib/db";
import { fetchRss, isAiRelated } from "@/lib/x";
import { sendTelegram } from "@/lib/notify";
import { normalizeHandle } from "@/lib/normalize";
import { fetchTweetsWithPlaywright } from "@/lib/x-playwright";

export async function POST() {
  const now = new Date().toISOString();

  const result = await updateDb(async (db) => {
    const newItems = [] as typeof db.items;

    for (const account of db.accounts.filter((acc) => acc.enabled)) {
      try {
        const normalizedHandle = normalizeHandle(account.handle);
        if (normalizedHandle && normalizedHandle !== account.handle) {
          account.handle = normalizedHandle;
        }

        let rssItems = [] as Awaited<ReturnType<typeof fetchRss>>;
        try {
          rssItems = await fetchRss(account.handle);
        } catch {
          rssItems = [];
        }

        if (rssItems.length === 0) {
          const browserItems = await fetchTweetsWithPlaywright(account.handle);
          rssItems = browserItems.map((item) => ({
            id: item.id,
            url: item.url,
            content: item.content,
            createdAt: item.createdAt,
          }));
        }

        if (rssItems.length === 0) continue;

        const sorted = [...rssItems].sort((a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || "")
        );

        const latestId = sorted[0]?.id;
        const existingIds = new Set(db.items.map((item) => item.id));

        for (const item of sorted) {
          if (account.lastSeenId && item.id === account.lastSeenId) break;
          if (existingIds.has(item.id)) continue;
          if (!isAiRelated(item.content, db.keywords)) continue;

          newItems.push({
            id: item.id,
            handle: account.handle,
            content: item.content.slice(0, 500),
            url: item.url,
            createdAt: item.createdAt,
            capturedAt: now,
            read: false,
          });
        }

        account.lastSeenId = latestId || account.lastSeenId;
        account.lastCheckedAt = now;
      } catch {
        account.lastCheckedAt = now;
      }
    }

    const mergedItems = [...newItems, ...db.items];

    return {
      ...db,
      items: mergedItems,
      accounts: db.accounts.map((acc) => ({ ...acc })),
    };
  });

  const newItems = result.items.filter((item) => item.capturedAt === now);

  if (newItems.length > 0 && result.notifications.telegram.enabled) {
    const lines = newItems
      .slice(0, 5)
      .map((item) => `@${item.handle}: ${item.content}\n${item.url}`)
      .join("\n\n");
    await sendTelegram(`【XWatcher】检测到 ${newItems.length} 条 AI 相关推文\n\n${lines}`);
  }

  return NextResponse.json({ newItems });
}
