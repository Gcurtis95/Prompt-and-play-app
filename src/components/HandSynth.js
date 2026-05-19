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
      <div className="flex items-center justify-center h-screen" style={{ background: "var(--bg)" }}>
        <div className="panel px-8 py-6 max-w-md text-center">
          <div className="text-red-500 text-sm font-medium mb-2">Unable to initialize</div>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 h-12 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: "var(--blue)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 16V21M8 11V21M16 11V21" />
              <path d="M8 5L12 2L16 5" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>HandSynth</span>
        </div>

        {started && (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${hands.length > 0 ? "animate-pulse-subtle" : ""}`}
              style={{ background: hands.length > 0 ? "var(--blue)" : "var(--text-3)" }}
            />
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {hands.length === 0 ? "No hands detected" : `${hands.length} hand${hands.length > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col p-3 gap-2.5 min-w-0">

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
                {/* Dot grid */}
                <div className="absolute inset-0 opacity-[0.4]" style={{
                  backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }} />

                {/* Hand canvas */}
                <div style={{ transform: "scaleX(-1)" }}>
                  <HandSynthCanvas hands={hands} width={vizDims.width} height={vizDims.height} />
                </div>

                {/* Note display */}
                {p.note && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-6xl font-bold tracking-tighter" style={{ color: "var(--blue)", opacity: 0.15 }}>
                      {p.note}
                    </span>
                  </div>
                )}

                {hands.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm" style={{ color: "var(--text-3)" }}>Show your hands to play</p>
                  </div>
                )}
              </>
            ) : (
              /* ── Start screen ── */
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center max-w-sm">
                  <div className="animate-fade-in">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
                      style={{ background: "var(--blue-faint)", border: "1px solid var(--border)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M12 16V21M8 12V21M16 12V21M4 8V21M20 8V21" />
                        <path d="M4 4L8 7L12 3L16 7L20 4" />
                      </svg>
                    </div>
                  </div>

                  <h2 className="animate-fade-in-1 text-xl font-semibold mb-1.5" style={{ color: "var(--text-1)" }}>
                    Hand-Controlled Synth
                  </h2>
                  <p className="animate-fade-in-2 text-[13px] text-center leading-relaxed mb-6" style={{ color: "var(--text-3)" }}>
                    Control pitch, effects, and modulation using hand gestures in real time.
                  </p>

                  <button
                    onClick={handleStart}
                    disabled={!ready}
                    className="animate-fade-in-3 px-6 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                               disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white mb-10"
                    style={{ background: "var(--blue)" }}
                  >
                    {ready ? "Start Session" : "Loading model..."}
                  </button>

                  {/* Instructions */}
                  <div className="animate-fade-in-3 w-full max-w-md">
                    <div className="grid grid-cols-2 gap-5 px-4 py-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2.5" style={{ color: "var(--blue)" }}>
                          Right Hand
                        </div>
                        <div className="space-y-2">
                          <InstructionRow gesture="Pinch thumb + index" action="Play note" />
                          <InstructionRow gesture="Move up / down" action="Change pitch" />
                          <InstructionRow gesture="Spread fingers" action="Open filter" />
                          <InstructionRow gesture="Move left / right" action="Stereo pan" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2.5" style={{ color: "var(--blue)" }}>
                          Left Hand
                        </div>
                        <div className="space-y-2">
                          <InstructionRow gesture="Move up / down" action="Reverb amount" />
                          <InstructionRow gesture="Move left / right" action="Delay amount" />
                          <InstructionRow gesture="Spread fingers" action="Chorus depth" />
                          <InstructionRow gesture="Pinch distance" action="Volume" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-center mt-3" style={{ color: "var(--text-3)" }}>
                      Requires camera access. Works best in good lighting with hands clearly visible.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom strip */}
          {started && (
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Webcam */}
              <div className="panel-inset w-28 h-[68px] overflow-hidden relative flex-shrink-0">
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
                  style={{ color: "rgba(255,255,255,0.5)" }}>
                  input
                </div>
              </div>

              {/* Meters */}
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
          <aside className="w-56 flex-shrink-0 flex flex-col p-3 gap-4 overflow-y-auto"
            style={{ borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>

            <Section title="Voice">
              <div className="flex justify-around">
                <SynthKnob label="Pitch" value={p.note ? 1 : 0} color="var(--blue)" />
                <SynthKnob label="Detune" value={detuneVal} color="var(--blue-light)" />
                <SynthKnob label="Pan" value={panVal} color="#0891b2" />
              </div>
              {p.note && (
                <div className="text-center mt-1.5">
                  <span className="text-base font-mono font-semibold" style={{ color: "var(--blue)" }}>{p.note}</span>
                </div>
              )}
            </Section>

            <Section title="Filter">
              <div className="flex justify-around">
                <SynthKnob label="Cutoff" value={filterVal} color="var(--blue)" />
                <SynthKnob label="Res" value={0.5} color="var(--blue-light)" />
              </div>
            </Section>

            <Section title="Effects">
              <div className="grid grid-cols-3 gap-1 justify-items-center">
                <SynthKnob label="Reverb" value={reverbVal} color="var(--blue)" />
                <SynthKnob label="Delay" value={delayVal} color="#0891b2" />
                <SynthKnob label="Chorus" value={chorusVal} color="var(--blue-light)" />
              </div>
            </Section>

            <Section title="Output">
              <div className="flex justify-around">
                <SynthKnob label="Volume" value={volVal} color="var(--blue)" />
                <SynthKnob label="Mix" value={0.7} color="var(--blue-light)" />
              </div>
            </Section>

            {/* Gesture reference */}
            <div className="mt-auto pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="text-[9px] font-medium uppercase tracking-[0.1em] mb-2" style={{ color: "var(--text-3)" }}>
                Controls
              </div>
              <div className="space-y-1">
                <GRow k="R pinch" v="Play" />
                <GRow k="R height" v="Pitch" />
                <GRow k="R spread" v="Filter" />
                <GRow k="R pan" v="Stereo" />
                <div className="h-px" style={{ background: "var(--border)" }} />
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
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2.5 pb-1.5"
        style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function GRow({ k, v }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{k}</span>
      <span className="text-[10px] font-medium" style={{ color: "var(--text-2)" }}>{v}</span>
    </div>
  );
}

function InstructionRow({ gesture, action }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] leading-tight" style={{ color: "var(--text-3)" }}>{gesture}</span>
      <span className="text-[11px] leading-tight font-medium ml-auto text-right whitespace-nowrap" style={{ color: "var(--text-1)" }}>{action}</span>
    </div>
  );
}

function Meter({ label, value }) {
  const w = Math.max(1, Math.min(100, value * 100));
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{label}</span>
        <span className="text-[8px] font-mono tabular-nums" style={{ color: "var(--text-3)" }}>{Math.round(value * 100)}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-100"
          style={{ width: `${w}%`, background: "var(--blue)" }} />
      </div>
    </div>
  );
}
