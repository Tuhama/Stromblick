# apps/api

- Routes in src/routes/, one file per resource; business logic stays out of route handlers.
- Errors use RFC 9457 problem details through the central error handler; never send stack traces.
- Send JSON with sendJson(res, Schema, body) from src/respond.ts, never res.json() directly. The schema comes from @stromblick/shared.
- Database access only through Prisma. Schema changes only via new migrations; never edit applied ones.
- Ingestion is idempotent (upserts) and records every run in ingest_runs.
- Log with the request logger (Pino), not console.log.
- Tests never call SMARD. Record responses with curl into src/smard/fixtures/, at the same path as the SMARD URL after /app/.
