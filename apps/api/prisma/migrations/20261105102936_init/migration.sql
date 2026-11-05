-- CreateEnum
CREATE TYPE "series_kind" AS ENUM ('GENERATION', 'PRICE', 'LOAD');

-- CreateEnum
CREATE TYPE "resolution" AS ENUM ('QUARTERHOUR', 'HOUR', 'DAY');

-- CreateEnum
CREATE TYPE "ingest_status" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "series" (
    "id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_de" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "kind" "series_kind" NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "series_id" INTEGER NOT NULL,
    "region" VARCHAR(16) NOT NULL,
    "resolution" "resolution" NOT NULL,
    "ts" TIMESTAMPTZ(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("series_id","region","resolution","ts")
);

-- CreateTable
CREATE TABLE "ingest_runs" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "status" "ingest_status" NOT NULL DEFAULT 'RUNNING',
    "rows_written" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_key_key" ON "series"("key");

-- CreateIndex
CREATE INDEX "ingest_runs_started_at_idx" ON "ingest_runs"("started_at" DESC);

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
