// smoke-test.js — rode com: node smoke-test.js
// Certifique-se que o servidor está rodando: npm run dev

const BASE = "http://localhost:3000";
const EMAIL = `test_${Date.now()}@fitup.com`;
const PASSWORD = "senha123";

let token = "";
let refreshToken = "";
let passed = 0;
let failed = 0;

async function req(method, path, body, auth) {
  const headers = { "Content-Type": "application/json" };
  if (auth) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, condition, info = "") {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${info ? " — " + info : ""}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🔥 FitUp Smoke Test — ${BASE}\n`);

  // -------------------------------------------------------------------------
  console.log("── AUTH ──────────────────────────────────────────");

  // register
  let r = await req("POST", "/auth/register", { email: EMAIL, password: PASSWORD });
  check("POST /auth/register 201", r.status === 201);
  check("register retorna token", !!r.data.token);
  check("register retorna refreshToken", !!r.data.refreshToken);
  token = r.data.token;
  refreshToken = r.data.refreshToken;

  // register duplicado
  r = await req("POST", "/auth/register", { email: EMAIL, password: PASSWORD });
  check("POST /auth/register 409 (email duplicado)", r.status === 409);

  // register inválido
  r = await req("POST", "/auth/register", { email: "nao-e-email", password: "123" });
  check("POST /auth/register 400 (dados inválidos)", r.status === 400);

  // login
  r = await req("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
  check("POST /auth/login 200", r.status === 200);
  check("login retorna token", !!r.data.token);
  token = r.data.token;
  refreshToken = r.data.refreshToken;

  // login senha errada
  r = await req("POST", "/auth/login", { email: EMAIL, password: "errada" });
  check("POST /auth/login 401 (senha errada)", r.status === 401);

  // login usuário inexistente — email único para evitar rate limit
  r = await req("POST", "/auth/login", { email: `noexist_${Date.now()}@fitup.com`, password: PASSWORD });
  check("POST /auth/login 404 (usuário não encontrado)", r.status === 404);

  // refresh
  r = await req("POST", "/auth/refresh", { refreshToken });
  check("POST /auth/refresh 200", r.status === 200);
  check("refresh retorna novo token", !!r.data.token);
  check("refresh retorna novo refreshToken", !!r.data.refreshToken);
  const oldRefresh = refreshToken;
  token = r.data.token;
  refreshToken = r.data.refreshToken;

  // refresh token já usado (rotação) — só válido se servidor não reiniciou
  r = await req("POST", "/auth/refresh", { refreshToken: oldRefresh });
  check("POST /auth/refresh 401 (token já usado)", r.status === 401, `status: ${r.status} — requer servidor sem reinício`);

  // forgot-password (email existente)
  r = await req("POST", "/auth/forgot-password", { email: EMAIL });
  check("POST /auth/forgot-password 200 (email existente)", r.status === 200);

  // forgot-password (email inexistente — anti-enumeração)
  r = await req("POST", "/auth/forgot-password", { email: "nao@existe.com" });
  check("POST /auth/forgot-password 200 (email inexistente)", r.status === 200);

  // -------------------------------------------------------------------------
  console.log("\n── PROFILE ───────────────────────────────────────");

  // get profile (ainda não existe)
  r = await req("GET", "/profile", null, true);
  check("GET /profile 404 (sem perfil)", r.status === 404);

  // put profile (cria)
  r = await req("PUT", "/profile", { name: "Teste FitUp", weightKg: 75, heightCm: 175, level: "Beginner" }, true);
  check("PUT /profile 200 (cria)", r.status === 200);
  check("perfil retorna name", r.data.name === "Teste FitUp");
  check("perfil retorna email", r.data.email === EMAIL);
  check("perfil retorna weightKg", r.data.weightKg === 75);
  check("perfil retorna level", r.data.level === "Beginner");

  // get profile (agora existe)
  r = await req("GET", "/profile", null, true);
  check("GET /profile 200", r.status === 200);
  check("GET /profile retorna dados corretos", r.data.name === "Teste FitUp");

  // put profile (atualiza)
  r = await req("PUT", "/profile", { name: "Atualizado", level: "Advanced" }, true);
  check("PUT /profile 200 (atualiza)", r.status === 200);
  check("perfil atualizado corretamente", r.data.name === "Atualizado" && r.data.level === "Advanced");

  // put profile inválido
  r = await req("PUT", "/profile", { level: "Deus" }, true);
  check("PUT /profile 400 (level inválido)", r.status === 400);

  // sem token
  r = await req("GET", "/profile");
  check("GET /profile 401 (sem token)", r.status === 401);

  // -------------------------------------------------------------------------
  console.log("\n── WORKOUTS ──────────────────────────────────────");

  // histórico vazio
  r = await req("GET", "/workouts/history", null, true);
  check("GET /workouts/history 200 (vazio)", r.status === 200 && Array.isArray(r.data) && r.data.length === 0);

  // salva treino dia 1
  r = await req("POST", "/workouts/history", {
    workoutKey: "IntA", workoutLabel: "Treino A",
    completedAt: "2025-01-13T10:00:00.000Z", durationSeconds: 1800, exercisesTotal: 5,
  }, true);
  check("POST /workouts/history 201 (dia 1)", r.status === 201);
  check("treino retorna id", !!r.data.id);

  // salva treino dia 2
  r = await req("POST", "/workouts/history", {
    workoutKey: "IntB", workoutLabel: "Treino B",
    completedAt: "2025-01-14T10:00:00.000Z", durationSeconds: 2100, exercisesTotal: 6,
  }, true);
  check("POST /workouts/history 201 (dia 2)", r.status === 201);

  // salva treino dia 3
  r = await req("POST", "/workouts/history", {
    workoutKey: "IntA", workoutLabel: "Treino A",
    completedAt: "2025-01-15T10:00:00.000Z", durationSeconds: 1900, exercisesTotal: 5,
  }, true);
  check("POST /workouts/history 201 (dia 3)", r.status === 201);

  // histórico com 3 treinos
  r = await req("GET", "/workouts/history", null, true);
  check("GET /workouts/history retorna 3 treinos", r.status === 200 && r.data.length === 3);
  check("treinos em ordem crescente", r.data[0].completedAt < r.data[2].completedAt);

  // body inválido
  r = await req("POST", "/workouts/history", { workoutLabel: "Sem key" }, true);
  check("POST /workouts/history 400 (body inválido)", r.status === 400);

  // -------------------------------------------------------------------------
  console.log("\n── STREAK ────────────────────────────────────────");

  r = await req("GET", "/streak", null, true);
  check("GET /streak 200", r.status === 200);
  check("streak current = 3", r.data.current === 3);
  check("streak best = 3", r.data.best === 3);
  check("streak tem lastWorkoutDate", !!r.data.lastWorkoutDate);

  r = await req("GET", "/streak");
  check("GET /streak 401 (sem token)", r.status === 401);

  // -------------------------------------------------------------------------
  console.log("\n── ACHIEVEMENTS ──────────────────────────────────");

  r = await req("GET", "/achievements", null, true);
  check("GET /achievements 200", r.status === 200);
  check("achievement streak_3 desbloqueado", r.data.some(a => a.id === "streak_3"));
  check("achievement tem label e emoji", r.data[0]?.label && r.data[0]?.emoji);

  r = await req("GET", "/achievements");
  check("GET /achievements 401 (sem token)", r.status === 401);

  // -------------------------------------------------------------------------
  console.log("\n── LOGOUT ────────────────────────────────────────");

  r = await req("POST", "/auth/logout", { refreshToken }, true);
  check("POST /auth/logout 200", r.status === 200);

  // token revogado após logout
  r = await req("GET", "/streak", null, true);
  check("token inválido após logout (401)", r.status === 401);

  // -------------------------------------------------------------------------
  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Total: ${passed + failed} | ✅ ${passed} passou | ❌ ${failed} falhou`);
  console.log(`${"─".repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error("Erro inesperado:", err.message);
  process.exit(1);
});
