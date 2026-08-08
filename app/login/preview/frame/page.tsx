/**
 * TEMPORARY — same-origin 390px wrapper so the overflow probe inside the
 * iframe can be hoisted into this document for `--dump-dom`. Headless Chrome
 * clamps `--window-size` to ~500px, so a real 390px viewport needs an iframe.
 *
 *   /login/preview/frame?screen=checks
 */
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function FrameInner() {
  const screen = useSearchParams().get("screen") ?? "dashboard";

  return (
    <>
      <pre id="hoisted" style={{ margin: 0, font: "11px monospace" }}>
        waiting…
      </pre>
      <iframe
        id="f"
        src={`/login/preview?screen=${screen}`}
        style={{ width: 390, height: 1400, border: 0, display: "block" }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
          setTimeout(() => {
            const d = document.getElementById('f').contentDocument;
            const p = d && d.getElementById('probe');
            document.getElementById('hoisted').textContent =
              p ? p.textContent : 'probe not found in iframe';
          }, 4000);`,
        }}
      />
    </>
  );
}

export default function Frame() {
  return (
    <Suspense>
      <FrameInner />
    </Suspense>
  );
}
