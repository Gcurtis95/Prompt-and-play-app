"use client";

import { useEffect, useRef, useCallback } from "react";

// Pentatonic scale frequencies for musical output
const SCALE_NOTES = [
  "C3", "D3", "E3", "G3", "A3",
  "C4", "D4", "E4", "G4", "A4",
  "C5", "D5", "E5", "G5", "A5",
  "C6",
];

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export default function useSynthEngine() {
  const toneRef = useRef(null);
  const synthRef = useRef(null);
  const filterRef = useRef(null);
  const reverbRef = useRef(null);
  const delayRef = useRef(null);
  const chorusRef = useRef(null);
  const pannerRef = useRef(null);
  const activeRef = useRef(false);
  const lastNoteRef = useRef(null);
  const paramsRef = useRef({
    note: null,
    filterFreq: 2000,
    reverbMix: 0,
    delayMix: 0,
    volume: -12,
    pan: 0,
    detune: 0,
    chorusDepth: 0,
  });

  const initAudio = useCallback(async () => {
    if (toneRef.current) return;

    const Tone = await import("tone");
    toneRef.current = Tone;

    await Tone.start();

    const reverb = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();
    const delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.3,
      wet: 0,
    }).connect(reverb);
    const chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0,
      wet: 0.5,
    })
      .connect(delay)
      .start();
    const panner = new Tone.Panner(0).connect(chorus);
    const filter = new Tone.Filter({
      frequency: 2000,
      type: "lowpass",
      rolloff: -24,
    }).connect(panner);

    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 6,
      voice: Tone.Synth,
      options: {
        oscillator: { type: "fatsawtooth", spread: 20, count: 3 },
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.6, release: 1.2 },
        volume: -12,
      },
    }).connect(filter);

    synthRef.current = synth;
    filterRef.current = filter;
    reverbRef.current = reverb;
    delayRef.current = delay;
    chorusRef.current = chorus;
    pannerRef.current = panner;
    activeRef.current = true;
  }, []);

  const updateFromHands = useCallback((hands) => {
    if (!activeRef.current || !synthRef.current) return null;

    const Tone = toneRef.current;
    const synth = synthRef.current;
    const filter = filterRef.current;
    const reverb = reverbRef.current;
    const delay = delayRef.current;
    const chorus = chorusRef.current;
    const panner = pannerRef.current;

    const params = { ...paramsRef.current };

    if (hands.length === 0) {
      if (lastNoteRef.current) {
        synth.releaseAll();
        lastNoteRef.current = null;
        params.note = null;
      }
      paramsRef.current = params;
      return params;
    }

    // Right hand (first detected) controls pitch + filter
    const rightHand = hands[0];
    const wrist = rightHand[0];
    const indexTip = rightHand[8];
    const thumbTip = rightHand[4];
    const middleTip = rightHand[12];
    const pinkyTip = rightHand[20];

    // Y position → note selection (inverted: top of screen = high notes)
    const noteIndex = Math.floor(
      clamp(1 - wrist.y, 0, 0.99) * SCALE_NOTES.length
    );
    const note = SCALE_NOTES[noteIndex];
    params.note = note;

    // X position → panning
    params.pan = clamp((wrist.x - 0.5) * 2, -1, 1);
    panner.pan.rampTo(params.pan, 0.05);

    // Thumb-index pinch → trigger/retrigger
    const pinchDist = distance(thumbTip, indexTip);
    const isPinching = pinchDist < 0.06;

    if (isPinching && note !== lastNoteRef.current) {
      if (lastNoteRef.current) {
        synth.triggerRelease(lastNoteRef.current);
      }
      synth.triggerAttack(note, Tone.now(), 0.7);
      lastNoteRef.current = note;
    } else if (!isPinching && lastNoteRef.current) {
      synth.triggerRelease(lastNoteRef.current);
      lastNoteRef.current = null;
    }

    // Finger spread → filter cutoff
    const spread = distance(indexTip, pinkyTip);
    params.filterFreq = clamp(200 + spread * 15000, 200, 10000);
    filter.frequency.rampTo(params.filterFreq, 0.08);

    // Index-middle distance → detune
    const detuneSpread = distance(indexTip, middleTip);
    params.detune = clamp(detuneSpread * 400, 0, 100);
    synth.set({ detune: params.detune });

    // Left hand controls effects
    if (hands.length >= 2) {
      const leftHand = hands[1];
      const lWrist = leftHand[0];
      const lThumb = leftHand[4];
      const lIndex = leftHand[8];
      const lPinky = leftHand[20];

      // Left Y → reverb wet
      params.reverbMix = clamp(1 - lWrist.y, 0, 1);
      reverb.wet.rampTo(params.reverbMix, 0.1);

      // Left X → delay wet
      params.delayMix = clamp(lWrist.x, 0, 0.8);
      delay.wet.rampTo(params.delayMix, 0.1);

      // Left finger spread → chorus depth
      const lSpread = distance(lIndex, lPinky);
      params.chorusDepth = clamp(lSpread * 3, 0, 1);
      chorus.depth = params.chorusDepth;

      // Left pinch → volume control
      const lPinch = distance(lThumb, lIndex);
      params.volume = clamp(-30 + lPinch * 80, -30, -3);
      synth.volume.rampTo(params.volume, 0.05);
    }

    paramsRef.current = params;
    return params;
  }, []);

  const dispose = useCallback(() => {
    activeRef.current = false;
    synthRef.current?.dispose();
    filterRef.current?.dispose();
    reverbRef.current?.dispose();
    delayRef.current?.dispose();
    chorusRef.current?.dispose();
    pannerRef.current?.dispose();
  }, []);

  useEffect(() => {
    return () => dispose();
  }, [dispose]);

  return { initAudio, updateFromHands, params: paramsRef };
}
