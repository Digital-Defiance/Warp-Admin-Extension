export type BridgeResponse = { ok: boolean; value?: unknown; error?: string };

export type JobResult = {
  seed?: number;
  hand?: string[];
  label?: string;
};

export type JobState = {
  name: string | null;
  label: string;
  running: boolean;
  steps: number;
  attempts: number;
  message: string;
  result: JobResult | null;
  error: string | null;
};

export type BridgeStatus = {
  hasLocalGame: boolean;
  hasUnlock: boolean;
  hasWarp12: boolean;
  href?: string;
  maxPip: number | null;
  roundNumber: number | null;
  job: JobState | null;
};

export type WarpTab = {
  id: number;
  url: string;
  title?: string;
};

type ChromeTabs = {
  query: (query: Record<string, unknown>) => Promise<Array<{ id?: number; url?: string; title?: string; active?: boolean }>>;
  sendMessage: (tabId: number, message: unknown) => Promise<BridgeResponse>;
};

type ChromeRuntime = {
  tabs?: ChromeTabs;
  lastError?: { message?: string };
};

const WARP_TAB_PATTERNS = [
  "http://localhost:4200/*",
  "http://127.0.0.1:4200/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];

const getChrome = () => (globalThis as typeof globalThis & { chrome?: ChromeRuntime }).chrome;

const isLocalSimUrl = (url?: string) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return isLocalHost && (parsed.pathname === "/local" || parsed.pathname.startsWith("/local/"));
  } catch {
    return false;
  }
};

const rankTab = (tab: { url?: string; active?: boolean }) => {
  let score = 0;
  if (isLocalSimUrl(tab.url)) score += 100;
  if (tab.url?.includes(":4200")) score += 20;
  if (tab.active) score += 5;
  return score;
};

const parseJobState = (value: unknown): JobState | null => {
  if (!value || typeof value !== "object") return null;
  const job = value as Record<string, unknown>;
  const rawResult = job.result as Record<string, unknown> | null | undefined;
  return {
    name: typeof job.name === "string" ? job.name : null,
    label: typeof job.label === "string" ? job.label : "",
    running: Boolean(job.running),
    steps: typeof job.steps === "number" ? job.steps : 0,
    attempts: typeof job.attempts === "number" ? job.attempts : 0,
    message: typeof job.message === "string" ? job.message : "",
    error: typeof job.error === "string" ? job.error : null,
    result: rawResult
      ? {
          seed: typeof rawResult.seed === "number" ? rawResult.seed : undefined,
          hand: Array.isArray(rawResult.hand) ? (rawResult.hand as string[]) : undefined,
          label: typeof rawResult.label === "string" ? rawResult.label : undefined,
        }
      : null,
  };
};

const parseBridgeStatus = (value: unknown): BridgeStatus | null => {
  if (!value || typeof value !== "object") return null;
  const status = value as Record<string, unknown>;
  return {
    hasLocalGame: Boolean(status.hasLocalGame),
    hasUnlock: Boolean(status.hasUnlock),
    hasWarp12: Boolean(status.hasWarp12),
    href: typeof status.href === "string" ? status.href : undefined,
    maxPip: typeof status.maxPip === "number" ? status.maxPip : null,
    roundNumber: typeof status.roundNumber === "number" ? status.roundNumber : null,
    job: parseJobState(status.job),
  };
};

export const findWarpTab = async (): Promise<WarpTab | null> => {
  const tabsApi = getChrome()?.tabs;
  if (!tabsApi) return null;

  const matches = await tabsApi.query({ url: WARP_TAB_PATTERNS });
  const ranked = [...matches]
    .filter((tab) => tab.id !== undefined && tab.url)
    .sort((a, b) => rankTab(b) - rankTab(a));

  const best = ranked[0];
  if (!best?.id || !best.url) return null;
  return { id: best.id, url: best.url, title: best.title };
};

export const sendToWarp12 = async (action: string, payload?: unknown): Promise<BridgeResponse> => {
  const tabsApi = getChrome()?.tabs;
  if (!tabsApi) {
    return { ok: false, error: "Open this panel from the Chrome extension (not the Vite preview)." };
  }

  const tab = await findWarpTab();
  if (!tab) {
    return {
      ok: false,
      error: "No Warp local sim found. Open http://localhost:4200/local in a tab.",
    };
  }

  try {
    return await tabsApi.sendMessage(tab.id, { action, payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reach the Warp page bridge.";
    return {
      ok: false,
      error: `${message} Reload the game tab after installing/updating the extension.`,
    };
  }
};

/** Probe page state — unlocked when window.localGame is installed. */
export const pingWarp12 = async (): Promise<{
  tab: WarpTab | null;
  bridgeReady: boolean;
  status: BridgeStatus | null;
}> => {
  const tab = await findWarpTab();
  if (!tab) {
    return { tab: null, bridgeReady: false, status: null };
  }

  const probe = await sendToWarp12("ping");
  if (!probe.ok) {
    return { tab, bridgeReady: false, status: null };
  }

  return { tab, bridgeReady: true, status: parseBridgeStatus(probe.value) };
};
