import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

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
// GET /streak
// ---------------------------------------------------------------------------
describe("GET /streak", () => {
  it("200 — retorna zeros antes de qualquer treino", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get("/streak")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ current: 0, best: 0, lastWorkoutDate: null });
  });

  it("200 — retorna streak atualizado após treino", async () => {
    const token = await registerAndGetToken();
    await request(app)
      .post("/workouts/history")
      .set("Authorization", `Bearer ${token}`)
      .send(WORKOUT);

    const res = await request(app)
      .get("/streak")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.current).toBe(1);
    expect(res.body.best).toBe(1);
    expect(res.body.lastWorkoutDate).toBe(WORKOUT.completedAt);
  });

  it("401 — sem token", async () => {
    const res = await request(app).get("/streak");
    expect(res.status).toBe(401);
  });

  it("401 — token inválido", async () => {
    const res = await request(app)
      .get("/streak")
      .set("Authorization", "Bearer token.invalido");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /achievements
// ---------------------------------------------------------------------------
describe("GET /achievements", () => {
  it("200 — retorna lista vazia sem conquistas", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get("/achievements")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("200 — retorna conquista desbloqueada com metadata correta", async () => {
    const token = await registerAndGetToken();

    for (let day = 13; day <= 15; day++) {
      await request(app)
        .post("/workouts/history")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...WORKOUT, completedAt: `2025-01-${day}T10:00:00.000Z` });
    }

    const res = await request(app)
      .get("/achievements")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "streak_3",
      label: "Três Dias Seguidos",
      emoji: "💪",
      requiredStreak: 3,
    });
    expect(res.body[0]).toHaveProperty("unlockedAt");
  });

  it("401 — sem token", async () => {
    const res = await request(app).get("/achievements");
    expect(res.status).toBe(401);
  });
});
