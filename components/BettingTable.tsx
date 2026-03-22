"use client";

import React from "react";
import { ChipPlacement, RED_NUMBERS, BLACK_NUMBERS, getPayoutMultiplier, BetType } from "@/lib/roulette";

interface Props {
  onBet: (placement: ChipPlacement) => void;
  bets: ChipPlacement[];
  disabled: boolean;
  selectedChip: number;
  winningNumber: number | null;
}

const NUMBERS_LAYOUT = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

function getNumberColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  if (RED_NUMBERS.has(n)) return "red";
  return "black";
}

function getBetKey(numbers: number[]): string {
  return numbers.slice().sort((a, b) => a - b).join("-");
}

function getBetAmountForKey(bets: ChipPlacement[], key: string): number {
  return bets
    .filter((b) => getBetKey(b.numbers) === key)
    .reduce((sum, b) => sum + b.amount, 0);
}

const CHIP_COLORS: Record<number, string> = {
  1: "#ffd700",
  5: "#e74c3c",
  10: "#2980b9",
  25: "#8e44ad",
  50: "#1a7a3c",
  100: "#1a1a1a",
};

export default function BettingTable({ onBet, bets, disabled, selectedChip, winningNumber }: Props) {
  const place = (numbers: number[], type: BetType, label: string) => {
    if (disabled) return;
    const payout = getPayoutMultiplier(type);
    const key = getBetKey(numbers);
    onBet({ betKey: key, numbers, amount: selectedChip, type, label, payout });
  };

  const renderChips = (numbers: number[]) => {
    const key = getBetKey(numbers);
    const amount = getBetAmountForKey(bets, key);
    if (!amount) return null;
    const chipColor =
      amount >= 100 ? CHIP_COLORS[100] :
      amount >= 50 ? CHIP_COLORS[50] :
      amount >= 25 ? CHIP_COLORS[25] :
      amount >= 10 ? CHIP_COLORS[10] :
      amount >= 5 ? CHIP_COLORS[5] : CHIP_COLORS[1];

    return (
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: chipColor,
          border: "2px solid rgba(255,255,255,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: "bold",
          color: "white",
          zIndex: 5,
          boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
        className="chip-placed"
      >
        {amount >= 1000 ? `${Math.floor(amount / 1000)}k` : amount}
      </div>
    );
  };

  const cellBase: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: 13,
    color: "white",
    border: "1px solid rgba(201,168,76,0.4)",
    userSelect: "none",
    minHeight: 44,
  };

  const redBg = "linear-gradient(135deg, #b91c1c, #c0392b)";
  const blackBg = "linear-gradient(135deg, #1a1a1a, #2c2c2c)";
  const greenBg = "linear-gradient(135deg, #1a5c38, #27ae60)";

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1a5c38 0%, #0f3d25 50%, #1a5c38 100%)",
        border: "3px solid #c9a84c",
        borderRadius: 12,
        padding: "16px 12px",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4), 0 0 30px rgba(0,0,0,0.6)",
        minWidth: 320,
        maxWidth: 720,
        width: "100%",
      }}
    >
      {/* Table title */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{
          display: "inline-block",
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.2), transparent)",
          padding: "4px 20px",
          borderBottom: "1px solid rgba(201,168,76,0.4)",
          color: "#f0d878",
          fontSize: 12,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}>
          Place Your Bets
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Zero */}
        <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
          <div
            onClick={() => place([0], "zero" as BetType, "0")}
            className={`bet-cell ${winningNumber === 0 ? "win-cell" : ""}`}
            style={{
              ...cellBase,
              background: greenBg,
              flex: 1,
              borderRadius: "4px 4px 0 0",
              fontSize: 16,
              minHeight: 50,
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: winningNumber === 0 ? "0 0 20px rgba(201,168,76,0.8)" : undefined,
            }}
          >
            0
            {renderChips([0])}
          </div>
        </div>

        {/* Main grid: 3 rows × 12 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr) auto", gap: 2 }}>
          {NUMBERS_LAYOUT.map((row, rowIdx) => (
            <React.Fragment key={rowIdx}>
              {row.map((num) => {
                const color = getNumberColor(num);
                const isWin = winningNumber === num;
                return (
                  <div
                    key={num}
                    onClick={() => place([num], "straight" as BetType, `${num}`)}
                    className={`bet-cell ${isWin ? "win-cell" : ""}`}
                    style={{
                      ...cellBase,
                      background: color === "red" ? redBg : blackBg,
                      borderRadius: 2,
                      cursor: disabled ? "not-allowed" : "pointer",
                      boxShadow: isWin ? "0 0 20px rgba(201,168,76,0.8)" : undefined,
                      fontSize: 12,
                    }}
                  >
                    {num}
                    {renderChips([num])}
                  </div>
                );
              })}
              {/* 2-to-1 column bet */}
              <div
                onClick={() => {
                  const colNums = row;
                  place(colNums, "column" as BetType, "2:1");
                }}
                className={`bet-cell ${winningNumber !== null && row.includes(winningNumber) ? "win-cell" : ""}`}
                style={{
                  ...cellBase,
                  background: "rgba(0,0,0,0.4)",
                  fontSize: 9,
                  fontStyle: "italic",
                  letterSpacing: 0,
                  cursor: disabled ? "not-allowed" : "pointer",
                  borderRadius: 2,
                  padding: "0 4px",
                  whiteSpace: "nowrap",
                }}
              >
                2:1
                {renderChips(row)}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Dozens */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 2, marginTop: 2 }}>
          {[
            { label: "1st 12", nums: Array.from({length: 12}, (_, i) => i + 1) },
            { label: "2nd 12", nums: Array.from({length: 12}, (_, i) => i + 13) },
            { label: "3rd 12", nums: Array.from({length: 12}, (_, i) => i + 25) },
          ].map(({ label, nums }) => {
            const isWin = winningNumber !== null && nums.includes(winningNumber);
            return (
              <div
                key={label}
                onClick={() => place(nums, "dozen" as BetType, label)}
                className={`bet-cell ${isWin ? "win-cell" : ""}`}
                style={{
                  ...cellBase,
                  background: "rgba(0,0,0,0.35)",
                  borderRadius: 2,
                  fontSize: 11,
                  cursor: disabled ? "not-allowed" : "pointer",
                  boxShadow: isWin ? "0 0 20px rgba(201,168,76,0.8)" : undefined,
                }}
              >
                {label}
                {renderChips(nums)}
              </div>
            );
          })}
          {/* spacer for 2:1 column */}
          <div style={{ ...cellBase, background: "transparent", border: "none" }} />
        </div>

        {/* Outside bets: 1-18, Even, Red, Black, Odd, 19-36 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr auto", gap: 2, marginTop: 2 }}>
          {[
            { label: "1–18", nums: Array.from({length: 18}, (_, i) => i + 1), type: "low" as BetType },
            { label: "Even", nums: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36], type: "even" as BetType },
            {
              label: "RED",
              nums: Array.from(RED_NUMBERS),
              type: "red" as BetType,
              bg: redBg,
            },
            {
              label: "BLACK",
              nums: Array.from(BLACK_NUMBERS),
              type: "black" as BetType,
              bg: blackBg,
            },
            { label: "Odd", nums: [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35], type: "odd" as BetType },
            { label: "19–36", nums: Array.from({length: 18}, (_, i) => i + 19), type: "high" as BetType },
          ].map(({ label, nums, type, bg }) => {
            const isWin = winningNumber !== null && nums.includes(winningNumber);
            return (
              <div
                key={label}
                onClick={() => place(nums, type, label)}
                className={`bet-cell ${isWin ? "win-cell" : ""}`}
                style={{
                  ...cellBase,
                  background: bg || "rgba(0,0,0,0.35)",
                  borderRadius: 2,
                  fontSize: 11,
                  cursor: disabled ? "not-allowed" : "pointer",
                  boxShadow: isWin ? "0 0 20px rgba(201,168,76,0.8)" : undefined,
                  fontWeight: label === "RED" || label === "BLACK" ? 900 : "bold",
                  letterSpacing: label === "RED" || label === "BLACK" ? 1 : 0,
                }}
              >
                {label === "RED" && (
                  <span style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    background: "#e74c3c",
                    borderRadius: "50%",
                    border: "1px solid white",
                  }} />
                )}
                {label === "BLACK" && (
                  <span style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    background: "#111",
                    borderRadius: "50%",
                    border: "1px solid white",
                  }} />
                )}
                {label !== "RED" && label !== "BLACK" && label}
                {renderChips(nums)}
              </div>
            );
          })}
          {/* spacer */}
          <div style={{ ...cellBase, background: "transparent", border: "none" }} />
        </div>
      </div>
    </div>
  );
}
