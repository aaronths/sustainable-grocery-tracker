import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { HttpError } from "./lib/http-error";

// Best-effort local .env loading (no dotenv dependency needed on Node 20.12+).
// Safe in prod/test too: a missing .env file is silently ignored.
try {
  process.loadEnvFile?.();
} catch {
  // no .env file present — fine, env vars may be set another way
}

import healthRouter from "./routes/health";
import meRouter from "./routes/me";
import dashboardRouter from "./routes/dashboard";
import receiptsRouter from "./routes/receipts";
import categoriesRouter from "./routes/categories";
import weeksRouter from "./routes/weeks";
import statsRouter from "./routes/stats";
import swapsRouter from "./routes/swaps";
import challengesRouter from "./routes/challenges";
import offsetsRouter from "./routes/offsets";
import leaguesRouter from "./routes/leagues";
import patientHealthRouter from "./routes/patientHealth";
import devRouter from "./routes/dev";

export const app = express();

app.use(cors());
app.use(express.json());

const api = express.Router();
api.use(healthRouter);
api.use(meRouter);
api.use(dashboardRouter);
api.use(receiptsRouter);
api.use(categoriesRouter);
api.use(weeksRouter);
api.use(statsRouter);
api.use(swapsRouter);
api.use(challengesRouter);
api.use(offsetsRouter);
api.use(leaguesRouter);
api.use(patientHealthRouter);
api.use(devRouter);

app.use("/api", api);

app.use((req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});

if (require.main === module) {
  const port = Number(process.env.PORT ?? 4000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`GreenGro API listening on http://0.0.0.0:${port}`);
  });
}
