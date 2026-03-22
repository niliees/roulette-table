"use client";

import React from "react";
import { RED_NUMBERS } from "@/lib/roulette";

interface HistoryEntry {
  number: number;
  timestamp: number;
}

interface Props {
  history: HistoryEntry[];
}

function getColor(n: number): string {
  if (n === 0) return "#27ae60";
  if (RED_NUMBERS.has(n)) return "#c0392b";
  return "#222";
}

export default function RouletteHistory({ history }: Props) {
  if (history.length === 0) return null;

  const recent = history.slice(-20).reverse();
  const reds = history.filter((h) => RED_NUMBERS.has(h.number)).length;
  const blacks = history.filter((h) => h.number !== 0 && !RED_NUMBERS.has(h.number)).length;
  const greens = history.filter((h) => h.number === 0).length;

  return (
    <div style={{
      background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(201,168,76,0.3)",
      borderRadius: 10,
      padding: "12px 16px",
      backdropFilter: "blur(10px)",
    }}>
      <div style={{ fontSize: 11, color: "#c9a84c", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
        Last Numbers
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {recent.map((entry, i) => (
          <div
            key={entry.timestamp}
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: getColor(entry.number),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: "bold",
              color: "white",
              border: i === 0 ? "2px solid #f0d878" : "1px solid rgba(255,255,255,0.2)",
              boxShadow: i === 0 ? "0 0 10px rgba(201,168,76,0.6)" : undefined,
              flexShrink: 0,
            }}
          >
            {entry.number}
          </div>
        ))}
      </div>

      {history.length > 3 && (
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
          <span style={{ color: "#e74c3c" }}>● Red: {reds}</span>
          <span style={{ color: "#aaa" }}>● Black: {blacks}</span>
          <span style={{ color: "#27ae60" }}>● Zero: {greens}</span>
        </div>
      )}
    </div>
  );
}
