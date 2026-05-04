import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authenticate);

const ACHIEVEMENT_META: Record<string, { label: string; emoji: string; requiredStreak: number }> = {
  streak_3:   { label: "Três Dias Seguidos", emoji: "💪", requiredStreak: 3 },
  streak_7:   { label: "Uma Semana Forte",   emoji: "🔥", requiredStreak: 7 },
  streak_14:  { label: "Duas Semanas",        emoji: "⚡", requiredStreak: 14 },
  streak_30:  { label: "Um Mês Dedicado",     emoji: "🏆", requiredStreak: 30 },
  streak_100: { label: "Cem Dias",            emoji: "💎", requiredStreak: 100 },
};

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).userId;
  try {
    const rows = await prisma.achievement.findMany({ where: { userId } });
    res.json(
      rows.map((a) => ({
        id: a.achievementId,
        ...ACHIEVEMENT_META[a.achievementId],
        unlockedAt: a.unlockedAt.toISOString(),
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
