import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).userId;
  try {
    const streak = await prisma.streak.findUnique({ where: { userId } });
    res.json({
      current: streak?.current ?? 0,
      best: streak?.best ?? 0,
      lastWorkoutDate: streak?.lastWorkoutDate?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
