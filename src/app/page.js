"use client";

import dynamic from "next/dynamic";

const HandSynth = dynamic(() => import("@/components/HandSynth"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black">
      <p className="text-white/40 font-mono text-sm">Loading...</p>
    </div>
  ),
});

export default function Home() {
  return <HandSynth />;
}
