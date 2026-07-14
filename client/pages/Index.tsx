import { pingWarp12, sendToWarp12, type JobState, type WarpTab } from "@/lib/warp-bridge";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Atom,
  Bot,
  Check,
  CircleHelp,
  Command,
  Crosshair,
  FlaskConical,
  Gauge,
  Hexagon,
  Layers3,
  Link2,
  Link2Off,
  Loader2,
  Moon,
  Play,
  Radar,
  RefreshCw,
  Repeat,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";

const commandGroups = [
  {
    title: "Autoplay",
    icon: Play,
    tone: "violet",
    commands: [
      { label: "Play with advisor", detail: "Tactical coach · one action", command: "playHumanAction('advisor')", key: "⌘ A" },
      { label: "Play with random", detail: "One legal chart", command: "playHumanAction('random')", key: "⌘ R" },
    ],
  },
  {
    title: "AI control",
    icon: Bot,
    tone: "cyan",
    commands: [
      { label: "Pause AI", detail: "Freeze all officers", command: "pauseAI()", key: "⌘ P" },
      { label: "Resume AI", detail: "Continue simulation", command: "resumeAI()", key: "⌘ ⇧ P" },
    ],
  },
];

type Warp12Sound =
  | "hail"
  | "consoleWarning"
  | "redAlert"
  | "allStop"
  | "dropToImpulse"
  | "returnToWarp"
  | "flash"
  | "wormhole";

const sounds: { name: Warp12Sound; label: string; detail: string; tone: string }[] = [
  { name: "hail", label: "Hail", detail: "Incoming transmission", tone: "cyan" },
  { name: "consoleWarning", label: "Console warning", detail: "System advisory", tone: "amber" },
  { name: "redAlert", label: "Red alert", detail: "Critical warning", tone: "rose" },
  { name: "allStop", label: "All stop", detail: "Halt engines", tone: "violet" },
  { name: "dropToImpulse", label: "Drop to impulse", detail: "Reduce velocity", tone: "indigo" },
  { name: "returnToWarp", label: "Return to warp", detail: "Engage warp drive", tone: "cyan" },
  { name: "flash", label: "Flash", detail: "Tactical flash", tone: "amber" },
  { name: "wormhole", label: "Wormhole", detail: "Spatial anomaly", tone: "violet" },
];

const shortUrl = (url?: string) => {
  if (!url) return "No game tab";
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
};

