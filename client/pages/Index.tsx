import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Copy,
  Crosshair,
  Gauge,
  Hexagon,
  Layers3,
  Moon,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Volume2,
  Zap,
} from "lucide-react";

const commandGroups = [
  {
    title: "Autoplay",
    icon: Play,
    tone: "violet",
    commands: [
      { label: "Play with advisor", detail: "Tactical coach", command: "playHumanAction('advisor')", key: "⌘ A" },
      { label: "Play with random", detail: "Uniform legal move", command: "playHumanAction('random')", key: "⌘ R" },
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

type Warp12Sound = "hail" | "consoleWarning" | "redAlert" | "allStop" | "dropToImpulse" | "returnToWarp" | "flash" | "wormhole";

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

type BridgeResponse = { ok: boolean; value?: unknown; error?: string };

type ChromeRuntime = {
  tabs?: { query: (query: { active: boolean; currentWindow: boolean }) => Promise<Array<{ id?: number }>>; sendMessage: (tabId: number, message: unknown) => Promise<BridgeResponse> };
};

const sendToWarp12 = async (action: string, payload?: unknown): Promise<BridgeResponse> => {
  const chromeApi = (globalThis as typeof globalThis & { chrome?: ChromeRuntime }).chrome;
  const tabs = chromeApi?.tabs;
  if (tabs) {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) return tabs.sendMessage(tab.id, { action, payload });
  }
  return { ok: false, error: "Open a local Warp 12 simulation tab to use bridge commands." };
};

const logs = [
  { time: "14:32:08", text: "Admin session unlocked", tone: "emerald" },
  { time: "14:31:42", text: "Connected to local simulation", tone: "cyan" },
  { time: "14:30:17", text: "Warp 12 bridge detected", tone: "slate" },
];

export default function Index() {
  const [registered, setRegistered] = useState(false);
  const [aiPaused, setAiPaused] = useState(false);
  const [seed, setSeed] = useState("482901");
  const [activeTab, setActiveTab] = useState("commands");
  const [activity, setActivity] = useState(logs);
  const [copied, setCopied] = useState(false);

  const pushLog = (text: string, tone = "violet") => {
    setActivity((current) => [{ time: new Date().toLocaleTimeString([], { hour12: false }), text, tone }, ...current].slice(0, 5));
  };

  const runCommand = async (label: string) => {
    if (!registered) return;
    if (label === "Pause AI") setAiPaused(true);
    if (label === "Resume AI") setAiPaused(false);
    const method = label === "Play with advisor" ? "playHumanAction" : label === "Play with random" ? "playHumanAction" : label === "Pause AI" ? "pauseAI" : "resumeAI";
    const args = label.includes("advisor") ? ["advisor"] : label.includes("random") ? ["random"] : [];
    const response = await sendToWarp12("localGame", { method, args });
    pushLog(response.ok ? `${label} executed` : response.error ?? `${label} failed`, response.ok ? "violet" : "rose");
  };

  const previewSound = async (sound: Warp12Sound) => {
    if (!registered) return;
    const response = await sendToWarp12("previewSound", { sound });
    pushLog(response.ok ? `Previewed ${sound} sound` : response.error ?? "Sound preview failed", response.ok ? "cyan" : "rose");
  };

  const copySnippet = () => {
    navigator.clipboard?.writeText("await window.GABBAGABBAHEY()");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    pushLog("Unlock snippet copied", "cyan");
  };

  return (
    <main className="min-h-screen bg-[#080a12] text-slate-100 selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-700/10 blur-[130px]" />
        <div className="absolute right-[-220px] top-[30%] h-[600px] w-[600px] rounded-full bg-cyan-600/[0.06] blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <header className="relative z-10 flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-violet-900/30">
            <Hexagon className="h-5 w-5 fill-white/15 text-white" strokeWidth={1.8} />
            <span className="absolute text-[10px] font-black tracking-tighter text-white">12</span>
          </div>
          <div>
            <div className="flex items-center gap-2"><span className="text-sm font-bold tracking-[0.18em] text-white">WARP 12</span><span className="rounded bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-violet-300">DEVTOOLS</span></div>
            <p className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-slate-500">LOCAL SIMULATION BRIDGE</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[11px] text-slate-400 sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Bridge online <span className="ml-1 text-slate-600">•</span> v0.8.4</div>
          <button aria-label="Settings" className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"><Settings2 className="h-[18px] w-[18px]" /></button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/20 bg-violet-400/10 text-xs font-semibold text-violet-200">ZC</div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1420px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300"><Command className="h-3.5 w-3.5" /> Admin command center</div><h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-[38px]">Control the simulation<span className="text-violet-400">.</span></h1><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">A fast lane to the tools you use most. Execute commands directly against your local Warp 12 game.</p></div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><Activity className="h-4 w-4 text-emerald-400" /><span>Session uptime</span><span className="font-mono text-slate-300">00:18:42</span></div>
        </div>

        <section className="mb-5 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#191529] via-[#121321] to-[#0f111b] shadow-2xl shadow-black/20">
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-7 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4"><div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${registered ? "bg-emerald-400/10 text-emerald-300" : "bg-violet-400/10 text-violet-300"}`}><ShieldCheck className="h-5 w-5" /></div><div><div className="mb-1 flex items-center gap-2"><h2 className="font-semibold text-white">Admin access</h2>{registered && <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"><Check className="h-3 w-3" /> ACTIVE</span>}</div><p className="max-w-xl text-sm leading-6 text-slate-400">{registered ? "Your admin session is unlocked. Commands are ready to run against the current local game." : "Register this bridge with Warp 12 to unlock the local game command surface."}</p></div></div>
            <button onClick={async () => { if (registered) { setRegistered(false); pushLog("Admin session locked", "slate"); return; } const response = await sendToWarp12("unlock"); if (response.ok) { setRegistered(true); pushLog("Admin session unlocked", "emerald"); } else { pushLog(response.error ?? "Admin unlock failed", "rose"); } }} className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${registered ? "border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10" : "bg-violet-500 text-white shadow-lg shadow-violet-900/30 hover:bg-violet-400"}`}><Zap className="h-4 w-4" />{registered ? "Lock session" : "Register bridge"}<span className="ml-1 rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">gabagabbahey</span></button>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] px-5 py-3 text-[11px] text-slate-500 sm:px-7"><span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${registered ? "bg-emerald-400" : "bg-amber-400"}`} /> Firebase admin claim</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-slate-600" /> Local simulation only</span><button onClick={copySnippet} className="ml-auto flex items-center gap-1.5 text-violet-300 transition hover:text-violet-200">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy unlock snippet"}</button></div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#10121c]/90 p-5 sm:p-7">
            <div className="mb-6 flex items-center justify-between"><div><h2 className="text-base font-semibold text-white">Quick commands</h2><p className="mt-1 text-xs text-slate-500">Common actions for your current game</p></div><div className="flex rounded-lg border border-white/[0.07] bg-black/10 p-1"><button onClick={() => setActiveTab("commands")} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${activeTab === "commands" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>Commands</button><button onClick={() => setActiveTab("state")} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${activeTab === "state" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>Game state</button></div></div>
            {activeTab === "commands" ? <div className="grid gap-4 sm:grid-cols-2">{commandGroups.map((group) => <div key={group.title} className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4"><div className="mb-4 flex items-center gap-2.5"><div className={`rounded-lg p-2 ${group.tone === "violet" ? "bg-violet-400/10 text-violet-300" : "bg-cyan-400/10 text-cyan-300"}`}><group.icon className="h-4 w-4" /></div><span className="text-sm font-medium text-slate-200">{group.title}</span></div><div className="space-y-2">{group.commands.map((item) => <button disabled={!registered} onClick={() => runCommand(item.label)} key={item.label} className="group flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2.5 text-left transition hover:border-violet-400/30 hover:bg-violet-400/[0.06] disabled:cursor-not-allowed disabled:opacity-45"><span><span className="block text-xs font-medium text-slate-200">{item.label}</span><span className="mt-0.5 block text-[10px] text-slate-500">{item.detail}</span></span><span className="rounded border border-white/[0.08] px-1.5 py-1 font-mono text-[9px] text-slate-600 group-hover:text-violet-300">{item.key}</span></button>)}</div></div>)}</div> : <div className="grid gap-3 sm:grid-cols-2"><StateCard icon={Crosshair} label="Current hand" value="7 tiles" detail="getHand()" /><StateCard icon={Gauge} label="Active player" value="You" detail="round.activePlayerId" /><StateCard icon={Layers3} label="Round seed" value="{seed}" detail="getRoundSeed()" /><StateCard icon={Terminal} label="Game phase" value="Active" detail="game.phase" /></div>}

            <div className="my-6 h-px bg-white/[0.06]" />
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-white">Soundboard</h3><p className="mt-1 text-xs text-slate-500">Preview bridge audio cues without leaving the game</p></div><span className="flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-medium text-cyan-300"><Volume2 className="h-3 w-3" /> window.warp12</span></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{sounds.map((sound) => <button key={sound.name} disabled={!registered} onClick={() => previewSound(sound.name)} className="group rounded-lg border border-white/[0.07] bg-white/[0.018] p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.06] disabled:cursor-not-allowed disabled:opacity-40"><span className={`mb-2 flex h-7 w-7 items-center justify-center rounded-md ${sound.tone === "cyan" ? "bg-cyan-400/10 text-cyan-300" : sound.tone === "amber" ? "bg-amber-400/10 text-amber-300" : sound.tone === "rose" ? "bg-rose-400/10 text-rose-300" : sound.tone === "indigo" ? "bg-indigo-400/10 text-indigo-300" : "bg-violet-400/10 text-violet-300"}`}><Volume2 className="h-3.5 w-3.5 transition group-hover:scale-110" /></span><span className="block truncate text-[11px] font-medium text-slate-200">{sound.label}</span><span className="mt-1 block truncate text-[9px] text-slate-600">{sound.detail}</span></button>)}</div>

            <div className="my-6 h-px bg-white/[0.06]" />
            <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-white">Seed control</h3><p className="mt-1 text-xs text-slate-500">Reproduce a deal or search for a specific hand</p></div><button className="flex items-center gap-1.5 text-[11px] text-slate-500 transition hover:text-slate-300"><CircleHelp className="h-3.5 w-3.5" /> How seeds work</button></div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input value={seed} onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ""))} className="h-11 w-full rounded-lg border border-white/[0.09] bg-black/20 pl-9 pr-3 font-mono text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50" placeholder="Enter a seed" /></div><button disabled={!registered} onClick={() => pushLog(`Round reset to seed ${seed}`)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[0.09] px-4 text-xs font-medium text-slate-300 transition hover:border-violet-400/40 hover:bg-white/[0.04] disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Reset round</button><button disabled={!registered} onClick={() => pushLog(`Match reset to seed ${seed}`)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-500/15 px-4 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-40"><RefreshCw className="h-3.5 w-3.5" /> Reset match</button></div>
            <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-500">Current match <b className="ml-1 text-slate-300">482901</b></span><span className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-slate-500">Current round <b className="ml-1 text-slate-300">{seed || "—"}</b></span><button onClick={() => { setSeed("482901"); pushLog("Current seed loaded", "cyan"); }} className="ml-auto text-[10px] text-violet-300 hover:text-violet-200">Load current</button></div>
          </div>

          <aside className="space-y-5"><div className="rounded-2xl border border-white/[0.08] bg-[#10121c]/90 p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-semibold text-white">Live activity</h2><p className="mt-1 text-xs text-slate-500">Command output</p></div><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><Activity className="h-3.5 w-3.5" /></span></div><div className="space-y-4">{activity.map((log, index) => <div className="flex gap-3" key={`${log.time}-${index}`}><div className="relative mt-1.5 flex flex-col items-center"><span className={`h-1.5 w-1.5 rounded-full ${log.tone === "emerald" ? "bg-emerald-400" : log.tone === "cyan" ? "bg-cyan-400" : log.tone === "violet" ? "bg-violet-400" : "bg-slate-500"}`} />{index < activity.length - 1 && <span className="absolute top-2 h-7 w-px bg-white/[0.08]" />}</div><div className="min-w-0"><p className="truncate text-xs text-slate-300">{log.text}</p><p className="mt-1 font-mono text-[10px] text-slate-600">{log.time}</p></div></div>)}</div><button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.07] py-2 text-[11px] text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300"><ArrowDownToLine className="h-3.5 w-3.5" /> View console output</button></div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#10121c]/90 p-5"><div className="mb-4 flex items-center gap-2"><Moon className="h-4 w-4 text-indigo-300" /><h2 className="text-sm font-semibold text-white">AI execution</h2></div><div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-3"><div><p className="text-xs font-medium text-slate-300">AI officers</p><p className="mt-1 text-[10px] text-slate-500">{aiPaused ? "Paused for inspection" : "Running normally"}</p></div><button disabled={!registered} onClick={() => { setAiPaused(!aiPaused); pushLog(aiPaused ? "AI resumed" : "AI paused"); }} className={`relative h-6 w-11 rounded-full transition ${aiPaused ? "bg-slate-700" : "bg-violet-500"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${aiPaused ? "left-1" : "left-6"}`} /></button></div></div>
            <div className="rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/[0.07] to-transparent p-5"><Sparkles className="mb-3 h-4 w-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">Need a deeper look?</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Inspect the complete game object or open the browser console for raw output.</p><button className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200">Open game inspector <Send className="h-3 w-3" /></button></div>
          </aside>
        </div>
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-white/[0.06] pt-5 text-[10px] text-slate-600 sm:flex-row"><span>WARP 12 DEVTOOLS <span className="mx-1 text-slate-700">/</span> For local simulation environments only</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> No production access</span></footer>
      </div>
    </main>
  );
}

function StateCard({ icon: Icon, label, value, detail }: { icon: typeof Crosshair; label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-white/[0.07] bg-white/[0.018] p-4"><Icon className="mb-4 h-4 w-4 text-violet-300" /><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-200">{value}</p><p className="mt-1 font-mono text-[10px] text-slate-600">{detail}</p></div>;
}
