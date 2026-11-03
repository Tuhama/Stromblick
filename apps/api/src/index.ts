import express from "express";
import { HealthResponse } from "@stromblick/shared";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.get("/", (_req, res) => {
    const body: HealthResponse = { status: "ok", service: "api" };
    res.json(HealthResponse.parse(body));
});

app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});