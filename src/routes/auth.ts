import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { signAccess, signRefresh, verifyRefresh } from "../lib/jwt";
import { sendPasswordReset } from "../lib/mailer";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { revokeToken, isRevoked } from "../lib/tokenBlacklist";
import { env } from "../lib/env";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ message: "Muitas tentativas. Aguarde alguns minutos." }),
});

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dados inválidos. Verifique os campos." });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ message: "Este e-mail já está cadastrado." });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    res.status(201).json({
      token: signAccess(user.id),
      refreshToken: signRefresh(user.id),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dados inválidos. Verifique os campos." });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Conta não encontrada." });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "E-mail ou senha incorretos." });
      return;
    }
    res.json({
      token: signAccess(user.id),
      refreshToken: signRefresh(user.id),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ message: "refreshToken ausente." });
    return;
  }
  try {
    const payload = verifyRefresh(refreshToken);
    if (isRevoked(payload.jti)) {
      res.status(401).json({ message: "Refresh token inválido ou expirado." });
      return;
    }
    revokeToken(payload.jti);
    res.json({
      token: signAccess(payload.sub),
      refreshToken: signRefresh(payload.sub),
    });
  } catch {
    res.status(401).json({ message: "Refresh token inválido ou expirado." });
  }
});

router.post("/logout", authenticate, (req: Request, res: Response) => {
  const { tokenJti } = req as AuthRequest;
  revokeToken(tokenJti);

  const { refreshToken } = req.body ?? {};
  if (refreshToken && typeof refreshToken === "string") {
    try {
      const payload = verifyRefresh(refreshToken);
      revokeToken(payload.jti);
    } catch {
      // ignore invalid refresh token on logout
    }
  }
  res.json({});
});

router.post("/forgot-password", async (req: Request, res: Response, next: NextFunction) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "E-mail inválido." });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const resetToken = signAccess(user.id);
      const link = `${env.FRONTEND_URL ?? "https://fitup.app"}/reset-password?token=${resetToken}`;
      await sendPasswordReset(user.email, link);
    }
    res.json({ message: "E-mail enviado com sucesso." });
  } catch (err) {
    next(err);
  }
});

export default router;
