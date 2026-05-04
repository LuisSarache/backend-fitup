import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../lib/prisma";

const CREDENTIALS = { email: "joao@fitup.com", password: "senha123" };

async function registerAndGetToken() {
  const res = await request(app).post("/auth/register").send(CREDENTIALS);
  return res.body.token as string;
}

const WORKOUT = {
  workoutKey: "IntA",
  workoutLabel: "Treino A",
  completedAt: "2025-01-15T18:30:00.000Z",
  durationSeconds: 1820,
  exercisesTotal: 5,
};

// ---------------------------------------------------------------------------
// GET /workouts/history
// ---------------------------------------------------------------------------
describe("GET /workouts/history", () => {
  it("200 — retorna lista vazia inicialmente", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get("/workouts/history")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("200 — retorna treinos salvos", async () => {
    const token = await registerAndGetToken();
    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send(WORKOUT);

    const res = await request(app)
      .get("/workouts/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      workoutKey: "IntA",
      workoutLabel: "Treino A",
      durationSeconds: 1820,
    });
  });

  it("401 — sem token", async () => {
    const res = await request(app).get("/workouts/history");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /workouts/history
// ---------------------------------------------------------------------------
describe("POST /workouts/history", () => {
  it("201 — salva treino e retorna dados", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send(WORKOUT);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      workoutKey: "IntA",
      durationSeconds: 1820,
    });
    expect(res.body).toHaveProperty("id");
  });

  it("201 — cria streak inicial (current=1, best=1)", async () => {
    const token = await registerAndGetToken();
    const user = await prisma.user.findUnique({ where: { email: CREDENTIALS.email } });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send(WORKOUT);

    const streak = await prisma.streak.findUnique({ where: { userId: user!.id } });
    expect(streak).toMatchObject({ current: 1, best: 1 });
  });

  it("201 — incrementa streak quando treino é dia seguinte", async () => {
    const token = await registerAndGetToken();
    const user = await prisma.user.findUnique({ where: { email: CREDENTIALS.email } });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-14T10:00:00.000Z" });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-15T18:30:00.000Z" });

    const streak = await prisma.streak.findUnique({ where: { userId: user!.id } });
    expect(streak).toMatchObject({ current: 2, best: 2 });
  });

  it("201 — reseta streak quando há gap", async () => {
    const token = await registerAndGetToken();
    const user = await prisma.user.findUnique({ where: { email: CREDENTIALS.email } });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-10T10:00:00.000Z" });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-15T18:30:00.000Z" });

    const streak = await prisma.streak.findUnique({ where: { userId: user!.id } });
    expect(streak?.current).toBe(1);
    expect(streak?.best).toBe(1);
  });

  it("201 — não altera streak se treino é no mesmo dia", async () => {
    const token = await registerAndGetToken();
    const user = await prisma.user.findUnique({ where: { email: CREDENTIALS.email } });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-15T08:00:00.000Z" });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-15T18:30:00.000Z" });

    const streak = await prisma.streak.findUnique({ where: { userId: user!.id } });
    expect(streak?.current).toBe(1);
  });

  it("201 — desbloqueia achievement streak_3 ao atingir 3 dias", async () => {
    const token = await registerAndGetToken();
    const user = await prisma.user.findUnique({ where: { email: CREDENTIALS.email } });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-13T10:00:00.000Z" });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-14T10:00:00.000Z" });

    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "2025-01-15T10:00:00.000Z" });

    const achievements = await prisma.achievement.findMany({ where: { userId: user!.id } });
    expect(achievements.some((a) => a.achievementId === "streak_3")).toBe(true);
  });

  it("400 — sem workoutKey", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ workoutLabel: "Treino A", completedAt: "2025-01-15T18:30:00.000Z" });
    expect(res.status).toBe(400);
  });

  it("400 — completedAt inválido", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...WORKOUT, completedAt: "15/01/2025" });
    expect(res.status).toBe(400);
  });

  it("401 — sem token", async () => {
    const res = await request(app).post("/workouts/history").send(WORKOUT);
    expect(res.status).toBe(401);
  });
});