export default function Index() {
  const [registered, setRegistered] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockAvailable, setUnlockAvailable] = useState(false);
  const [aiPaused, setAiPaused] = useState(false);
  const [seed, setSeed] = useState("482901");
  const [activeTab, setActiveTab] = useState("commands");
  const [activity, setActivity] = useState<{ time: string; text: string; tone: string }[]>([]);
  const [warpTab, setWarpTab] = useState<WarpTab | null>(null);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [autoMode, setAutoMode] = useState<"random" | "advisor">("random");
  const [holdSalamander, setHoldSalamander] = useState(false);
  const [wormholeX, setWormholeX] = useState("");
  const wasUnlockedRef = useRef<boolean | null>(null);
  const prevJobRunningRef = useRef(false);

  const linked = Boolean(warpTab);
  const jobRunning = Boolean(job?.running);

  const pushLog = (text: string, tone = "violet") => {
    setActivity((current) =>
      [{ time: new Date().toLocaleTimeString([], { hour12: false }), text, tone }, ...current].slice(0, 6),
    );
  };

  useEffect(() => {
    let cancelled = false;

    const refreshLink = async () => {
      const { tab, bridgeReady: ready, status } = await pingWarp12();
      if (cancelled) return;

      setWarpTab(tab);
      setBridgeReady(ready);

      if (!ready || !status) {
        if (!tab) setRegistered(false);
        setUnlockAvailable(false);
        setJob(null);
        return;
      }

      const unlocked = status.hasLocalGame;
      setUnlockAvailable(status.hasUnlock || unlocked);
      setRegistered(unlocked);
      setJob(status.job);

      // Log job completion once (running -> not running).
      const j = status.job;
      if (prevJobRunningRef.current && j && !j.running) {
        if (j.error) {
          pushLog(`${j.label || "Job"} failed: ${j.error}`, "rose");
        } else {
          pushLog(`${j.label || "Job"}: ${j.message}`, j.result?.seed != null ? "emerald" : "slate");
          if (j.result?.seed != null) setSeed(String(j.result.seed));
        }
      }
      prevJobRunningRef.current = Boolean(j?.running);

      if (wasUnlockedRef.current === null) {
        wasUnlockedRef.current = unlocked;
        if (unlocked) pushLog("Detected unlocked console (window.localGame)", "emerald");
      } else if (wasUnlockedRef.current !== unlocked) {
        wasUnlockedRef.current = unlocked;
        pushLog(
          unlocked ? "Console unlocked — localGame detected" : "Console locked — localGame cleared",
          unlocked ? "emerald" : "slate",
        );
      }
    };

    void refreshLink();
    const timer = window.setInterval(() => void refreshLink(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const runCommand = async (label: string) => {
    if (!registered) return;
    if (label === "Pause AI") setAiPaused(true);
    if (label === "Resume AI") setAiPaused(false);
    const method =
      label === "Play with advisor" || label === "Play with random"
        ? "playHumanAction"
        : label === "Pause AI"
          ? "pauseAI"
          : "resumeAI";
    const args = label.includes("advisor") ? ["advisor"] : label.includes("random") ? ["random"] : [];
    const response = await sendToWarp12("localGame", { method, args });
    pushLog(response.ok ? `${label} executed` : (response.error ?? `${label} failed`), response.ok ? "violet" : "rose");
  };

  const previewSound = async (sound: Warp12Sound) => {
    if (!registered) return;
    const response = await sendToWarp12("previewSound", { sound });
    pushLog(response.ok ? `Previewed ${sound} sound` : (response.error ?? "Sound preview failed"), response.ok ? "cyan" : "rose");
  };

  const runUnlock = async () => {
    setUnlocking(true);
    pushLog("Running window.GABBAGABBAHEY()…", "cyan");
    try {
      const response = await sendToWarp12("unlock");
      if (response.ok) {
        setRegistered(true);
        wasUnlockedRef.current = true;
        pushLog("Admin session unlocked — localGame ready", "emerald");
      } else {
        pushLog(response.error ?? "Admin unlock failed", "rose");
        const { status } = await pingWarp12();
        if (status?.hasLocalGame) {
          setRegistered(true);
          wasUnlockedRef.current = true;
          pushLog("Detected unlocked console after unlock attempt", "emerald");
        }
      }
    } finally {
      setUnlocking(false);
    }
  };

  const startJob = async (action: string, payload: unknown, label: string) => {
    if (!registered || jobRunning) return;
    const response = await sendToWarp12(action, payload);
    if (response.ok) {
      prevJobRunningRef.current = true;
      pushLog(`${label} started`, "cyan");
    } else {
      pushLog(response.error ?? `${label} failed to start`, "rose");
    }
  };

  const stopJob = async () => {
    const response = await sendToWarp12("stopJob");
    pushLog(response.ok ? "Stop requested" : (response.error ?? "Stop failed"), response.ok ? "amber" : "rose");
  };

  const startAutoplay = () =>
    startJob(
      "startAutoplay",
      { mode: autoMode, holdSalamander },
      holdSalamander ? "Autoplay (hold Salamander)" : `Autoplay (${autoMode})`,
    );

  const findWormhole = () => startJob("findWormholeHand", { x: wormholeX }, "Wormhole hand search");

  const resetSeed = async (kind: "round" | "match") => {
    if (!registered) return;
    const value = Number(seed);
    if (!Number.isInteger(value) || value < 0) {
      pushLog("Enter a valid numeric seed first", "rose");
      return;
    }
    const method = kind === "round" ? "resetRoundWithSeed" : "resetMatchWithSeed";
    const response = await sendToWarp12("localGame", { method, args: [value] });
    pushLog(
      response.ok ? `${kind === "round" ? "Round" : "Match"} reset to seed ${value}` : (response.error ?? "Reset failed"),
      response.ok ? "violet" : "rose",
    );
  };

  const forceSalamanderSwap = async () => {
    if (!registered) return;
    const response = await sendToWarp12("localGame", { method: "forceSalamanderSwap", args: [] });
    pushLog(response.ok ? "forceSalamanderSwap() dispatched" : (response.error ?? "Force swap failed"), response.ok ? "violet" : "rose");
  };

  return (
    <main className="min-h-screen bg-[#080a12] text-slate-100 selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-700/10 blur-[130px]" />
        <div className="absolute right-[-220px] top-[30%] h-[600px] w-[600px] rounded-full bg-cyan-600/[0.06] blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <header className="relative z-10 flex h-14 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-violet-900/30">
            <Hexagon className="h-5 w-5 fill-white/15 text-white" strokeWidth={1.8} />
            <span className="absolute text-[10px] font-black tracking-tighter text-white">12</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm font-bold tracking-[0.18em] text-white">WARP 12</span>
            <span className="rounded bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-violet-300">
              DEVTOOLS
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex max-w-[170px] items-center gap-2 truncate rounded-full border px-2.5 py-1.5 text-[10px] ${
              linked
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/20 bg-amber-400/10 text-amber-200"
            }`}
          >
            {linked ? <Link2 className="h-3 w-3 shrink-0" /> : <Link2Off className="h-3 w-3 shrink-0" />}
            <span className="truncate font-mono">{linked ? shortUrl(warpTab?.url) : "waiting…"}</span>
          </div>
          <button
            aria-label="Settings"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            <Settings2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1420px] px-4 py-5 sm:px-5 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:mb-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
              <Command className="h-3.5 w-3.5" /> Admin command center
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              Control the simulation<span className="text-violet-400">.</span>
            </h1>
            <p className="mt-1.5 max-w-lg text-sm leading-6 text-slate-500">
              Docked beside your game. Commands run in the page context of{" "}
              <span className="font-mono text-slate-400">localhost:4200/local</span>.
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              bridgeReady
                ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400"
            }`}
          >
            <Activity className={`h-3.5 w-3.5 ${bridgeReady ? "text-emerald-400" : "text-slate-500"}`} />
            {bridgeReady ? "Page bridge live" : linked ? "Reload game tab to attach bridge" : "Open /local game tab"}
            <span className="text-slate-600">•</span>
            <span className="font-mono text-slate-500">v0.10.0</span>
          </div>
        </div>

        <section className="mb-5 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#191529] via-[#121321] to-[#0f111b] shadow-2xl shadow-black/20">
          <div className="flex flex-col justify-between gap-5 p-4 sm:gap-6 sm:p-6">
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  registered ? "bg-emerald-400/10 text-emerald-300" : "bg-violet-400/10 text-violet-300"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="font-semibold text-white">Admin access</h2>
                  {registered && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <Check className="h-3 w-3" /> ACTIVE
                    </span>
                  )}
                </div>
                <p className="max-w-xl text-sm leading-6 text-slate-400">
                  {registered
                    ? "Detected window.localGame on the game tab — commands are live."
                    : unlockAvailable
                      ? "GABBAGABBAHEY is available. Unlock to install window.localGame."
                      : "Waiting for the local sim bridge (GABBAGABBAHEY) on the game tab."}
                </p>
              </div>
            </div>
            <button
              disabled={!linked || unlocking}
              onClick={() => void runUnlock()}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                registered
                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                  : "bg-violet-500 text-white shadow-lg shadow-violet-900/30 hover:bg-violet-400"
              }`}
            >
              <Zap className={`h-4 w-4 ${unlocking ? "animate-pulse" : ""}`} />
              {unlocking ? "Unlocking…" : registered ? "Unlocked — run again" : "Unlock console"}
              <span className="ml-1 rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">GABBAGABBAHEY()</span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] px-4 py-3 text-[11px] text-slate-500 sm:px-6">
            <span className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${registered ? "bg-emerald-400" : "bg-amber-400"}`} />
              {registered ? "localGame detected" : "localGame missing"}
            </span>
            <span className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${unlockAvailable ? "bg-emerald-400" : "bg-slate-600"}`} />
              {unlockAvailable ? "Unlock fn ready" : "Unlock fn missing"}
            </span>
            <span className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${linked ? "bg-emerald-400" : "bg-slate-600"}`} /> Linked to{" "}
              {shortUrl(warpTab?.url)}
            </span>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#10121c]/90 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Quick commands</h2>
                <p className="mt-1 text-xs text-slate-500">Runs on window.localGame in the game tab</p>
              </div>
              <div className="flex rounded-lg border border-white/[0.07] bg-black/10 p-1">
                <button
                  onClick={() => setActiveTab("commands")}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    activeTab === "commands" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Commands
                </button>
                <button
                  onClick={() => setActiveTab("state")}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
                    activeTab === "state" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Game state
                </button>
              </div>
            </div>

            {activeTab === "commands" ? (
              <div className="grid gap-4">
                {commandGroups.map((group) => (
                  <div key={group.title} className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div
                        className={`rounded-lg p-2 ${
                          group.tone === "violet" ? "bg-violet-400/10 text-violet-300" : "bg-cyan-400/10 text-cyan-300"
                        }`}
                      >
                        <group.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-200">{group.title}</span>
                    </div>
                    <div className="space-y-2">
                      {group.commands.map((item) => (
                        <button
                          disabled={!registered}
                          onClick={() => runCommand(item.label)}
                          key={item.label}
                          className="group flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2.5 text-left transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <span>
                            <span className="block text-xs font-medium text-slate-200">{item.label}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-500">{item.detail}</span>
                          </span>
                          <span className="rounded border border-white/[0.08] px-1.5 py-1 font-mono text-[9px] text-slate-600 group-hover:text-violet-300">
                            {item.key}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <StateCard icon={Crosshair} label="Current hand" value="7 tiles" detail="getHand()" />
                <StateCard icon={Gauge} label="Active player" value="You" detail="round.activePlayerId" />
                <StateCard icon={Layers3} label="Round seed" value={seed} detail="getRoundSeed()" />
                <StateCard icon={Terminal} label="Game phase" value="Active" detail="game.phase" />
              </div>
            )}

            <div className="my-6 h-px bg-white/[0.06]" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Dev console scripts</h3>
                <p className="mt-1 text-xs text-slate-500">Multi-step routines from the manual, run in the game tab</p>
              </div>
              {jobRunning ? (
                <button
                  onClick={() => void stopJob()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-400/20"
                >
                  <Square className="h-3 w-3" /> Stop job
                </button>
              ) : (
                <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">idle</span>
              )}
            </div>

            {job && (job.running || job.message || job.error) && (
              <div
                className={`mb-4 rounded-xl border p-3 ${
                  job.error
                    ? "border-rose-400/20 bg-rose-400/[0.06]"
                    : job.running
                      ? "border-cyan-400/20 bg-cyan-400/[0.06]"
                      : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {job.running ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                  ) : job.error ? (
                    <Zap className="h-3.5 w-3.5 text-rose-300" />
                  ) : (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  )}
                  <span className="truncate text-xs font-medium text-slate-200">{job.label || "Job"}</span>
                  {(job.steps > 0 || job.attempts > 0) && (
                    <span className="ml-auto font-mono text-[10px] text-slate-500">
                      {job.steps > 0 ? `${job.steps} steps` : `${job.attempts} tries`}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">{job.error || job.message}</p>
                {job.result?.seed != null && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-emerald-200">
                      seed {job.result.seed}
                    </span>
                    {job.result.label && (
                      <span className="rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-slate-300">
                        {job.result.label}
                      </span>
                    )}
                    {job.result.hand && (
                      <span className="w-full truncate font-mono text-[10px] text-slate-500">
                        {job.result.hand.join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="rounded-lg bg-violet-400/10 p-2 text-violet-300">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Round autoplay</span>
                  <span className="ml-auto text-[10px] text-slate-600">plays your seat to round end</span>
                </div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex rounded-lg border border-white/[0.07] bg-black/10 p-1">
                    <button
                      disabled={holdSalamander}
                      onClick={() => setAutoMode("random")}
                      className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-40 ${
                        autoMode === "random" || holdSalamander ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Random
                    </button>
                    <button
                      disabled={holdSalamander}
                      onClick={() => setAutoMode("advisor")}
                      className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-40 ${
                        autoMode === "advisor" && !holdSalamander ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Advisor
                    </button>
                  </div>
                  <button
                    onClick={() => setHoldSalamander((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition ${
                      holdSalamander
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                        : "border-white/[0.07] bg-black/10 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Shield className="h-3 w-3" /> Hold Salamander
                  </button>
                </div>
                <button
                  disabled={!registered || jobRunning}
                  onClick={() => void startAutoplay()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="h-3.5 w-3.5" />
                  {holdSalamander ? "Autoplay holding Salamander (random)" : `Autoplay round (${autoMode})`}
                </button>
                {holdSalamander && (
                  <p className="mt-2 text-[10px] leading-4 text-slate-500">
                    Skips charting <span className="font-mono">maxPip:maxPip</span> and any maxPip lead-in. Random only.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300">
                    <Radar className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Seed finders</span>
                </div>
                <div className="mb-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] text-slate-500">
                      Wormhole X <span className="text-slate-600">(maxPip:X + X:X, you first · blank = any)</span>
                    </label>
                    <input
                      value={wormholeX}
                      onChange={(e) => setWormholeX(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="any"
                      className="h-10 w-full rounded-lg border border-white/[0.09] bg-black/20 px-3 font-mono text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                    />
                  </div>
                  <button
                    disabled={!registered || jobRunning}
                    onClick={() => void findWormhole()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-500/15 px-4 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Radar className="h-3.5 w-3.5" /> Find hand
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    disabled={!registered || jobRunning}
                    onClick={() => void startJob("findSwapSetup", {}, "Salamander swap setup search")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2.5 text-[11px] font-medium text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FlaskConical className="h-3.5 w-3.5" /> Swap setup
                  </button>
                  <button
                    disabled={!registered || jobRunning}
                    onClick={() => void startJob("findSalamanderOnly", {}, "Salamander search")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2.5 text-[11px] font-medium text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Atom className="h-3.5 w-3.5" /> Salamander
                  </button>
                  <button
                    disabled={!registered || jobRunning}
                    onClick={() => void startJob("findDoubleBlank", {}, "Double blank search")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2.5 text-[11px] font-medium text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Search className="h-3.5 w-3.5" /> Double blank
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">
                  Swap setup and Salamander searches need round 2+ (Salamander is Spacedock in round 1).
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="rounded-lg bg-amber-400/10 p-2 text-amber-300">
                    <Wand2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">Salamander swap</span>
                </div>
                <button
                  disabled={!registered || jobRunning}
                  onClick={() => void forceSalamanderSwap()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wand2 className="h-3.5 w-3.5" /> forceSalamanderSwap()
                </button>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">
                  Forces the Continuum flash on the current round. Needs Modules Alpha + Beta on, round 2+.
                </p>
              </div>
            </div>

            <div className="my-6 h-px bg-white/[0.06]" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Soundboard</h3>
                <p className="mt-1 text-xs text-slate-500">Preview bridge audio cues without leaving the game</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-medium text-cyan-300">
                <Volume2 className="h-3 w-3" /> window.warp12
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sounds.map((sound) => (
                <button
                  key={sound.name}
                  disabled={!registered}
                  onClick={() => previewSound(sound.name)}
                  className="group rounded-lg border border-white/[0.07] bg-white/[0.018] p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    className={`mb-2 flex h-7 w-7 items-center justify-center rounded-md ${
                      sound.tone === "cyan"
                        ? "bg-cyan-400/10 text-cyan-300"
                        : sound.tone === "amber"
                          ? "bg-amber-400/10 text-amber-300"
                          : sound.tone === "rose"
                            ? "bg-rose-400/10 text-rose-300"
                            : sound.tone === "indigo"
                              ? "bg-indigo-400/10 text-indigo-300"
                              : "bg-violet-400/10 text-violet-300"
                    }`}
                  >
                    <Volume2 className="h-3.5 w-3.5 transition group-hover:scale-110" />
                  </span>
                  <span className="block truncate text-[11px] font-medium text-slate-200">{sound.label}</span>
                  <span className="mt-1 block truncate text-[9px] text-slate-600">{sound.detail}</span>
                </button>
              ))}
            </div>

            <div className="my-6 h-px bg-white/[0.06]" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Seed control</h3>
                <p className="mt-1 text-xs text-slate-500">Reproduce a deal or search for a specific hand</p>
              </div>
              <button className="flex items-center gap-1.5 text-[11px] text-slate-500 transition hover:text-slate-300">
                <CircleHelp className="h-3.5 w-3.5" /> How seeds work
              </button>
            </div>
            <div className="grid gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  value={seed}
                  onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ""))}
                  className="h-11 w-full rounded-lg border border-white/[0.09] bg-black/20 pl-9 pr-3 font-mono text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                  placeholder="Enter a seed"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!registered || jobRunning}
                  onClick={() => void resetSeed("round")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.09] px-4 text-xs font-medium text-slate-300 transition hover:border-violet-400/40 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset round
                </button>
                <button
                  disabled={!registered || jobRunning}
                  onClick={() => void resetSeed("match")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-500/15 px-4 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset match
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-500">
                Current match <b className="ml-1 text-slate-300">482901</b>
              </span>
              <span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-500">
                Current round <b className="ml-1 text-slate-300">{seed || "—"}</b>
              </span>
              <button
                onClick={() => {
                  setSeed("482901");
                  pushLog("Current seed loaded", "cyan");
                }}
                className="ml-auto text-[10px] text-violet-300 hover:text-violet-200"
              >
                Load current
              </button>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#10121c]/90 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Live activity</h2>
                  <p className="mt-1 text-xs text-slate-500">Command output</p>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <Activity className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="space-y-4">
                {activity.length === 0 ? (
                  <p className="text-xs text-slate-600">Watching for unlock on the linked game tab…</p>
                ) : (
                  activity.map((log, index) => (
                  <div className="flex gap-3" key={`${log.time}-${index}`}>
                    <div className="relative mt-1.5 flex flex-col items-center">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          log.tone === "emerald"
                            ? "bg-emerald-400"
                            : log.tone === "cyan"
                              ? "bg-cyan-400"
                              : log.tone === "violet"
                                ? "bg-violet-400"
                                : log.tone === "rose"
                                  ? "bg-rose-400"
                                  : "bg-slate-500"
                        }`}
                      />
                      {index < activity.length - 1 && <span className="absolute top-2 h-7 w-px bg-white/[0.08]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-slate-300">{log.text}</p>
                      <p className="mt-1 font-mono text-[10px] text-slate-600">{log.time}</p>
                    </div>
                  </div>
                  ))
                )}
              </div>
              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.07] py-2 text-[11px] text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300">
                <ArrowDownToLine className="h-3.5 w-3.5" /> View console output
              </button>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#10121c]/90 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-300" />
                <h2 className="text-sm font-semibold text-white">AI execution</h2>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-300">AI officers</p>
                  <p className="mt-1 text-[10px] text-slate-500">{aiPaused ? "Paused for inspection" : "Running normally"}</p>
                </div>
                <button
                  disabled={!registered}
                  onClick={() => void runCommand(aiPaused ? "Resume AI" : "Pause AI")}
                  className={`relative h-6 w-11 rounded-full transition ${aiPaused ? "bg-slate-700" : "bg-violet-500"}`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${aiPaused ? "left-1" : "left-6"}`}
                  />
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.07] to-transparent p-5">
              <Sparkles className="mb-3 h-4 w-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-white">Need a deeper look?</h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Inspect the complete game object or open the browser console for raw output.
              </p>
              <button className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">
                Open game inspector <Send className="h-3 w-3" />
              </button>
            </div>
          </aside>
        </div>
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-5 text-[10px] text-slate-600 sm:flex-row">
          <span>
            WARP 12 DEVTOOLS <span className="mx-1 text-slate-700">/</span> For local simulation environments only
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> No production access
          </span>
        </footer>
      </div>
    </main>
  );
}

function StateCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Crosshair;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
      <Icon className="mb-4 h-4 w-4 text-violet-300" />
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-200">{value}</p>
      <p className="mt-1 font-mono text-[10px] text-slate-600">{detail}</p>
    </div>
  );
}
