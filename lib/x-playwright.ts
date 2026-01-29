import { chromium } from "playwright";

export type BrowserTweet = {
  id: string;
  url: string;
  content: string;
  createdAt?: string;
};

export async function fetchTweetsWithPlaywright(handle: string): Promise<BrowserTweet[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  try {
    await page.goto(`https://x.com/${handle}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("article", { timeout: 15000 });

    const tweets = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll("article"));
      return articles.slice(0, 5).map((article) => {
        const textEl = article.querySelector("div[lang]");
        const timeEl = article.querySelector("time");
        const linkEl = article.querySelector('a[href*="/status/"]');
        const content = textEl ? (textEl as HTMLElement).innerText : "";
        const url = linkEl ? `https://x.com${linkEl.getAttribute("href")}` : "";
        const createdAt = timeEl?.getAttribute("datetime") ?? undefined;
        const id = url || `${createdAt ?? ""}-${content.slice(0, 24)}`;
        return { id, url, content, createdAt };
      });
    });

    return tweets.filter((tweet) => tweet.content);
  } finally {
    await page.close();
    await browser.close();
  }
}
