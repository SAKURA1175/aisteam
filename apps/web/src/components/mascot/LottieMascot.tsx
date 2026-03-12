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

export function LottieMascot({
  src,
  fallback,
  className = ""
}: {
  src: string;
  fallback: string;
  className?: string;
}) {
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    let active = true;

    void loadAnimationData(src)
      .then((data) => {
        if (active) {
          setAnimationData(data);
        }
      })
      .catch(() => {
        if (active) {
          setAnimationData(null);
        }
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!animationData) {
    return <div className={`lottie-mascot lottie-mascot--fallback ${className}`.trim()}>{fallback}</div>;
  }

  return (
    <div className={`lottie-mascot ${className}`.trim()}>
      <Lottie animationData={animationData} autoplay={true} loop={true} />
    </div>
  );
}
