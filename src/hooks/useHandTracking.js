"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export default function useHandTracking(videoRef) {
  const handLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const [hands, setHands] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { HandLandmarker, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );

        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
        });

        if (cancelled) return;
        handLandmarkerRef.current = landmarker;
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const startTracking = useCallback(() => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !landmarker) return;

    let lastTime = -1;

    function detect() {
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        setHands(result.landmarks || []);
      }
      animationRef.current = requestAnimationFrame(detect);
    }

    detect();
  }, [videoRef]);

  const stopTracking = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  return { hands, ready, error, startTracking, stopTracking };
}
