import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

const CREDENTIALS = { email: "joao@fitup.com", password: "senha123" };

async function registerAndGetToken() {
  const res = await request(app).post("/auth/register").send(CREDENTIALS);
  return res.body.token as string;
}

// ---------------------------------------------------------------------------
// GET /profile
// ---------------------------------------------------------------------------
describe("GET /profile", () => {
  it("404 — perfil ainda não existe após registro", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("200 — retorna perfil após criação", async () => {
    const token = await registerAndGetToken();
    await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "João Silva", weightKg: 80.5, heightCm: 178, level: "Intermediate" });

    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: "João Silva",
      email: CREDENTIALS.email,
      weightKg: 80.5,
      heightCm: 178,
      level: "Intermediate",
    });
  });

  it("401 — sem token", async () => {
    const res = await request(app).get("/profile");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PUT /profile
// ---------------------------------------------------------------------------
describe("PUT /profile", () => {
  it("200 — cria perfil (upsert)", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "João Silva", weightKg: 80.5, heightCm: 178, level: "Beginner" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("João Silva");
    expect(res.body.weightKg).toBe(80.5);
  });

  it("200 — atualiza perfil existente", async () => {
    const token = await registerAndGetToken();
    await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "João Silva", level: "Beginner" });

    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "João Atualizado", level: "Advanced" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("João Atualizado");
    expect(res.body.level).toBe("Advanced");
  });

  it("400 — level inválido", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ level: "Expert" });
    expect(res.status).toBe(400);
  });

  it("400 — weightKg negativo", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ weightKg: -10 });
    expect(res.status).toBe(400);
  });

  it("400 — name vazio", async () => {
    const token = await registerAndGetToken();
    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("401 — sem token", async () => {
    const res = await request(app).put("/profile").send({ name: "Teste" });
    expect(res.status).toBe(401);
  });
});
