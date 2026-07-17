const SYNCIN_SCAN_BASE_URL = "https://syncin.ua-cit.com/scan";
const SYNCIN_SCAN_HOST = "syncin.ua-cit.com";

export function buildSyncInScanUrl({ qrUrl = "", qrToken = "" } = {}) {
  const token = String(qrToken || "").trim();
  const url = String(qrUrl || "").trim();

  if (url) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const scanIndex = parts.findIndex((part) => part.toLowerCase() === "scan");
      if (
        parsed.protocol === "https:" &&
        parsed.hostname === SYNCIN_SCAN_HOST &&
        scanIndex >= 0 &&
        parts[scanIndex + 1]
      ) {
        return url;
      }
    } catch {
      // Fall back to qr_token below.
    }
  }

  return token ? `${SYNCIN_SCAN_BASE_URL}/${encodeURIComponent(token)}` : "";
}
