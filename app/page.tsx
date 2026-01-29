"use client";

import { useEffect, useMemo, useState } from "react";

type Account = {
  handle: string;
  enabled: boolean;
  lastCheckedAt?: string;
};

type CapturedItem = {
  id: string;
  handle: string;
  content: string;
  url: string;
  createdAt?: string;
  capturedAt: string;
  read?: boolean;
};

type Toast = {
  id: string;
  title: string;
  body: string;
};

const POLL_INTERVAL = 60_000;

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<CapturedItem[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [handleInput, setHandleInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [scanAt, setScanAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [search, setSearch] = useState("");
  const [filterHandle, setFilterHandle] = useState("all");
  const [showUnread, setShowUnread] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  const lastChecked = useMemo(() => {
    const last = accounts
      .map((acc) => acc.lastCheckedAt)
      .filter(Boolean)
      .sort()
      .pop();
    return last ?? "-";
  }, [accounts]);

  const filteredItems = useMemo(() => {
    let next = [...items];
    if (filterHandle !== "all") {
      next = next.filter((item) => item.handle === filterHandle);
    }
    if (showUnread) {
      next = next.filter((item) => !item.read);
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      next = next.filter((item) =>
        item.content.toLowerCase().includes(query)
      );
    }
    return next;
  }, [items, filterHandle, search, showUnread]);

  async function loadData() {
    const [accountsRes, itemsRes, keywordsRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/items"),
      fetch("/api/keywords"),
    ]);
    const accountsJson = await accountsRes.json();
    const itemsJson = await itemsRes.json();
    const keywordsJson = await keywordsRes.json();
    setAccounts(accountsJson.accounts ?? []);
    setItems(itemsJson.items ?? []);
    setKeywords(keywordsJson.keywords ?? []);
    setTelegramEnabled(Boolean(keywordsJson.notifications?.telegram?.enabled));
  }

  async function runScan() {
    setLoading(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const json = await res.json();
      setScanAt(new Date().toISOString());
      if (Array.isArray(json.newItems) && json.newItems.length > 0) {
        const toastId = String(Date.now());
        setToasts((prev) => [
          {
            id: toastId,
            title: `检测到 ${json.newItems.length} 条 AI 相关新推文`,
            body: json.newItems
              .map((item: CapturedItem) => `${item.handle}: ${item.content}`)
              .join("\n"),
          },
          ...prev,
        ]);
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          json.newItems.forEach((item: CapturedItem) => {
            new Notification(`XWatcher · @${item.handle}`, {
              body: item.content,
            });
          });
        }
      }
      await loadData();
    } finally {
      setLoading(false);
    }
  }

  async function addAccount() {
    if (!handleInput.trim()) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: handleInput }),
    });
    setHandleInput("");
    await loadData();
  }

  async function removeAccount(handle: string) {
    await fetch(`/api/accounts?handle=${encodeURIComponent(handle)}`, {
      method: "DELETE",
    });
    await loadData();
  }

  async function addKeyword() {
    if (!keywordInput.trim()) return;
    await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: keywordInput }),
    });
    setKeywordInput("");
    await loadData();
  }

  async function removeKeyword(keyword: string) {
    await fetch(`/api/keywords?keyword=${encodeURIComponent(keyword)}`, {
      method: "DELETE",
    });
    await loadData();
  }

  async function toggleTelegram(enabled: boolean) {
    await fetch("/api/keywords", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramEnabled: enabled }),
    });
    setTelegramEnabled(enabled);
  }

  async function markRead(ids: string[], read: boolean) {
    await fetch("/api/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, read }),
    });
    await loadData();
  }

  function exportItems(format: "csv" | "json") {
    window.open(`/api/items?format=${format}`, "_blank");
  }

  function requestNotification() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission();
  }

  useEffect(() => {
    loadData().then(runScan);
    const timer = setInterval(runScan, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-cyan-300/80">
                  XWatcher
                </p>
                <h1 className="text-4xl font-semibold text-white">
                  XWatcher · AI 推文监控台
                </h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-cyan-400/30 px-3 py-1">
                  轮询：60s
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1">
                  最后扫描：{scanAt ? new Date(scanAt).toLocaleString() : "-"}
                </span>
              </div>
            </div>
            <p className="max-w-2xl text-base text-slate-300">
              监控指定的 X 帐号，当推文内容与 AI 关键词匹配时自动抓取前 500 字符并保存，同时即时提醒你。
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-cyan-500/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">监控帐号</h2>
                    <p className="text-sm text-slate-400">
                      支持添加多个 X 帐号，默认已监控 @FuSheng_0306
                    </p>
                  </div>
                  <button
                    onClick={runScan}
                    className="rounded-full border border-cyan-400/50 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-300 hover:text-white"
                    disabled={loading}
                  >
                    {loading ? "扫描中..." : "手动扫描"}
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <input
                      value={handleInput}
                      onChange={(event) => setHandleInput(event.target.value)}
                      placeholder="输入 X 帐号，例如 @elonmusk"
                      className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                    />
                    <button
                      onClick={addAccount}
                      className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
                    >
                      添加
                    </button>
                  </div>

                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div
                        key={account.handle}
                        className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">
                            @{account.handle}
                          </p>
                          <p className="text-xs text-slate-400">
                            最近检测：
                            {account.lastCheckedAt
                              ? new Date(account.lastCheckedAt).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <button
                          onClick={() => removeAccount(account.handle)}
                          className="text-xs text-slate-400 transition hover:text-rose-300"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>总账号：{accounts.length}</span>
                    <span>最近检测：{lastChecked}</span>
                    <button
                      onClick={requestNotification}
                      className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 transition hover:border-cyan-400"
                    >
                      启用浏览器通知
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">AI 关键词</h2>
                    <p className="text-sm text-slate-400">
                      管理关键词集合，扫描时仅保留匹配内容。
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    共 {keywords.length} 个
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <input
                    value={keywordInput}
                    onChange={(event) => setKeywordInput(event.target.value)}
                    placeholder="添加关键词，例如 生成式AI"
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                  />
                  <button
                    onClick={addKeyword}
                    className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
                  >
                    添加
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-200"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="text-slate-500 transition hover:text-rose-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">通知与导出</h2>
                    <p className="text-sm text-slate-400">
                      支持浏览器通知，Telegram 通知需要配置环境变量。
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4 text-sm text-slate-300">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={telegramEnabled}
                      onChange={(event) => toggleTelegram(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-500"
                    />
                    启用 Telegram 通知（需 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID）
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => exportItems("csv")}
                      className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200 transition hover:border-cyan-400"
                    >
                      导出 CSV
                    </button>
                    <button
                      onClick={() => exportItems("json")}
                      className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200 transition hover:border-cyan-400"
                    >
                      导出 JSON
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">AI 相关推文</h2>
                  <p className="text-sm text-slate-400">
                    仅保存匹配 AI 关键词的内容（前 500 字）
                  </p>
                </div>
                <span className="text-xs text-slate-400">累计 {items.length} 条</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索内容"
                  className="min-w-[200px] flex-1 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-400"
                />
                <select
                  value={filterHandle}
                  onChange={(event) => setFilterHandle(event.target.value)}
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-100"
                >
                  <option value="all">全部账号</option>
                  {accounts.map((account) => (
                    <option key={account.handle} value={account.handle}>
                      @{account.handle}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs">
                  <input
                    type="checkbox"
                    checked={showUnread}
                    onChange={(event) => setShowUnread(event.target.checked)}
                  />
                  未读优先
                </label>
                <button
                  onClick={() => markRead(items.map((item) => item.id), true)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200 transition hover:border-cyan-400"
                >
                  全部标记已读
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-500">
                    暂无捕获记录。系统将自动扫描并保存符合条件的推文内容。
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-2xl border border-slate-800 bg-slate-950/60 p-4 ${
                        item.read ? "opacity-70" : "border-cyan-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>@{item.handle}</span>
                        <span>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleString()
                            : "-"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-200">{item.content}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 hover:text-cyan-200"
                        >
                          查看原推文 →
                        </a>
                        <button
                          onClick={() => markRead([item.id], !item.read)}
                          className="text-slate-400 transition hover:text-cyan-200"
                        >
                          {item.read ? "标记未读" : "标记已读"}
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="fixed right-6 top-6 z-50 flex w-80 flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border border-cyan-400/40 bg-slate-900/90 p-4 text-sm text-slate-100 shadow-lg shadow-cyan-500/10"
          >
            <p className="font-medium text-cyan-200">{toast.title}</p>
            <p className="mt-2 whitespace-pre-line text-xs text-slate-300">
              {toast.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
