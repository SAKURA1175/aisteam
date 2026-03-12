"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

type LottieAnimationData = Record<string, unknown>;

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

function decodeAnimationPayload(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  return new TextDecoder("utf-8").decode(bytes);
}

async function loadAnimationData(path: string): Promise<LottieAnimationData> {
  const response = await fetch(path, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Animation request failed with status ${response.status}`);
  }

  const raw = decodeAnimationPayload(await response.arrayBuffer()).trim();
  return JSON.parse(raw) as LottieAnimationData;
}

export function HatchingChick() {
  const [isMounted, setIsMounted] = useState(false);
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    loadAnimationData("/lottie/chick-hatching.json")
      .then((data: unknown) => {
        setAnimationData((data ?? {}) as LottieAnimationData);
        setIsMounted(true);
      })
      .catch((error) => {
        console.error("Failed to load Lottie animation:", error);
        setIsMounted(true);
      });
  }, []);

  if (!isMounted || !animationData) {
    return <div className="w-64 h-64 flex items-center justify-center">...</div>;
  }

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <div className="absolute bottom-4 w-48 h-8 bg-primary/20 rounded-[100%] blur-xl" />

      <div className="relative z-10 w-full h-full transform scale-125 pointer-events-none">
        <Lottie animationData={animationData} autoplay={true} loop={true} />
      </div>
    </div>
  );
}
