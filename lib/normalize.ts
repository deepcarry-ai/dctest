export function normalizeHandle(input: string): string {
  let handle = input.trim();
  if (!handle) return "";
  handle = handle.replace(/^@/, "");

  try {
    if (handle.startsWith("http")) {
      const url = new URL(handle);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        handle = parts[0];
      }
    }
  } catch {
    // ignore parse errors
  }

  return handle.replace(/^@/, "").trim();
}
