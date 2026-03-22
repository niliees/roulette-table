"use client";

import React, { useEffect, useState } from "react";
import { RED_NUMBERS } from "@/lib/roulette";

interface Props {
  winAmount: number;
  totalBet: number;
  winningNumber: number;
  onClose: () => void;
}

function getColor(n: number): string {
  if (n === 0) return "#27ae60";
  if (RED_NUMBERS.has(n)) return "#c0392b";
  return "#222";
}

function getColorName(n: number): string {
  if (n === 0) return "Green";
  if (RED_NUMBERS.has(n)) return "Red";
  return "Black";
}

// Pre-computed so no Math.random() during render
const CONFETTI_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  duration: 1 + (i % 5) * 0.4,
  delay: (i % 6) * 0.5,
}));

export default function WinNotification({ winAmount, totalBet, winningNumber, onClose }: Props) {
  const [visible, setVisible] = useState(true);
  const net = winAmount - totalBet;
  const isWin = winAmount > 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
      onClick={() => { setVisible(false); setTimeout(onClose, 400); }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0a1628, #1a2a4a)",
          border: `3px solid ${isWin ? "#c9a84c" : "rgba(255,255,255,0.2)"}`,
          borderRadius: 20,
          padding: "40px 60px",
          textAlign: "center",
          boxShadow: isWin
            ? "0 0 60px rgba(201,168,76,0.5), 0 20px 60px rgba(0,0,0,0.8)"
            : "0 20px 60px rgba(0,0,0,0.8)",
          transform: visible ? "scale(1)" : "scale(0.9)",
          transition: "transform 0.4s ease",
          maxWidth: 360,
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Winning number */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginBottom: 8 }}>
            WINNING NUMBER
          </div>
          <div style={{
            display: "inline-flex",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${getColor(winningNumber)}cc, ${getColor(winningNumber)})`,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: "bold",
            color: "white",
            border: "3px solid rgba(255,255,255,0.4)",
            boxShadow: `0 0 30px ${getColor(winningNumber)}80`,
          }}>
            {winningNumber}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 8 }}>
            {getColorName(winningNumber)}
            {winningNumber !== 0 && ` • ${winningNumber % 2 === 0 ? "Even" : "Odd"}`}
            {winningNumber !== 0 && ` • ${winningNumber <= 18 ? "1-18" : "19-36"}`}
          </div>
        </div>

        {/* Result */}
        <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 10 }}>
          {isWin ? (
            <span style={{ color: "#f0d878" }}>
              🏆 You Win!
            </span>
          ) : (
            <span style={{ color: "rgba(255,255,255,0.7)" }}>
              No Win This Round
            </span>
          )}
        </div>

        {isWin && (
          <div style={{ fontSize: 40, fontWeight: "bold", color: "#f0d878", margin: "10px 0" }}>
            +${winAmount.toLocaleString('en-US')}
          </div>
        )}

        {isWin && net > 0 && (
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            Net profit: +${net.toLocaleString('en-US')}
          </div>
        )}

        {!isWin && totalBet > 0 && (
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
            Lost ${totalBet.toLocaleString('en-US')}
          </div>
        )}

        <div style={{
          marginTop: 24,
          fontSize: 12,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: 1,
        }}>
          Click anywhere to continue
        </div>
      </div>

      {/* Confetti-like particles for win */}
      {isWin && CONFETTI_PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "fixed",
            left: `${p.left}%`,
            top: "-20px",
            width: 8,
            height: 8,
            borderRadius: i % 2 === 0 ? "50%" : "0",
            background: ["#c9a84c", "#f0d878", "#e74c3c", "#2980b9", "#27ae60"][i % 5],
            animation: `floatUp ${p.duration}s ease-out ${p.delay}s forwards`,
            opacity: 0,
            zIndex: 999,
          }}
        />
      ))}
    </div>
  );
}
