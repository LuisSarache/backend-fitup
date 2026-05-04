import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { signRefresh } from "../lib/jwt";
import prisma from "../lib/prisma";

const BASE = "/auth";
const CREDENTIALS = { email: "joao@fitup.com", password: "senha123" };

async function register() {
  return request(app).post(`${BASE}/register`).send(CREDENTIALS);
}

async function login() {
  return request(app).post(`${BASE}/login`).send(CREDENTIALS);
}

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------
describe("POST /auth/register", () => {
  it("201 — cria usuário e retorna token + refreshToken", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
  });

  it("400 — sem password", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "joao@fitup.com" });
    expect(res.status).toBe(400);
  });

  it("400 — password curta demais", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "joao@fitup.com", password: "123" });
    expect(res.status).toBe(400);
  });

  it("400 — email inválido", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "nao-e-email", password: "senha123" });
    expect(res.status).toBe(400);
  });

  it("409 — email já cadastrado", async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/cadastrado/i);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
describe("POST /auth/login", () => {
  it("200 — credenciais corretas retorna token + refreshToken", async () => {
    await register();
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
  });

  it("400 — body vazio", async () => {
    const res = await request(app).post(`${BASE}/login`).send({});
    expect(res.status).toBe(400);
  });

  it("404 — usuário não existe", async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: "naoexiste@fitup.com", password: "senha123" });
    expect(res.status).toBe(404);
  });

  it("401 — senha incorreta", async () => {
    await register();
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: CREDENTIALS.email, password: "senhaerrada" });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------
describe("POST /auth/refresh", () => {
  it("200 — retorna novos tokens", async () => {
    const { body } = await register();
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body.refreshToken).not.toBe(body.refreshToken);
  });

  it("400 — sem refreshToken", async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({});
    expect(res.status).toBe(400);
  });

  it("401 — token inválido", async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: "token.invalido" });
    expect(res.status).toBe(401);
  });

  it("401 — token já usado (rotação)", async () => {
    const { body } = await register();
    await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: body.refreshToken });
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/logout
// ---------------------------------------------------------------------------
describe("POST /auth/logout", () => {
  it("200 — logout bem-sucedido", async () => {
    const { body } = await register();
    const res = await request(app)
      .post(`${BASE}/logout`)
      .set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  it("401 — token revogado após logout", async () => {
    const { body } = await register();
    await request(app)
      .post(`${BASE}/logout`)
      .set("Authorization", `Bearer ${body.token}`);
    const res = await request(app)
      .get("/streak")
      .set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(401);
  });

  it("401 — sem token", async () => {
    const res = await request(app).post(`${BASE}/logout`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/forgot-password
// ---------------------------------------------------------------------------
describe("POST /auth/forgot-password", () => {
  it("200 — email existente", async () => {
    await register();
    const res = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: CREDENTIALS.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/enviado/i);
  });

  it("200 — email inexistente (anti-enumeração)", async () => {
    const res = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: "naoexiste@fitup.com" });
    expect(res.status).toBe(200);
  });

  it("400 — email inválido", async () => {
    const res = await request(app)
      .post(`${BASE}/forgot-password`)
      .send({ email: "nao-e-email" });
    expect(res.status).toBe(400);
  });
});
