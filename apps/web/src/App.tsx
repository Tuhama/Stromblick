import { useEffect, useState } from "react";
import { HealthResponse } from "@stromblick/shared";

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((json: unknown) => setHealth(HealthResponse.parse(json)))
      .catch((e: unknown) => setError(String(e)));
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
