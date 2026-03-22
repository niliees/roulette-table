"use client";

import React, { useRef, useState, useCallback } from "react";
import RouletteWheel, { RouletteWheelHandle } from "@/components/RouletteWheel";
import BettingTable from "@/components/BettingTable";
import ChipSelector from "@/components/ChipSelector";
import RouletteHistory from "@/components/RouletteHistory";
import WinNotification from "@/components/WinNotification";
import { ChipPlacement, calculatePayout, calculateTotalBet, spinWheel } from "@/lib/roulette";

const STARTING_BALANCE = 1000;

interface HistoryEntry {
  number: number;
  timestamp: number;
}

export default function Home() {
  const wheelRef = useRef<RouletteWheelHandle>(null);
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [bets, setBets] = useState<ChipPlacement[]>([]);
  const [selectedChip, setSelectedChip] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [lastResult, setLastResult] = useState<{ win: number; bet: number; number: number } | null>(null);
  const [lastBets, setLastBets] = useState<ChipPlacement[]>([]);

  const totalBet = calculateTotalBet(bets);

  const handleBet = useCallback((placement: ChipPlacement) => {
    if (isSpinning) return;
    if (placement.amount > balance - totalBet) return;

    setBets((prev) => {
      const existing = prev.find((b) => b.betKey === placement.betKey);
      if (existing) {
        return prev.map((b) =>
          b.betKey === placement.betKey
            ? { ...b, amount: b.amount + placement.amount }
            : b
        );
      }
      return [...prev, placement];
    });
  }, [isSpinning, balance, totalBet]);

  const handleSpin = useCallback(() => {
    if (isSpinning || bets.length === 0) return;

    const winning = spinWheel();
    setWinningNumber(null);
    setIsSpinning(true);
    setLastBets(bets);

    wheelRef.current?.spin(winning, () => {
      setWinningNumber(winning);
      setIsSpinning(false);

      const winAmount = calculatePayout(bets, winning);
      const betTotal = calculateTotalBet(bets);

      setBalance((prev) => prev - betTotal + winAmount);
      setHistory((prev) => [...prev, { number: winning, timestamp: Date.now() }]);
      setLastResult({ win: winAmount, bet: betTotal, number: winning });
      setShowNotification(true);
      setBets([]);
    });
  }, [isSpinning, bets]);

  const handleClearBets = useCallback(() => {
    if (!isSpinning) setBets([]);
  }, [isSpinning]);

  const handleUndoBet = useCallback(() => {
    if (!isSpinning && bets.length > 0) {
      setBets((prev) => prev.slice(0, -1));
    }
  }, [isSpinning, bets]);

  const handleRebet = useCallback(() => {
    if (isSpinning || lastBets.length === 0) return;
    const rebetTotal = calculateTotalBet(lastBets);
    if (rebetTotal > balance) return;
    setBets(lastBets);
  }, [isSpinning, lastBets, balance]);

  const handleDoubleBet = useCallback(() => {
    if (isSpinning || bets.length === 0) return;
    const doubled = bets.map((b) => ({ ...b, amount: b.amount * 2 }));
    const newTotal = calculateTotalBet(doubled);
    if (newTotal > balance) return;
    setBets(doubled);
  }, [isSpinning, bets, balance]);

  const handleReset = useCallback(() => {
    setBalance(STARTING_BALANCE);
    setBets([]);
    setLastBets([]);
    setHistory([]);
    setWinningNumber(null);
    setShowNotification(false);
    setLastResult(null);
  }, []);

  const canSpin = !isSpinning && bets.length > 0 && totalBet <= balance;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 16px 40px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20, width: "100%" }}>
        <div style={{ display: "inline-block", position: "relative" }}>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 52px)",
            fontWeight: "bold",
            margin: 0,
            letterSpacing: 6,
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #8b6914, #f0d878, #c9a84c, #f0d878, #8b6914)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer 3s linear infinite",
          }}>
            Royal Roulette
          </h1>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #c9a84c, transparent)", marginTop: 4 }} />
          <div style={{ fontSize: 11, color: "rgba(201,168,76,0.6)", letterSpacing: 8, marginTop: 6, textTransform: "uppercase" }}>
            European · Single Zero
          </div>
        </div>
      </div>

      {/* Balance Bar */}
      <div style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap",
        justifyContent: "center",
        width: "100%",
        maxWidth: 900,
      }}>
        <div style={{
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 10,
          padding: "10px 20px",
          textAlign: "center",
          minWidth: 130,
        }}>
          <div style={{ fontSize: 10, color: "rgba(201,168,76,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>Balance</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: balance > 0 ? "#f0d878" : "#e74c3c" }}>
            ${balance.toLocaleString('en-US')}
          </div>
        </div>

        <div style={{
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 10,
          padding: "10px 20px",
          textAlign: "center",
          minWidth: 130,
        }}>
          <div style={{ fontSize: 10, color: "rgba(201,168,76,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>Total Bet</div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: totalBet > 0 ? "#f0c040" : "rgba(255,255,255,0.3)" }}>
            ${totalBet.toLocaleString('en-US')}
          </div>
        </div>

        {winningNumber !== null && !isSpinning && (
          <div style={{
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(201,168,76,0.4)",
            borderRadius: 10,
            padding: "10px 20px",
            textAlign: "center",
            minWidth: 130,
          }}>
            <div style={{ fontSize: 10, color: "rgba(201,168,76,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>Last</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: "#f0d878" }}>{winningNumber}</div>
          </div>
        )}

        <button
          onClick={handleReset}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8,
            padding: "8px 16px",
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            cursor: "pointer",
            letterSpacing: 1,
          }}
        >
          Reset Game
        </button>
      </div>

      {/* Main layout */}
      <div style={{
        display: "flex",
        gap: 24,
        width: "100%",
        maxWidth: 1200,
        alignItems: "flex-start",
        justifyContent: "center",
        flexWrap: "wrap",
      }}>
        {/* Left: Wheel */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <RouletteWheel ref={wheelRef} size={380} />

          {/* Spin button */}
          <button
            onClick={handleSpin}
            disabled={!canSpin}
            style={{
              width: 180,
              height: 54,
              borderRadius: 27,
              background: canSpin
                ? "linear-gradient(135deg, #c9a84c, #f0d878, #c9a84c)"
                : "rgba(255,255,255,0.1)",
              border: canSpin ? "2px solid #f0d878" : "2px solid rgba(255,255,255,0.1)",
              color: canSpin ? "#1a1000" : "rgba(255,255,255,0.3)",
              fontSize: 17,
              fontWeight: "bold",
              letterSpacing: 3,
              textTransform: "uppercase",
              cursor: canSpin ? "pointer" : "not-allowed",
              boxShadow: canSpin ? "0 0 30px rgba(201,168,76,0.5), 0 6px 20px rgba(0,0,0,0.4)" : "none",
              transition: "all 0.3s ease",
            }}
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </button>

          {/* Bet controls */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Undo", onClick: handleUndoBet, disabled: isSpinning || bets.length === 0 },
              { label: "Clear", onClick: handleClearBets, disabled: isSpinning || bets.length === 0 },
              { label: "2×", onClick: handleDoubleBet, disabled: isSpinning || bets.length === 0 },
              { label: "Rebet", onClick: handleRebet, disabled: isSpinning || lastBets.length === 0 },
            ].map(({ label, onClick, disabled }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                style={{
                  background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  cursor: disabled ? "not-allowed" : "pointer",
                  letterSpacing: 1,
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* History */}
          <div style={{ width: 380 }}>
            <RouletteHistory history={history} />
          </div>
        </div>

        {/* Right: Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 320 }}>
          {/* Chip selector */}
          <div style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 12,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase", textAlign: "center" }}>
              Select Chip Value
            </div>
            <ChipSelector selected={selectedChip} onSelect={setSelectedChip} disabled={isSpinning} />
          </div>

          {/* Betting table */}
          <BettingTable
            bets={bets}
            onBet={handleBet}
            disabled={isSpinning}
            selectedChip={selectedChip}
            winningNumber={winningNumber}
          />

          {/* Active bets summary */}
          {bets.length > 0 && (
            <div style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: 10,
              padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>
                Active Bets ({bets.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {bets.map((b, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.8)",
                    padding: "3px 6px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 4,
                  }}>
                    <span>{b.label}</span>
                    <span style={{ color: "#f0d878" }}>${b.amount} → win ${b.amount * b.payout}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payout guide */}
          <div style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(201,168,76,0.15)",
            borderRadius: 10,
            padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>
              Payout Guide
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
              {[
                ["Straight Up", "35:1"],
                ["Column / Dozen", "2:1"],
                ["Red/Black/Odd/Even", "1:1"],
                ["1-18 / 19-36", "1:1"],
              ].map(([name, payout]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{name}</span>
                  <span style={{ color: "#f0d878", fontWeight: "bold" }}>{payout}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Win/Lose notification */}
      {showNotification && lastResult && (
        <WinNotification
          winAmount={lastResult.win}
          totalBet={lastResult.bet}
          winningNumber={lastResult.number}
          onClose={() => setShowNotification(false)}
        />
      )}

      <div style={{ marginTop: 40, fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", letterSpacing: 1 }}>
        For entertainment purposes only · No real money involved
      </div>
    </main>
  );
}
