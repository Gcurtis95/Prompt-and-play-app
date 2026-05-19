"use client";

const SIZE = 52;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_START = 0.75;
const ARC_SPAN = 0.75;

export default function SynthKnob({ label, value = 0, color = "#2563eb", unit = "" }) {
  const clamped = Math.min(1, Math.max(0, value));
  const dashLen = CIRCUMFERENCE * ARC_SPAN;
  const offset = dashLen * (1 - clamped);
  const displayVal = Math.round(clamped * 100);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="block">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            className="knob-track"
            strokeDasharray={`${dashLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            transform={`rotate(${ARC_START * 360}, ${SIZE / 2}, ${SIZE / 2})`}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            className="knob-value"
            stroke={color}
            strokeDasharray={`${dashLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            transform={`rotate(${ARC_START * 360}, ${SIZE / 2}, ${SIZE / 2})`}
          />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={11} className="knob-dot" />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-medium"
          style={{ color: clamped > 0.01 ? "var(--text-1)" : "var(--text-3)" }}
        >
          {displayVal}
          {unit}
        </div>
      </div>
      <span className="text-[9px] font-medium uppercase tracking-[0.08em]" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
    </div>
  );
}
