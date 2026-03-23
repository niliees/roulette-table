"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import GameNav from "@/components/GameNav";
import AdminPanel from "@/components/AdminPanel";
import { loadBalance, saveBalance } from "@/lib/balance";

// ── Symbols ────────────────────────────────────────────────────────────────
interface Symbol {
  label: string;
  color: string;
  multiplier: number; // 3-of-a-kind payout (×bet)
}

const SYMBOLS: Symbol[] = [
  { label: "7",  color: "#f87171", multiplier: 100 },
  { label: "\u2605", color: "#facc15", multiplier: 50  }, // ★
  { label: "BAR", color: "#c9a84c", multiplier: 20  },
  { label: "\u2666", color: "#f472b6", multiplier: 10  }, // ♦
  { label: "\u2665", color: "#f87171", multiplier: 8   }, // ♥
  { label: "\u2663", color: "#a78bfa", multiplier: 5   }, // ♣
  { label: "\u2660", color: "#60a5fa", multiplier: 3   }, // ♠
];

// Weighted pool for random symbol selection
const POOL: number[] = [
  0, // 7    ×2
  0,
  1, // ★   ×4
  1,
  1,
  1,
  2, // BAR  ×5
  2,
  2,
  2,
  2,
  3, // ♦   ×6
  3,
  3,
  3,
  3,
  3,
  4, // ♥   ×8
  4,
  4,
  4,
  4,
  4,
  4,
  4,
  5, // ♣   ×9
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  6, // ♠   ×12
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
  6,
];

// 3 rows per reel (displayed), center row = payline
const ROWS = 3;

function randomSymbolIdx(): number {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

function buildReel(): number[] {
  return Array.from({ length: ROWS }, () => randomSymbolIdx());
}

type SpinState = "idle" | "spinning" | "result";

const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 200, 500, 1000];
const STOP_DELAYS = [800, 1300, 1800]; // ms per reel stop

// ── Win Evaluation ─────────────────────────────────────────────────────────
function evaluate(reels: number[][]): { payout: number; label: string } | null {
  const center = reels.map(r => r[1]); // center row index
  if (center[0] === center[1] && center[1] === center[2]) {
    const sym = SYMBOLS[center[0]];
    return { payout: sym.multiplier, label: `3x ${sym.label}` };
  }
  if (center[0] === center[1] || center[1] === center[2]) {
    return { payout: 2, label: "2-of-a-kind" };
  }
  return null;
}

