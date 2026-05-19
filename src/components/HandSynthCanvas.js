"use client";

import { useRef, useEffect } from "react";

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const BLUE = "#2563eb";
const BLUE_40 = "#2563eb66";
const CYAN = "#0891b2";
const CYAN_40 = "#0891b266";
const COLORS = [
  { line: BLUE, glow: BLUE_40 },
  { line: CYAN, glow: CYAN_40 },
];

export default function HandSynthCanvas({ hands, width, height }) {
  const canvasRef = useRef(null);
  const trailsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Fingertip trails
    const newTrails = [];
    hands.forEach((landmarks, hi) => {
      [4, 8, 12, 16, 20].forEach((i) => {
        const pt = landmarks[i];
        newTrails.push({ x: pt.x * width, y: pt.y * height, age: 0, hi });
      });
    });
    trailsRef.current = [
      ...newTrails,
      ...trailsRef.current.map((t) => ({ ...t, age: t.age + 1 })).filter((t) => t.age < 8),
    ];

    trailsRef.current.forEach((t) => {
      const alpha = (1 - t.age / 8) * 0.2;
      const r = (1 - t.age / 8) * 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `${COLORS[t.hi % 2].line}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();
    });

    hands.forEach((landmarks, handIdx) => {
      const { line, glow } = COLORS[handIdx % 2];

      // Connections — thin, clean
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = line;
      CONNECTIONS.forEach(([a, b]) => {
        const pA = landmarks[a];
        const pB = landmarks[b];
        ctx.beginPath();
        ctx.moveTo(pA.x * width, pA.y * height);
        ctx.lineTo(pB.x * width, pB.y * height);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Landmarks
      landmarks.forEach((pt, i) => {
        const isFingerTip = [4, 8, 12, 16, 20].includes(i);
        const x = pt.x * width;
        const y = pt.y * height;

        if (isFingerTip) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
          g.addColorStop(0, glow);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.fillRect(x - 10, y - 10, 20, 20);

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = line;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fill();
        }
      });

      // Pinch indicator
      const thumb = landmarks[4];
      const index = landmarks[8];
      const dist = Math.sqrt((thumb.x - index.x) ** 2 + (thumb.y - index.y) ** 2);
      if (dist < 0.06) {
        const cx = ((thumb.x + index.x) / 2) * width;
        const cy = ((thumb.y + index.y) / 2) * height;

        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = line;
        ctx.fill();
      }
    });
  }, [hands, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    />
  );
}
