# apps/api

- Routes in src/routes/, one file per resource; business logic stays out of route handlers.
- Errors use RFC 9457 problem details through the central error handler; never send stack traces.
- Database access only through Prisma. Schema changes only via new migrations; never edit applied ones.
- Ingestion is idempotent (upserts) and records every run in ingest_runs.
- Log with the request logger (Pino), not console.log.
