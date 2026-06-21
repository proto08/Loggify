"use client";

import FingerprintJS, { hashComponents } from "@fingerprintjs/fingerprintjs";
import { useEffect, useState } from "react";

export type BrowserFingerprint = {
  visitorId: string;
  webglRenderer: string;
  webglVendor: string;
  canvasHash: string;
};

export function useBrowserFingerprint(): BrowserFingerprint {
  const [fingerprint, setFingerprint] = useState<BrowserFingerprint | null>(null);

  useEffect(() => {
    FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => {
        const webglComp = result.components.webGlBasics;
        const canvasComp = result.components.canvas;

        const webglValue =
          "value" in webglComp && typeof webglComp.value === "object" ? webglComp.value : null;

        setFingerprint({
          visitorId: result.visitorId,
          webglRenderer: webglValue?.rendererUnmasked || webglValue?.renderer || "N/A",
          webglVendor: webglValue?.vendorUnmasked || webglValue?.vendor || "N/A",
          canvasHash: "value" in canvasComp ? hashComponents({ canvas: canvasComp }) : "N/A",
        });
      })
      .catch(() => {
        setFingerprint({
          visitorId: "N/A",
          webglRenderer: "N/A",
          webglVendor: "N/A",
          canvasHash: "N/A",
        });
      });
  }, []);

  return fingerprint as BrowserFingerprint;
}
