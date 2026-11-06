import { useEffect, useState } from "react";
import { HealthResponse } from "@stromblick/shared";
import { getJson } from "./api/client";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // StrictMode runs effects twice in development; aborting drops the first request.
    const controller = new AbortController();
    getJson("/health", HealthResponse, { signal: controller.signal })
      .then(setHealth)
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Stromblick</h1>
      {error && <p>API error: {error}</p>}
      {health && (
        <p>
          API status: {health.status} ({health.service})
        </p>
      )}
    </main>
  );
}
