import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authenticate);

const ACHIEVEMENTS: { id: string; requiredStreak: number }[] = [
  { id: "streak_3", requiredStreak: 3 },
  { id: "streak_7", requiredStreak: 7 },
  { id: "streak_14", requiredStreak: 14 },
  { id: "streak_30", requiredStreak: 30 },
  { id: "streak_100", requiredStreak: 100 },
];

async function updateStreakAndAchievements(userId: string, completedAt: Date) {
  const streak = await prisma.streak.findUnique({ where: { userId } });

  const lastDate = streak?.lastWorkoutDate;
  const today = new Date(completedAt);
  today.setHours(0, 0, 0, 0);

  let current = streak?.current ?? 0;

  if (lastDate) {
    const last = new Date(lastDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86_400_000);

    if (diffDays === 0) return; // same day, no streak change
    if (diffDays === 1) current += 1;
    else current = 1; // streak broken
  } else {
    current = 1;
  }

  const best = Math.max(current, streak?.best ?? 0);

  await prisma.streak.upsert({
    where: { userId },
    update: { current, best, lastWorkoutDate: completedAt },
    create: { userId, current, best, lastWorkoutDate: completedAt },
  });

  const toUnlock = ACHIEVEMENTS.filter((a) => current >= a.requiredStreak).map((a) => a.id);
  if (toUnlock.length === 0) return;

  const existing = await prisma.achievement.findMany({
    where: { userId, achievementId: { in: toUnlock } },
    select: { achievementId: true },
  });
  const existingIds = new Set(existing.map((e) => e.achievementId));
  const newOnes = toUnlock.filter((id) => !existingIds.has(id));

  if (newOnes.length > 0) {
    await prisma.achievement.createMany({
      data: newOnes.map((achievementId) => ({ userId, achievementId })),
      skipDuplicates: true,
    });
  }
}

const workoutSchema = z.object({
  workoutKey: z.string().min(1),
  workoutLabel: z.string().min(1),
  completedAt: z.string().datetime(),
  durationSeconds: z.number().int().positive(),
  exercisesTotal: z.number().int().positive(),
});

router.get("/history", async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).userId;
  try {
    const history = await prisma.workoutHistory.findMany({
      where: { userId },
      orderBy: { completedAt: "asc" },
    });
    res.json(
      history.map((w) => ({
        id: w.id,
        workoutKey: w.workoutKey,
        workoutLabel: w.workoutLabel,
        completedAt: w.completedAt.toISOString(),
        durationSeconds: w.durationSeconds,
        exercisesTotal: w.exercisesTotal,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post("/history", async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).userId;
  const parsed = workoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dados inválidos. Verifique os campos." });
    return;
  }
  const completedAt = new Date(parsed.data.completedAt);
  try {
    const w = await prisma.workoutHistory.create({
      data: { userId, ...parsed.data, completedAt },
    });
    await updateStreakAndAchievements(userId, completedAt);
    res.status(201).json({
      id: w.id,
      workoutKey: w.workoutKey,
      workoutLabel: w.workoutLabel,
      completedAt: w.completedAt.toISOString(),
      durationSeconds: w.durationSeconds,
      exercisesTotal: w.exercisesTotal,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
