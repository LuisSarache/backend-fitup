import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authenticate);

function formatProfile(p: {
  name: string;
  weightKg: unknown;
  heightCm: number | null;
  dateOfBirth: Date | null;
  sex: string | null;
  level: string;
  user: { email: string };
}) {
  return {
    name: p.name,
    email: p.user.email,
    weightKg: p.weightKg ? Number(p.weightKg) : null,
    heightCm: p.heightCm,
    dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
    sex: p.sex,
    level: p.level,
  };
}

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).userId;
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!profile) {
      res.status(404).json({ message: "Perfil não encontrado." });
      return;
    }
    res.json(formatProfile(profile));
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().int().positive().optional(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
});

router.put("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as AuthRequest).userId;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dados inválidos. Verifique os campos." });
    return;
  }
  const data = parsed.data;
  try {
    const existing = await prisma.profile.findUnique({ where: { userId } });
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        name: data.name ?? existing?.name ?? "",
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        level: data.level ?? "Beginner",
      },
      include: { user: { select: { email: true } } },
    });
    res.json(formatProfile(profile));
  } catch (err) {
    next(err);
  }
});

export default router;
