import fs from "fs/promises";
import path from "path";

export type Account = {
  handle: string;
  enabled: boolean;
  lastSeenId?: string;
  lastCheckedAt?: string;
};

export type CapturedItem = {
  id: string;
  handle: string;
  content: string;
  url: string;
  createdAt?: string;
  capturedAt: string;
  read?: boolean;
};

export type DbShape = {
  accounts: Account[];
  items: CapturedItem[];
  keywords: string[];
  notifications: {
    telegram: {
      enabled: boolean;
    };
  };
};

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const defaultDb: DbShape = {
  accounts: [{ handle: "FuSheng_0306", enabled: true }],
  items: [],
  keywords: [
    "ai",
    "a.i.",
    "人工智能",
    "大模型",
    "模型",
    "机器学习",
    "深度学习",
    "llm",
    "gpt",
    "openai",
    "anthropic",
    "claude",
    "gemini",
    "aigc",
  ],
  notifications: {
    telegram: {
      enabled: false,
    },
  },
};

async function ensureDb(): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(defaultDb, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<DbShape> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw) as DbShape;
  return {
    ...defaultDb,
    ...parsed,
    keywords: parsed.keywords && parsed.keywords.length > 0 ? parsed.keywords : defaultDb.keywords,
    notifications: {
      ...defaultDb.notifications,
      ...parsed.notifications,
      telegram: {
        ...defaultDb.notifications.telegram,
        ...parsed.notifications?.telegram,
      },
    },
    accounts: parsed.accounts ?? defaultDb.accounts,
    items: parsed.items ?? defaultDb.items,
  };
}

export async function writeDb(db: DbShape): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function updateDb(
  updater: (db: DbShape) => DbShape | Promise<DbShape>
): Promise<DbShape> {
  const db = await readDb();
  const next = await updater(db);
  await writeDb(next);
  return next;
}
