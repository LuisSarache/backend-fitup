import "./lib/env";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import workoutsRouter from "./routes/workouts";
import streakRouter from "./routes/streak";
import achievementsRouter from "./routes/achievements";
import { errorHandler } from "./middlewares/errorHandler";
import { env } from "./lib/env";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(express.json());

app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/workouts", workoutsRouter);
app.use("/streak", streakRouter);
app.use("/achievements", achievementsRouter);

app.use(errorHandler);

export default app;