// ── Reel Display ────────────────────────────────────────────────────────────
function ReelDisplay({ symbols, spinning }: { symbols: number[]; spinning: boolean }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 4,
      position: "relative",
    }}>
      {symbols.map((si, row) => {
        const sym = SYMBOLS[si];
        const isPayline = row === 1;
        return (
          <div key={row} style={{
            width: 88, height: 80,
            borderRadius: 8,
            background: isPayline ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.03)",
            border: `2px solid ${isPayline ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.07)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: sym.label.length > 1 ? 20 : 36,
            fontWeight: "bold",
            color: spinning ? "rgba(255,255,255,0.15)" : sym.color,
            fontFamily: sym.label === "BAR" ? "monospace" : undefined,
            transition: "color 0.2s",
            letterSpacing: sym.label === "BAR" ? 1 : undefined,
          }}>
            {spinning ? "?" : sym.label}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SlotsPage() {
  const [balance, setBalance] = useState(() => loadBalance());
  const [bet, setBet] = useState(5);
  const [reels, setReels] = useState<number[][]>([buildReel(), buildReel(), buildReel()]);
  const [spinState, setSpinState] = useState<SpinState>("idle");
  const [stoppedReels, setStoppedReels] = useState<boolean[]>([false, false, false]);
  const [spinningReels, setSpinningReels] = useState<number[][]>([[], [], []]);
  const [message, setMessage] = useState<{ text: string; win: boolean } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [infiniteBalance, setInfiniteBalance] = useState(false);
  const [adminTab, setAdminTab] = useState<"control"|"stats">("control");
  const [forceWinSymbol, setForceWinSymbol] = useState<number | null>(null);
  const [autoSpin, setAutoSpin] = useState(false);
  const [spinStats, setSpinStats] = useState({ played: 0, wins: 0, losses: 0, profit: 0 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalReelsRef = useRef<number[][]>([]);
  const stoppedRef = useRef<boolean[]>([false, false, false]);
  const infiniteBalRef = useRef(false);
  const forceWinRef = useRef<number | null>(null);
  const autoSpinRef = useRef(false);
  const spinFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    window.admin = () => setShowAdmin(true);
    return () => { window.admin = undefined; };
  }, []);

  // always keep spinFnRef pointing to the latest spin closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { spinFnRef.current = spin; });

  useEffect(() => {
    if (!autoSpin || spinState !== "result") return;
    const t = setTimeout(() => { if (autoSpinRef.current) spinFnRef.current(); }, 1500);
    return () => clearTimeout(t);
  }, [spinState, autoSpin]); // eslint-disable-line react-hooks/exhaustive-deps

  function setBetDirect(v: number) {
    if (spinState === "spinning") return;
    if (v > balance) return;
    setBet(v);
    if (spinState === "result") setSpinState("idle");
  }

  const stopReel = useCallback((index: number, finalReel: number[]) => {
    stoppedRef.current[index] = true;
    setStoppedReels([...stoppedRef.current]);
    setReels(prev => {
      const next = [...prev];
      next[index] = finalReel;
      return next;
    });

    if (stoppedRef.current.every(Boolean)) {
      // All reels stopped
      if (intervalRef.current) clearInterval(intervalRef.current);
      const finalReels = finalReelsRef.current;
      const result = evaluate(finalReels);
      const rawBal = result
        ? balance - bet + bet * result.payout
        : balance - bet;
      const newBal = infiniteBalRef.current ? Math.max(rawBal, balance) : rawBal;

      setBalance(newBal);
      saveBalance(newBal);

      if (result) {
        setMessage({ text: `${result.label} — Win $${bet * result.payout - bet}!`, win: true });
        setHistory(h => [`+$${bet * result.payout - bet} (${result.label})`, ...h].slice(0, 10));
      } else {
        setMessage({ text: `No match. Lost $${bet}.`, win: false });
        setHistory(h => [`-$${bet}`, ...h].slice(0, 10));
      }
      setSpinState("result");
      setSpinStats(s => ({
        played: s.played + 1,
        wins: result ? s.wins + 1 : s.wins,
        losses: result ? s.losses : s.losses + 1,
        profit: result ? s.profit + (bet * result.payout - bet) : s.profit - bet,
      }));
    }
  }, [balance, bet]);

  function spin() {
    if (spinState !== "idle" && spinState !== "result") return;
    if (bet < 1 || bet > balance) return;

    // Pre-compute final reel positions
    const finals = [buildReel(), buildReel(), buildReel()];
    if (forceWinRef.current !== null) {
      const sym = forceWinRef.current;
      finals[0][1] = sym; finals[1][1] = sym; finals[2][1] = sym;
    }
    finalReelsRef.current = finals;
    stoppedRef.current = [false, false, false];

    setMessage(null);
    setSpinState("spinning");
    setStoppedReels([false, false, false]);

    // Rapid cycling animation
    intervalRef.current = setInterval(() => {
      setSpinningReels([buildReel(), buildReel(), buildReel()]);
    }, 70);

    // Stop each reel in sequence
    STOP_DELAYS.forEach((delay, i) => {
      setTimeout(() => stopReel(i, finals[i]), delay);
    });
  }

  // Show spinning symbols for un-stopped reels
  const displayReels = reels.map((r, i) =>
    spinState === "spinning" && !stoppedReels[i] ? spinningReels[i] || r : r
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #1a0a2e 0%, #0a0814 60%)",
      color: "#f0e6c8",
      fontFamily: "Georgia, serif",
    }}>
      <GameNav balance={balance} title="Slots" />

      <div style={{ paddingTop: 80, maxWidth: 600, margin: "0 auto", padding: "80px 16px 40px" }}>

        <h1 style={{
          textAlign: "center", fontFamily: "Georgia, serif",
          fontSize: 28, letterSpacing: 4, color: "#c9a84c",
          textTransform: "uppercase", marginBottom: 8,
        }}>Royal Slots</h1>
        <p style={{ textAlign: "center", fontSize: 12, fontFamily: "monospace", color: "rgba(240,230,200,0.4)", marginBottom: 36, letterSpacing: 2 }}>
          CENTER ROW IS PAYLINE
        </p>

        {/* Slot machine */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "2px solid rgba(201,168,76,0.3)",
          borderRadius: 16, padding: 28,
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 20,
          boxShadow: "0 0 40px rgba(201,168,76,0.05)",
        }}>
          {/* Reels */}
          <div style={{ display: "flex", gap: 12, position: "relative" }}>
            {/* Payline highlight */}
            <div style={{
              position: "absolute",
              top: "calc(50% - 42px)", left: -4, right: -4,
              height: 84, borderRadius: 10,
              border: "2px solid rgba(201,168,76,0.5)",
              pointerEvents: "none",
              boxShadow: "0 0 12px rgba(201,168,76,0.2)",
            }} />
            {displayReels.map((reel, i) => (
              <ReelDisplay
                key={i}
                symbols={reel.length === ROWS ? reel : [0, 0, 0]}
                spinning={spinState === "spinning" && !stoppedReels[i]}
              />
            ))}
          </div>

          {/* Message */}
          {message && (
            <div style={{
              background: message.win ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${message.win ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 8, padding: "10px 20px",
              fontFamily: "monospace", fontSize: 15, fontWeight: "bold",
              color: message.win ? "#4ade80" : "#f87171",
              textAlign: "center",
            }}>{message.text}</div>
          )}

          {/* Bet section */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {CHIP_VALUES.map(v => (
                <button key={v} onClick={() => setBetDirect(v)}
                  disabled={spinState === "spinning" || v > balance}
                  style={{
                    padding: "6px 14px", borderRadius: 6,
                    background: bet === v ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${bet === v ? "rgba(201,168,76,0.7)" : "rgba(255,255,255,0.1)"}`,
                    color: bet === v ? "#c9a84c" : "rgba(240,230,200,0.5)",
                    fontFamily: "monospace", fontSize: 13, cursor: "pointer",
                  }}>
                  ${v}
                </button>
              ))}
            </div>

            <button
              onClick={spin}
              disabled={spinState === "spinning" || bet > balance || bet < 1}
              style={{
                padding: "14px", borderRadius: 10, fontSize: 18, fontWeight: "bold",
                background: spinState === "spinning" || bet > balance
                  ? "rgba(255,255,255,0.05)"
                  : "linear-gradient(135deg, #c9a84c, #8b6914)",
                border: "none",
                color: spinState === "spinning" || bet > balance ? "rgba(255,255,255,0.2)" : "#0a0814",
                fontFamily: "monospace", letterSpacing: 2, cursor: spinState === "spinning" ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {spinState === "spinning" ? "SPINNING..." : "SPIN"}
            </button>
          </div>
        </div>

        {/* Pay table */}
        <div style={{
          marginTop: 28, padding: "16px 20px",
          background: "rgba(255,255,255,0.03)", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <p style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: 2, color: "rgba(240,230,200,0.5)", margin: "0 0 12px" }}>PAY TABLE (3 of a kind)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
            {SYMBOLS.map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 13 }}>
                <span style={{ color: s.color }}>{s.label} {s.label} {s.label}</span>
                <span style={{ color: "rgba(240,230,200,0.6)" }}>{s.multiplier}× bet</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 13 }}>
              <span style={{ color: "rgba(240,230,200,0.4)" }}>2-of-a-kind</span>
              <span style={{ color: "rgba(240,230,200,0.6)" }}>2× bet</span>
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{
            marginTop: 16, padding: "12px 16px",
            background: "rgba(255,255,255,0.02)", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            <p style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: 2, color: "rgba(240,230,200,0.4)", margin: "0 0 8px" }}>RECENT</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {history.map((h, i) => (
                <span key={i} style={{
                  fontFamily: "monospace", fontSize: 12,
                  color: h.startsWith("+") ? "#4ade80" : "#f87171",
                  background: h.startsWith("+") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  padding: "2px 8px", borderRadius: 4,
                }}>{h}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        title="Slots"
        balance={balance}
        onSetBalance={(n) => { setBalance(n); saveBalance(n); }}
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
                { label: "Auto Spin", sub: "Respins after each result", checked: autoSpin, onChange: () => { const n = !autoSpinRef.current; autoSpinRef.current = n; setAutoSpin(n); } },
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
                <div style={{ color: "rgba(240,230,200,0.4)", fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>FORCE WIN SYMBOL</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  {SYMBOLS.map((sym, idx) => (
                    <button key={idx}
                      onClick={() => { const n = forceWinRef.current === idx ? null : idx; forceWinRef.current = n; setForceWinSymbol(n); }}
                      style={{
                        padding: "5px 8px", borderRadius: 5, fontSize: sym.label.length > 1 ? 11 : 16,
                        background: forceWinSymbol === idx ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${forceWinSymbol === idx ? "rgba(201,168,76,0.6)" : "rgba(255,255,255,0.1)"}`,
                        color: sym.color, cursor: "pointer",
                      }}>{sym.label}</button>
                  ))}
                  {forceWinSymbol !== null && (
                    <button onClick={() => { forceWinRef.current = null; setForceWinSymbol(null); }}
                      style={{ padding: "4px 7px", borderRadius: 5, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", cursor: "pointer", fontSize: 10 }}>✕</button>
                  )}
                </div>
                {forceWinSymbol !== null && (
                  <div style={{ fontSize: 10, color: "#c9a84c", marginTop: 4 }}>
                    Force: 3× {SYMBOLS[forceWinSymbol].label} ({SYMBOLS[forceWinSymbol].multiplier}× bet)
                  </div>
                )}
              </div>
              <button onClick={() => setSpinStats({ played: 0, wins: 0, losses: 0, profit: 0 })}
                style={{ padding: "5px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, color: "rgba(240,230,200,0.4)", cursor: "pointer", fontSize: 10, letterSpacing: 1 }}>
                RESET STATS
              </button>
            </div>
          )}

          {adminTab === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                {[{ l: "SPINS", v: spinStats.played, c: "#f0e6c8" }, { l: "WINS", v: spinStats.wins, c: "#4ade80" }, { l: "LOSSES", v: spinStats.losses, c: "#f87171" }]
                  .map(s => (
                    <div key={s.l} style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "7px 4px", textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize: 17, fontWeight: "bold", color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: "rgba(240,230,200,0.4)", letterSpacing: 1 }}>{s.l}</div>
                    </div>
                  ))}
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "rgba(240,230,200,0.5)" }}>Win Rate</span>
                  <span style={{ fontSize: 11, color: "#c9a84c" }}>{spinStats.played > 0 ? ((spinStats.wins / spinStats.played) * 100).toFixed(1) : "0.0"}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "rgba(240,230,200,0.5)" }}>Net P&amp;L</span>
                  <span style={{ fontSize: 11, color: spinStats.profit >= 0 ? "#4ade80" : "#f87171" }}>{spinStats.profit >= 0 ? "+" : ""}${spinStats.profit.toFixed(2)}</span>
                </div>
              </div>
              {history.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: "rgba(240,230,200,0.4)", letterSpacing: 1, marginBottom: 4 }}>RECENT RESULTS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {history.map((h, i) => (
                      <span key={i} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 3,
                        background: h.startsWith("+") ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: h.startsWith("+") ? "#4ade80" : "#f87171" }}>{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
