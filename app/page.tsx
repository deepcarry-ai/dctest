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
  const [handleInput, setHandleInput] = useState("");
  const [scanAt, setScanAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const lastChecked = useMemo(() => {
    const last = accounts
      .map((acc) => acc.lastCheckedAt)
      .filter(Boolean)
      .sort()
      .pop();
    return last ?? "-";
  }, [accounts]);

  async function loadData() {
    const [accountsRes, itemsRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/items"),
    ]);
    const accountsJson = await accountsRes.json();
    const itemsJson = await itemsRes.json();
    setAccounts(accountsJson.accounts ?? []);
    setItems(itemsJson.items ?? []);
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
            body: json.newItems.map((item: CapturedItem) => `${item.handle}: ${item.content}`).join("\n"),
          },
          ...prev,
        ]);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
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
    await fetch(`/api/accounts?handle=${encodeURIComponent(handle)}`, { method: "DELETE" });
    await loadData();
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
                <p className="text-sm uppercase tracking-[0.4em] text-cyan-300/80">XWatcher</p>
                <h1 className="text-4xl font-semibold text-white">XWatcher · AI 推文监控台</h1>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-cyan-400/30 px-3 py-1">轮询：60s</span>
                <span className="rounded-full border border-slate-700 px-3 py-1">最后扫描：{scanAt ? new Date(scanAt).toLocaleString() : "-"}</span>
              </div>
            </div>
            <p className="max-w-2xl text-base text-slate-300">
              监控指定的 X 帐号，当推文内容与 AI 相关时自动抓取前 200 字符并保存，同时即时提醒你。
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-cyan-500/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">监控帐号</h2>
                  <p className="text-sm text-slate-400">支持添加多个 X 帐号，默认已监控 @FuSheng_0306</p>
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
                        <p className="text-sm font-medium text-white">@{account.handle}</p>
                        <p className="text-xs text-slate-400">最近检测：{account.lastCheckedAt ? new Date(account.lastCheckedAt).toLocaleString() : "-"}</p>
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">AI 相关推文</h2>
                  <p className="text-sm text-slate-400">仅保存匹配 AI 关键词的内容（前 200 字）</p>
                </div>
                <span className="text-xs text-slate-400">累计 {items.length} 条</span>
              </div>

              <div className="mt-6 space-y-4">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-500">
                    暂无捕获记录。系统将自动扫描并保存符合条件的推文内容。
                  </div>
                ) : (
                  items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>@{item.handle}</span>
                        <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</span>
                      </div>
                      <p className="mt-3 text-sm text-slate-200">{item.content}</p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-xs text-cyan-300 hover:text-cyan-200"
                      >
                        查看原推文 →
                      </a>
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
            <p className="mt-2 whitespace-pre-line text-xs text-slate-300">{toast.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
