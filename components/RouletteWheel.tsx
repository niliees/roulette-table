"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { ROULETTE_NUMBERS, RED_NUMBERS, BLACK_NUMBERS } from "@/lib/roulette";

export interface RouletteWheelHandle {
  spin: (winningNumber: number, onDone: () => void) => void;
}

interface Props {
  size?: number;
}

const SEGMENTS = ROULETTE_NUMBERS.length; // 37
const SEGMENT_ANGLE = 360 / SEGMENTS;

// Round to 4 decimal places so server and client produce identical strings.
const r = (n: number) => Math.round(n * 10000) / 10000;

function getColor(n: number): string {
  if (n === 0) return "#1a7a3c";
  if (RED_NUMBERS.has(n)) return "#b91c1c";
  if (BLACK_NUMBERS.has(n)) return "#1a1a1a";
  return "#1a1a1a";
}

const RouletteWheel = forwardRef<RouletteWheelHandle, Props>(({ size = 380 }, ref) => {
  const wheelRef = useRef<SVGGElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  // Track final ball position in state so React's commit matches what setAttribute set.
  const [ballPos, setBallPos] = useState<{ cx: number; cy: number } | null>(null);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const doneCallbackRef = useRef<(() => void) | null>(null);
  const winningNumberRef = useRef<number>(0);
  const currentWheelAngleRef = useRef<number>(0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.47;
  const numberR = size * 0.38;
  const innerR = size * 0.28;
  const ballTrackR = size * 0.415;
  const ballFinalR = size * 0.31;

  // Build segments
  const segments = ROULETTE_NUMBERS.map((num, i) => {
    const startAngle = i * SEGMENT_ANGLE - 90;
    const endAngle = startAngle + SEGMENT_ANGLE;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = r(cx + outerR * Math.cos(startRad));
    const y1 = r(cy + outerR * Math.sin(startRad));
    const x2 = r(cx + outerR * Math.cos(endRad));
    const y2 = r(cy + outerR * Math.sin(endRad));
    const x3 = r(cx + innerR * Math.cos(endRad));
    const y3 = r(cy + innerR * Math.sin(endRad));
    const x4 = r(cx + innerR * Math.cos(startRad));
    const y4 = r(cy + innerR * Math.sin(startRad));

    const midAngle = startAngle + SEGMENT_ANGLE / 2;
    const midRad = (midAngle * Math.PI) / 180;
    const textX = r(cx + numberR * Math.cos(midRad));
    const textY = r(cy + numberR * Math.sin(midRad));

    return {
      num,
      path: `M ${x1} ${y1} A ${r(outerR)} ${r(outerR)} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r(innerR)} ${r(innerR)} 0 0 0 ${x4} ${y4} Z`,
      textX,
      textY,
      textRotation: r(midAngle + 90),
      color: getColor(num),
    };
  });

  useImperativeHandle(ref, () => ({
    spin: (winningNumber: number, onDone: () => void) => {
      if (isSpinning) return;
      setIsSpinning(true);
      setDisplayNumber(null);
      setBallPos(null);
      doneCallbackRef.current = onDone;
      winningNumberRef.current = winningNumber;

      const totalDuration = 6500; // ms
      const startWheelAngle = currentWheelAngleRef.current;
      const wheelExtraRotation = 800 + Math.random() * 400;
      const targetWheelAngle = startWheelAngle + wheelExtraRotation;

      // Segments are drawn starting at (i * SEGMENT_ANGLE - 90)°, so the midpoint
      // of segment i is at (i * SEGMENT_ANGLE - 90 + SEGMENT_ANGLE/2) in the unrotated wheel.
      // After the wheel rotates by targetWheelAngle, that midpoint is at:
      //   i * SEGMENT_ANGLE - 90 + SEGMENT_ANGLE/2 + targetWheelAngle
      const winIndex = ROULETTE_NUMBERS.indexOf(winningNumber);
      const ballAbsolute =
        targetWheelAngle + winIndex * SEGMENT_ANGLE - 90 + SEGMENT_ANGLE / 2;

      // Normalize to [0,360) so large accumulated angles don't cause float drift
      const ballAbsoluteAngle = ((ballAbsolute % 360) + 360) % 360;

      const ballStartAngle = Math.random() * 360;
      const ballExtraRotations = 5 + Math.floor(Math.random() * 3);
      // CORRECT formula: ball travels CCW (negative) and arrives exactly at ballAbsoluteAngle
      const ballTravelAngle = ballAbsoluteAngle - ballStartAngle - ballExtraRotations * 360;

      startTimeRef.current = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const t = Math.min(elapsed / totalDuration, 1);

        // Ease out cubic for wheel
        const wheelEase = 1 - Math.pow(1 - t, 3);
        const currentWheelAngle = startWheelAngle + wheelExtraRotation * wheelEase;
        currentWheelAngleRef.current = currentWheelAngle;

        if (wheelRef.current) {
          wheelRef.current.setAttribute("transform", `rotate(${currentWheelAngle}, ${cx}, ${cy})`);
        }

        // Ball: ease-out quad that reaches 1.0 exactly at t=1 — no plateau
        const ballEase = 1 - Math.pow(1 - t, 2);
        const ballAngle = ballStartAngle + ballTravelAngle * ballEase;

        // Ball spirals inward in the last 30%
        let currentBallR: number;
        if (t < 0.7) {
          currentBallR = ballTrackR;
        } else {
          const dropT = (t - 0.7) / 0.3;
          const bounce = Math.sin(dropT * Math.PI * 3) * 8 * (1 - dropT);
          currentBallR = ballTrackR - (ballTrackR - ballFinalR) * dropT + bounce;
        }

        const ballRad = (ballAngle * Math.PI) / 180;
        const ballX = cx + currentBallR * Math.cos(ballRad);
        const ballY = cy + currentBallR * Math.sin(ballRad);

        if (ballRef.current) {
          ballRef.current.setAttribute("cx", String(ballX));
          ballRef.current.setAttribute("cy", String(ballY));
        }

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Final snap — safeguard so floating-point is exact
          if (wheelRef.current) {
            wheelRef.current.setAttribute("transform", `rotate(${targetWheelAngle}, ${cx}, ${cy})`);
          }
          const finalRad = (ballAbsoluteAngle * Math.PI) / 180;
          const finalX = r(cx + ballFinalR * Math.cos(finalRad));
          const finalY = r(cy + ballFinalR * Math.sin(finalRad));
          if (ballRef.current) {
            ballRef.current.setAttribute("cx", String(finalX));
            ballRef.current.setAttribute("cy", String(finalY));
          }

          // Sync state so React's commit writes the same values setAttribute just set
          setBallPos({ cx: finalX, cy: finalY });
          setIsSpinning(false);
          setDisplayNumber(winningNumber);
          if (doneCallbackRef.current) {
            doneCallbackRef.current();
          }
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
  }));

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      className="wheel-container"
      style={{ width: size, height: size, position: "relative" }}
    >
      <svg
        width={size}
        height={size}
        style={{ filter: "drop-shadow(0 0 30px rgba(201,168,76,0.35)) drop-shadow(0 10px 40px rgba(0,0,0,0.9))" }}
      >
        <defs>
          <radialGradient id="outerRingGrad" cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="#8b6914" />
            <stop offset="100%" stopColor="#c9a84c" />
          </radialGradient>
          <radialGradient id="innerBossGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#e0c060" />
            <stop offset="50%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#7a5c1a" />
          </radialGradient>
          <radialGradient id="hubGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#f0d878" />
            <stop offset="60%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#6b4e13" />
          </radialGradient>
          <filter id="ballShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.8)" />
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(255,255,255,0.3)" />
          </filter>
          <filter id="segShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.5)" />
          </filter>
        </defs>

        {/* Outer decorative ring */}
        <circle cx={cx} cy={cy} r={outerR + 18} fill="url(#outerRingGrad)" />
        {/* Diamond decorations on outer ring */}
        {Array.from({ length: 37 }).map((_, i) => {
          const angle = r((i * 360) / 37 - 90);
          const rad = (angle * Math.PI) / 180;
          const dx = r(cx + (outerR + 9) * Math.cos(rad));
          const dy = r(cy + (outerR + 9) * Math.sin(rad));
          return (
            <rect
              key={i}
              x={r(dx - 3)}
              y={r(dy - 3)}
              width={6}
              height={6}
              fill={i % 2 === 0 ? "#f0d878" : "#c9a84c"}
              transform={`rotate(${r(angle + 90)}, ${dx}, ${dy})`}
              opacity={0.9}
            />
          );
        })}

        {/* Rotating wheel group */}
        <g ref={wheelRef}>
          {/* Segments */}
          {segments.map(({ num, path, textX, textY, textRotation, color }) => (
            <g key={num}>
              <path
                d={path}
                fill={color}
                stroke="#c9a84c"
                strokeWidth="0.8"
              />
              <text
                x={textX}
                y={textY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.035}
                fontWeight="bold"
                fill="white"
                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                style={{ userSelect: "none", pointerEvents: "none" }}
              >
                {num}
              </text>
            </g>
          ))}

          {/* Inner decorative ring */}
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            fill="url(#innerBossGrad)"
            stroke="#f0d878"
            strokeWidth="2"
          />

          {/* Spokes */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x2 = r(cx + (innerR - 6) * Math.cos(angle));
            const y2 = r(cy + (innerR - 6) * Math.sin(angle));
            const x1 = r(cx + (innerR * 0.35) * Math.cos(angle));
            const y1 = r(cy + (innerR * 0.35) * Math.sin(angle));
            return (
              <line
                key={i}
                x1={x1} y1={y1}
                x2={x2} y2={y2}
                stroke="#f0d878"
                strokeWidth="1.5"
                opacity={0.6}
              />
            );
          })}
        </g>

        {/* Center hub (static) */}
        <circle cx={cx} cy={cy} r={innerR * 0.35} fill="url(#hubGrad)" stroke="#f0d878" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={innerR * 0.15} fill="#1a1a1a" stroke="#c9a84c" strokeWidth="1" />

        {/* Ball — cx/cy come from state after animation so React's commit matches setAttribute */}
        <circle
          ref={ballRef}
          cx={ballPos ? ballPos.cx : r(cx)}
          cy={ballPos ? ballPos.cy : r(cy - ballTrackR)}
          r={7}
          fill="white"
          filter="url(#ballShadow)"
          style={{ display: isSpinning || displayNumber !== null ? "block" : "none" }}
        />


        {/* Pointer / Fret */}
        <polygon
          points={`${cx - 8},${cy - outerR - 2} ${cx + 8},${cy - outerR - 2} ${cx},${cy - outerR + 14}`}
          fill="#f0d878"
          stroke="#8b6914"
          strokeWidth="1"
        />
      </svg>

      {/* Winning number display */}
      {displayNumber !== null && !isSpinning && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: size * 0.14,
            height: size * 0.14,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.06,
            fontWeight: "bold",
            color: "white",
            background:
              displayNumber === 0
                ? "radial-gradient(circle, #27ae60, #1a7a3c)"
                : RED_NUMBERS.has(displayNumber)
                ? "radial-gradient(circle, #e74c3c, #b91c1c)"
                : "radial-gradient(circle, #333, #111)",
            border: "2px solid #f0d878",
            boxShadow: "0 0 20px rgba(201,168,76,0.8)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {displayNumber}
        </div>
      )}
    </div>
  );
});

RouletteWheel.displayName = "RouletteWheel";
export default RouletteWheel;
