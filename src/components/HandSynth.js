"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import useHandTracking from "@/hooks/useHandTracking";
import useSynthEngine from "@/hooks/useSynthEngine";
import HandSynthCanvas from "./HandSynthCanvas";
import SynthKnob from "./SynthKnob";

export default function HandSynth() {
  const videoRef = useRef(null);
  const vizRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [synthParams, setSynthParams] = useState(null);
  const [vizDims, setVizDims] = useState({ width: 640, height: 480 });

  const { hands, ready, error, startTracking } = useHandTracking(videoRef);
  const { initAudio, updateFromHands } = useSynthEngine();

  useEffect(() => {
    function measure() {
      if (vizRef.current) {
        const r = vizRef.current.getBoundingClientRect();
        setVizDims({ width: r.width, height: r.height });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!started) return;
    const params = updateFromHands(hands);
    if (params) setSynthParams(params);
  }, [hands, started, updateFromHands]);

  const handleStart = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
      });
      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise((resolve) => { video.onloadeddata = resolve; });
      await video.play();
      await initAudio();
      startTracking();
      setStarted(true);
    } catch (err) {
      console.error("Failed to start:", err);
    }
  }, [initAudio, startTracking]);

  const p = synthParams || {};
  const filterVal = p.filterFreq ? (p.filterFreq - 200) / 9800 : 0;
  const reverbVal = p.reverbMix || 0;
  const delayVal = p.delayMix ? p.delayMix / 0.8 : 0;
  const chorusVal = p.chorusDepth || 0;
  const volVal = p.volume ? (p.volume + 30) / 27 : 0;
  const panVal = p.pan ? (p.pan + 1) / 2 : 0.5;
  const detuneVal = p.detune ? p.detune / 100 : 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="panel px-8 py-6 max-w-md text-center">
          <div className="text-red-400 text-sm font-medium mb-2">Unable to initialize</div>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 h-11 flex-shrink-0 panel" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-on-glass)" }}>
            aethon
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>
            1.0
          </span>
        </div>

        {started && (
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${hands.length > 0 ? "animate-pulse-subtle" : ""}`}
              style={{ background: hands.length > 0 ? "var(--accent)" : "rgba(255,255,255,0.2)" }}
            />
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {hands.length === 0 ? "no input" : `${hands.length} hand${hands.length > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col p-2 gap-2 min-w-0">

          {/* Visualization */}
          <div ref={vizRef} className="flex-1 panel-inset relative overflow-hidden">
            <video
              ref={videoRef}
              className="absolute opacity-0 pointer-events-none"
              style={{ width: 1, height: 1 }}
              playsInline
              muted
            />

            {started ? (
              <>
                {/* Hand canvas */}
                <div style={{ transform: "scaleX(-1)" }}>
                  <HandSynthCanvas hands={hands} width={vizDims.width} height={vizDims.height} />
                </div>

                {/* Note display */}
                {p.note && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-7xl font-bold tracking-tighter" style={{ color: "var(--accent)", opacity: 0.12 }}>
                      {p.note}
                    </span>
                  </div>
                )}

                {hands.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Show your hands to play</p>
                  </div>
                )}
              </>
            ) : (
              /* ── Start screen ── */
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center max-w-md px-4">
                  <h2 className="animate-fade-in text-2xl font-semibold mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                    aethon
                  </h2>
                  <p className="animate-fade-in-1 text-[13px] text-center leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Hand-gesture controlled generative synthesizer
                  </p>

                  <button
                    onClick={handleStart}
                    disabled={!ready}
                    className="animate-fade-in-2 px-8 py-2.5 text-[13px] font-medium transition-all duration-200
                               disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer mb-8"
                    style={{
                      background: ready ? "var(--accent)" : "rgba(255,255,255,0.08)",
                      color: ready ? "#1a1a2e" : "rgba(255,255,255,0.3)",
                      borderRadius: "3px",
                      border: "none",
                    }}
                  >
                    {ready ? "Start Session" : "Loading model..."}
                  </button>

                  {/* Instructions */}
                  <div className="animate-fade-in-3 w-full">
                    <div className="grid grid-cols-2 gap-5 px-5 py-4" style={{
                      background: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "4px",
                    }}>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{ color: "var(--accent)" }}>
                          Right Hand
                        </div>
                        <div className="space-y-2">
                          <IRow gesture="Pinch thumb + index" action="Play note" />
                          <IRow gesture="Move up / down" action="Change pitch" />
                          <IRow gesture="Spread fingers" action="Open filter" />
                          <IRow gesture="Move left / right" action="Stereo pan" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{ color: "var(--accent)" }}>
                          Left Hand
                        </div>
                        <div className="space-y-2">
                          <IRow gesture="Move up / down" action="Reverb" />
                          <IRow gesture="Move left / right" action="Delay" />
                          <IRow gesture="Spread fingers" action="Chorus" />
                          <IRow gesture="Pinch distance" action="Volume" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-center mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Requires camera access. Best in good lighting.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom strip */}
          {started && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="panel-inset w-28 h-[64px] overflow-hidden relative flex-shrink-0">
                <video
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                  playsInline
                  muted
                  ref={(el) => {
                    if (el && videoRef.current?.srcObject) {
                      el.srcObject = videoRef.current.srcObject;
                      el.play().catch(() => {});
                    }
                  }}
                />
                <div className="absolute bottom-0.5 left-1.5 text-[7px] font-mono uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.4)" }}>
                  in
                </div>
              </div>

              <div className="flex-1 panel-inset px-3 py-2 flex items-center gap-4">
                <Meter label="Filter" value={filterVal} />
                <Meter label="Reverb" value={reverbVal} />
                <Meter label="Delay" value={delayVal} />
                <Meter label="Chorus" value={chorusVal} />
                <Meter label="Volume" value={volVal} />
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        {started && (
          <aside className="w-56 flex-shrink-0 flex flex-col p-3 gap-4 overflow-y-auto panel" style={{ borderRadius: 0, borderTop: "none" }}>

            <Section title="Voice">
              <div className="flex justify-around">
                <SynthKnob label="Pitch" value={p.note ? 1 : 0} color="var(--accent)" />
                <SynthKnob label="Detune" value={detuneVal} color="#88b4d4" />
                <SynthKnob label="Pan" value={panVal} color="#88b4d4" />
              </div>
              {p.note && (
                <div className="text-center mt-1.5">
                  <span className="text-base font-mono font-semibold" style={{ color: "var(--accent)" }}>{p.note}</span>
                </div>
              )}
            </Section>

            <Section title="Filter">
              <div className="flex justify-around">
                <SynthKnob label="Cutoff" value={filterVal} color="var(--accent)" />
                <SynthKnob label="Res" value={0.5} color="#88b4d4" />
              </div>
            </Section>

            <Section title="Effects">
              <div className="grid grid-cols-3 gap-1 justify-items-center">
                <SynthKnob label="Reverb" value={reverbVal} color="var(--accent)" />
                <SynthKnob label="Delay" value={delayVal} color="#88b4d4" />
                <SynthKnob label="Chorus" value={chorusVal} color="var(--accent)" />
              </div>
            </Section>

            <Section title="Output">
              <div className="flex justify-around">
                <SynthKnob label="Volume" value={volVal} color="var(--accent)" />
                <SynthKnob label="Mix" value={0.7} color="#88b4d4" />
              </div>
            </Section>

            <div className="mt-auto pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[9px] font-medium uppercase tracking-[0.1em] mb-2" style={{ color: "var(--text-3)" }}>
                Controls
              </div>
              <div className="space-y-1">
                <GRow k="R pinch" v="Play" />
                <GRow k="R height" v="Pitch" />
                <GRow k="R spread" v="Filter" />
                <GRow k="R pan" v="Stereo" />
                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <GRow k="L height" v="Reverb" />
                <GRow k="L pan" v="Delay" />
                <GRow k="L spread" v="Chorus" />
                <GRow k="L pinch" v="Volume" />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2.5 pb-1.5"
        style={{ color: "var(--text-3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function GRow({ k, v }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{k}</span>
      <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{v}</span>
    </div>
  );
}

function IRow({ gesture, action }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.35)" }}>{gesture}</span>
      <span className="text-[11px] leading-tight font-medium ml-auto text-right whitespace-nowrap" style={{ color: "rgba(255,255,255,0.7)" }}>{action}</span>
    </div>
  );
}

function Meter({ label, value }) {
  const w = Math.max(1, Math.min(100, value * 100));
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
        <span className="text-[8px] font-mono tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>{Math.round(value * 100)}</span>
      </div>
      <div className="h-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)", borderRadius: "1px" }}>
        <div className="h-full transition-all duration-100"
          style={{ width: `${w}%`, background: "var(--accent)", borderRadius: "1px" }} />
      </div>
    </div>
  );
}
