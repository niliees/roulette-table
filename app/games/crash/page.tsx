"use client";
import { useState, useRef, useEffect } from "react";
import GameNav from "@/components/GameNav";
import AdminPanel from "@/components/AdminPanel";
import { loadBalance, saveBalance } from "@/lib/balance";

// ── Types ──────────────────────────────────────────────────────────────────
type Phase = "idle" | "running" | "crashed" | "cashedout";

interface HistoryEntry {
  value: number;
  crashed: boolean;
}

// Crash point generation: provably fair formula
function generateCrashPoint(): number {
  const r = Math.random();
  if (r < 0.01) return 1.0; // 1% instant crash
  return Math.max(1.0, Math.round(99 / (1 - r)) / 100);
}

const CHIPS = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
const MAX_HISTORY = 12;

// ── Graph Component ────────────────────────────────────────────────────────
function CrashGraph({ multiplier, phase }: { multiplier: number; phase: Phase }) {
  const color = phase === "crashed" ? "#f87171"
    : multiplier >= 2 ? "#4ade80"
    : "#c9a84c";

  return (
    <div style={{
      position: "relative",
      width: "100%", height: 220,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Grid lines */}
      {[2, 3, 5, 10].map(v => (
        <div key={v} style={{
          position: "absolute", left: 0, right: 0,
          bottom: `${Math.min(95, (v - 1) * 15)}%`,
          borderTop: "1px dashed rgba(255,255,255,0.05)",
        }}>
          <span style={{
            position: "absolute", left: 8, top: -10,
            fontFamily: "monospace", fontSize: 10,
            color: "rgba(255,255,255,0.2)",
          }}>{v}×</span>
        </div>
      ))}

      {/* Multiplier display */}
      <div style={{
        textAlign: "center", zIndex: 2,
        transition: "color 0.3s",
      }}>
        <div style={{
          fontSize: multiplier >= 100 ? 52 : multiplier >= 10 ? 64 : 80,
          fontWeight: "bold",
          fontFamily: "monospace",
          color,
          letterSpacing: 2,
          textShadow: `0 0 30px ${color}66`,
          lineHeight: 1,
          transition: "font-size 0.1s, color 0.3s",
        }}>
          {multiplier.toFixed(2)}×
        </div>
        {phase === "crashed" && (
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 18, color: "#f87171", letterSpacing: 2 }}>
            CRASHED!
          </div>
        )}
        {phase === "cashedout" && (
          <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 18, color: "#4ade80", letterSpacing: 2 }}>
            CASHED OUT
          </div>
        )}
        {phase === "idle" && (
          <div style={{ fontFamily: "monospace", fontSize: 16, color: "rgba(240,230,200,0.4)", letterSpacing: 2 }}>
            WAITING...
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CrashPage() {
  const [balance, setBalance] = useState(() => loadBalance());
  const [bet, setBet] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [message, setMessage] = useState<{ text: string; win: boolean } | null>(null);
  const [autoCashout, setAutoCashout] = useState<string>("0");
  const [showAdmin, setShowAdmin] = useState(false);
  const [infiniteBalance, setInfiniteBalance] = useState(false);
  const [forceCrashAt, setForceCrashAt] = useState("");

  // Refs to avoid stale closures in rAF loop
  const phaseRef = useRef<Phase>("idle");
  const multRef = useRef(1.0);
  const betRef = useRef(0);
  const balanceRef = useRef(1000);
  const crashPointRef = useRef(1.0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const autoCashoutRef = useRef(0);
  const infiniteBalRef = useRef(false);
  const autoRoundRef = useRef(false);
  const minCrashRef = useRef(0);
  const startRoundFnRef = useRef<() => void>(() => {});
  const [adminTab, setAdminTab] = useState<"control"|"stats">("control");
  const [minCrashAt, setMinCrashAt] = useState("");
  const [autoRound, setAutoRound] = useState(false);
  const [crashStats, setCrashStats] = useState({ rounds: 0, cashed: 0, crashed: 0, sumMult: 0, best: 0 });

  useEffect(() => {
    window.admin = () => setShowAdmin(true);
    return () => { window.admin = undefined; };
  }, []);

  useEffect(() => { startRoundFnRef.current = startRound; });

  useEffect(() => {
    if (!autoRound || (phase !== "crashed" && phase !== "cashedout")) return;
    const t = setTimeout(() => {
      if (!autoRoundRef.current) return;
      phaseRef.current = "idle";
      setPhase("idle");
      setTimeout(() => { if (autoRoundRef.current) startRoundFnRef.current(); }, 400);
    }, 2000);
    return () => clearTimeout(t);
  }, [phase, autoRound]); // eslint-disable-line react-hooks/exhaustive-deps

  function addChip(v: number) {
    if (phase !== "idle") return;
    if (bet + v > balance) return;
    setBet(b => { betRef.current = b + v; return b + v; });
  }

  function clearBet() {
    if (phase !== "idle") return;
    setBet(0);
    betRef.current = 0;
  }

  function cashOut() {
    if (phaseRef.current !== "running") return;
    phaseRef.current = "cashedout";
    setPhase("cashedout");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const mult = multRef.current;
    const winnings = betRef.current * mult;
    const newBal = balanceRef.current - betRef.current + winnings;
    balanceRef.current = newBal;
    setBalance(newBal);
    saveBalance(newBal);
    setMessage({ text: `Cashed out at ${mult.toFixed(2)}\u00d7 \u2014 +$${(winnings - betRef.current).toFixed(2)}`, win: true });
    setHistory(h => [{ value: mult, crashed: false }, ...h].slice(0, MAX_HISTORY));    setCrashStats(s => ({ rounds: s.rounds + 1, cashed: s.cashed + 1, crashed: s.crashed, sumMult: s.sumMult + mult, best: Math.max(s.best, mult) }));  }

  function startRound() {
    if (bet < 1 || phaseRef.current !== "idle") return;

    const crashPoint = generateCrashPoint();
    const forcedVal = parseFloat(forceCrashAt);
    const minVal = minCrashRef.current;
    let cp = (!isNaN(forcedVal) && forcedVal >= 1.0) ? forcedVal : crashPoint;
    if (minVal > 1.0 && cp < minVal) cp = parseFloat((minVal + Math.random() * 2).toFixed(2));
    crashPointRef.current = cp;
    phaseRef.current = "running";
    multRef.current = 1.0;
    betRef.current = bet;
    balanceRef.current = balance;
    infiniteBalRef.current = infiniteBalance;
    const acVal = parseFloat(autoCashout);
    autoCashoutRef.current = isNaN(acVal) ? 0 : acVal;

    setPhase("running");
    setMultiplier(1.0);
    setMessage(null);
    startTimeRef.current = performance.now();

    function tick(ts: number) {
      if (phaseRef.current !== "running") return;
      const elapsed = (ts - startTimeRef.current) / 1000;
      const newMult = Math.round(Math.exp(0.3 * elapsed) * 100) / 100;
      multRef.current = newMult;
      setMultiplier(newMult);

      // Auto cash-out
      if (autoCashoutRef.current >= 1.01 && newMult >= autoCashoutRef.current) {
        phaseRef.current = "cashedout";
        setPhase("cashedout");
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const winnings = betRef.current * newMult;
        const nb = balanceRef.current - betRef.current + winnings;
        balanceRef.current = nb;
        setBalance(nb);
        saveBalance(nb);
        setMessage({ text: `Cashed out at ${newMult.toFixed(2)}\u00d7 \u2014 +$${(winnings - betRef.current).toFixed(2)}`, win: true });
        setHistory(h => [{ value: newMult, crashed: false }, ...h].slice(0, MAX_HISTORY));
        setCrashStats(s => ({ rounds: s.rounds + 1, cashed: s.cashed + 1, crashed: s.crashed, sumMult: s.sumMult + newMult, best: Math.max(s.best, newMult) }));
        return;
      }

      // Check crash
      if (newMult >= crashPointRef.current) {
        phaseRef.current = "crashed";
        setPhase("crashed");
        setMultiplier(crashPointRef.current);
        setHistory(h => [{ value: crashPointRef.current, crashed: true }, ...h].slice(0, MAX_HISTORY));
        const nb = infiniteBalRef.current ? balanceRef.current : balanceRef.current - betRef.current;
        balanceRef.current = nb;
        setBalance(nb);
        saveBalance(nb);
        setMessage({ text: `Crashed at ${crashPointRef.current.toFixed(2)}\u00d7. Lost $${betRef.current}.`, win: false });        setCrashStats(s => ({ rounds: s.rounds + 1, cashed: s.cashed, crashed: s.crashed + 1, sumMult: s.sumMult + crashPointRef.current, best: Math.max(s.best, crashPointRef.current) }));        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function reset() {
    if (!autoRoundRef.current) { setBet(0); betRef.current = 0; }
    setMultiplier(1.0);
    setMessage(null);
    setPhase("idle");
    phaseRef.current = "idle";
  }

  const acVal = parseFloat(autoCashout);
  const acEnabled = !isNaN(acVal) && acVal >= 1.01;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #1a0814 0%, #0a0814 60%)",
      color: "#f0e6c8",
      fontFamily: "Georgia, serif",
    }}>
      <GameNav balance={balance} title="Crash" />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 16px 40px" }}>
        <h1 style={{
          textAlign: "center", fontSize: 26, letterSpacing: 4,
          color: "#c9a84c", textTransform: "uppercase", marginBottom: 4,
        }}>Crash</h1>
        <p style={{ textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "rgba(240,230,200,0.4)", marginBottom: 28, letterSpacing: 2 }}>
          CASH OUT BEFORE THE MULTIPLIER CRASHES
        </p>

        {/* History bar */}
        {history.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, justifyContent: "center" }}>
            {history.map((h, i) => (
              <span key={i} style={{
                fontFamily: "monospace", fontSize: 12, fontWeight: "bold",
                padding: "3px 8px", borderRadius: 5,
                background: h.crashed ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                color: h.crashed ? "#f87171" : "#4ade80",
                border: `1px solid ${h.crashed ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
              }}>{h.value.toFixed(2)}×</span>
            ))}
          </div>
        )}

        {/* Graph */}
        <CrashGraph multiplier={multiplier} phase={phase} />

        {/* Message */}
        {message && (
          <div style={{
            marginTop: 16,
            background: message.win ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${message.win ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 8, padding: "12px 20px", textAlign: "center",
            fontFamily: "monospace", fontSize: 15, fontWeight: "bold",
            color: message.win ? "#4ade80" : "#f87171",
          }}>
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Bet chips */}
          {phase === "idle" && (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CHIPS.map(v => (
                  <button key={v} onClick={() => addChip(v)} disabled={bet + v > balance}
                    style={{
                      width: 52, height: 52, borderRadius: "50%",
                      background: bet + v > balance ? "rgba(255,255,255,0.04)" : "rgba(201,168,76,0.15)",
                      border: `2px solid ${bet + v > balance ? "rgba(255,255,255,0.1)" : "rgba(201,168,76,0.5)"}`,
                      color: bet + v > balance ? "rgba(255,255,255,0.15)" : "#c9a84c",
                      fontFamily: "monospace", fontSize: 12, fontWeight: "bold",
                      cursor: bet + v > balance ? "not-allowed" : "pointer",
                    }}>
                    ${v}
                  </button>
                ))}
                <button onClick={clearBet}
                  style={{
                    padding: "8px 14px", borderRadius: 8, height: 52,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(240,230,200,0.5)", fontFamily: "monospace", fontSize: 13, cursor: "pointer",
                  }}>
                  Clear
                </button>
              </div>

              {/* Auto cashout input */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, color: "rgba(240,230,200,0.5)" }}>Auto cashout at:</span>
                <input
                  type="number"
                  min="1.01"
                  step="0.1"
                  value={autoCashout}
                  onChange={e => setAutoCashout(e.target.value)}
                  placeholder="e.g. 2.00"
                  style={{
                    width: 90, padding: "6px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                    color: acEnabled ? "#c9a84c" : "#f0e6c8", fontFamily: "monospace", fontSize: 14,
                    outline: "none",
                  }}
                />
                {acEnabled && (
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "#c9a84c" }}>
                    at {acVal.toFixed(2)}×
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{
                  fontFamily: "monospace", fontSize: 17, color: "#c9a84c",
                  background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 8, padding: "8px 18px",
                }}>Bet: ${bet}</span>
                <button onClick={startRound} disabled={bet < 1}
                  style={{
                    padding: "10px 28px", borderRadius: 8, fontSize: 16, fontWeight: "bold",
                    background: bet >= 1 ? "linear-gradient(135deg, #c9a84c, #8b6914)" : "rgba(255,255,255,0.05)",
                    border: "none", color: bet >= 1 ? "#0a0814" : "rgba(255,255,255,0.2)",
                    fontFamily: "monospace", letterSpacing: 1, cursor: bet >= 1 ? "pointer" : "not-allowed",
                  }}>
                  LAUNCH
                </button>
              </div>
            </>
          )}

          {phase === "running" && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", color: "rgba(240,230,200,0.5)", fontSize: 14 }}>
                Bet: ${bet} &bull; Profit if cashout now: ${(bet * multiplier - bet).toFixed(2)}
              </span>
              <button onClick={cashOut}
                style={{
                  padding: "12px 32px", borderRadius: 8, fontSize: 17, fontWeight: "bold",
                  background: "linear-gradient(135deg, #22c55e, #15803d)",
                  border: "none", color: "#fff",
                  fontFamily: "monospace", letterSpacing: 1, cursor: "pointer",
                  boxShadow: "0 0 20px rgba(34,197,94,0.4)",
                }}>
                CASH OUT {multiplier.toFixed(2)}×
              </button>
            </div>
          )}

          {(phase === "crashed" || phase === "cashedout") && (
            <button onClick={reset}
              style={{
                padding: "12px 36px", borderRadius: 8, fontSize: 16, fontWeight: "bold",
                background: "linear-gradient(135deg, #c9a84c, #8b6914)",
                border: "none", color: "#0a0814",
                fontFamily: "monospace", letterSpacing: 2, cursor: "pointer",
              }}>
              PLAY AGAIN
            </button>
          )}
        </div>
      </div>

      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        title="Crash"
        balance={balance}
        onSetBalance={(n) => { setBalance(n); saveBalance(n); balanceRef.current = n; }}
      >
        <div>
          {/* Admin Tabs */}
          <div style={{ display: "flex", marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {(["control","stats"] as const).map(tab => (
              <button key={tab} onClick={() => setAdminTab(tab)} style={{
                flex: 1, padding: "5px 0", fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                background: "transparent", border: "none",
                borderBottom: `1px solid ${adminTab === tab ? "#c9a84c" : "transparent"}`,
                color: adminTab === tab ? "#c9a84c" : "rgba(240,230,200,0.3)",
                cursor: "pointer", fontFamily: "monospace", marginBottom: -1,
              }}>{tab}</button>
            ))}
          </div>

          {adminTab === "control" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Infinite Balance", sub: "Can't lose chips", checked: infiniteBalance, onChange: () => { const n = !infiniteBalRef.current; infiniteBalRef.current = n; setInfiniteBalance(n); } },
                { label: "Auto Round", sub: "Starts next round automatically", checked: autoRound, onChange: () => { const n = !autoRoundRef.current; autoRoundRef.current = n; setAutoRound(n); } },
              ].map(item => (
                <label key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#f0e6c8" }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(240,230,200,0.35)" }}>{item.sub}</div>
                  </div>
                  <input type="checkbox" checked={item.checked} onChange={item.onChange} style={{ width: 14, height: 14, cursor: "pointer" }} />
                </label>
              ))}
              <div>
                <div style={{ color: "rgba(240,230,200,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>FORCE CRASH AT</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" min="1.00" step="0.1" placeholder="e.g. 2.50" value={forceCrashAt}
                    onChange={e => setForceCrashAt(e.target.value)}
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#f0e6c8", padding: "6px 10px", fontFamily: "monospace", fontSize: 12, outline: "none" }}
                  />
                  <button onClick={() => setForceCrashAt("")} style={{ padding: "6px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 11 }}>Clear</button>
                </div>
                {forceCrashAt && !isNaN(parseFloat(forceCrashAt)) && (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#f87171", marginTop: 3 }}>Crashes at {parseFloat(forceCrashAt).toFixed(2)}×</div>
                )}
              </div>
              <div>
                <div style={{ color: "rgba(240,230,200,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>MIN CRASH AT</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" min="1.01" step="0.1" placeholder="e.g. 1.50" value={minCrashAt}
                    onChange={e => { setMinCrashAt(e.target.value); minCrashRef.current = parseFloat(e.target.value) || 0; }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#f0e6c8", padding: "6px 10px", fontFamily: "monospace", fontSize: 12, outline: "none" }}
                  />
                  <button onClick={() => { setMinCrashAt(""); minCrashRef.current = 0; }} style={{ padding: "6px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 11 }}>Clear</button>
                </div>
                {minCrashAt && !isNaN(parseFloat(minCrashAt)) && parseFloat(minCrashAt) > 1.0 && (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#4ade80", marginTop: 3 }}>Min: {parseFloat(minCrashAt).toFixed(2)}×</div>
                )}
              </div>
              <button onClick={() => setCrashStats({ rounds: 0, cashed: 0, crashed: 0, sumMult: 0, best: 0 })}
                style={{ padding: "5px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, color: "rgba(240,230,200,0.4)", cursor: "pointer", fontSize: 10, letterSpacing: 1 }}>
                RESET STATS
              </button>
            </div>
          )}

          {adminTab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {[{ l: "ROUNDS", v: crashStats.rounds, c: "#f0e6c8" }, { l: "CASHED", v: crashStats.cashed, c: "#4ade80" }, { l: "CRASHED", v: crashStats.crashed, c: "#f87171" }]
                  .map(s => (
                    <div key={s.l} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "7px 4px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: 17, fontWeight: "bold", color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: "rgba(240,230,200,0.4)", letterSpacing: 1 }}>{s.l}</div>
                    </div>
                  ))}
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "rgba(240,230,200,0.5)" }}>Cash Rate</span>
                  <span style={{ fontSize: 11, color: "#4ade80" }}>{crashStats.rounds > 0 ? ((crashStats.cashed / crashStats.rounds) * 100).toFixed(1) : "0.0"}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "rgba(240,230,200,0.5)" }}>Avg Multiplier</span>
                  <span style={{ fontSize: 11, color: "#c9a84c" }}>{crashStats.rounds > 0 ? (crashStats.sumMult / crashStats.rounds).toFixed(2) : "—"}×</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "rgba(240,230,200,0.5)" }}>Best Multiplier</span>
                  <span style={{ fontSize: 11, color: "#c9a84c" }}>{crashStats.best > 0 ? crashStats.best.toFixed(2) : "—"}×</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
