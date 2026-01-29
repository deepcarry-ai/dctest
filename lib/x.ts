const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.lacontrevoie.fr",
];

const AI_KEYWORDS = [
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
];

export type RssItem = {
  id: string;
  url: string;
  content: string;
  createdAt?: string;
};

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x60;/g, "`")
    .replace(/&#x3D;/g, "=");
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match?.[1];
}

function parseRss(xml: string): RssItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((itemXml) => {
    const title = extractTag(itemXml, "title") ?? "";
    const description = extractTag(itemXml, "description") ?? "";
    const link = extractTag(itemXml, "link") ?? "";
    const guid = extractTag(itemXml, "guid") ?? link;
    const pubDate = extractTag(itemXml, "pubDate") ?? undefined;
    const contentRaw = title || description;
    const content = stripHtml(decodeHtml(contentRaw));
    return {
      id: guid.trim(),
      url: link.trim(),
      content,
      createdAt: pubDate,
    };
  });
}

export function isAiRelated(text: string): boolean {
  const lowered = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

export async function fetchRss(handle: string): Promise<RssItem[]> {
  let lastError: unknown;
  for (const base of NITTER_INSTANCES) {
    try {
      const url = `${base}/${handle}/rss`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "XWatcher/1.0",
          Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
      const xml = await res.text();
      return parseRss(xml);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
