"use client";

import React from "react";

interface Props {
  selected: number;
  onSelect: (value: number) => void;
  disabled?: boolean;
}

const CHIPS = [
  { value: 1, color: "#f0c040", textColor: "#1a1a1a" },
  { value: 5, color: "#e74c3c", textColor: "#fff" },
  { value: 10, color: "#2980b9", textColor: "#fff" },
  { value: 25, color: "#8e44ad", textColor: "#fff" },
  { value: 50, color: "#1a7a3c", textColor: "#fff" },
  { value: 100, color: "#222", textColor: "#f0c040" },
];

export default function ChipSelector({ selected, onSelect, disabled }: Props) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
      {CHIPS.map(({ value, color, textColor }) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onSelect(value)}
            disabled={disabled}
            style={{
              width: isSelected ? 58 : 50,
              height: isSelected ? 58 : 50,
              borderRadius: "50%",
              background: color,
              color: textColor,
              fontWeight: "bold",
              fontSize: isSelected ? 15 : 13,
              border: isSelected
                ? "3px solid #f0d878"
                : "2px solid rgba(255,255,255,0.3)",
              cursor: disabled ? "not-allowed" : "pointer",
              boxShadow: isSelected
                ? `0 0 20px ${color}, 0 4px 12px rgba(0,0,0,0.5)`
                : "0 3px 8px rgba(0,0,0,0.4)",
              transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              transform: isSelected ? "translateY(-4px)" : "translateY(0)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              outline: "none",
            }}
          >
            {/* Chip edge lines */}
            <div style={{
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              border: `2px dashed ${textColor}`,
              opacity: 0.4,
              pointerEvents: "none",
            }} />
            <span style={{ position: "relative", zIndex: 1 }}>{value}</span>
          </button>
        );
      })}
    </div>
  );
}
