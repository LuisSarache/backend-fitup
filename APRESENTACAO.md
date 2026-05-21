# FitUp — Documentação do Projeto

**Aluno:** Luis Sarache  
**Projeto:** FitUp — Aplicativo de Treinos  
**Repositório:** https://github.com/LuisSarache/backend-fitup

---

## O que é o FitUp?

FitUp é um aplicativo mobile de treinos desenvolvido com **React Native + Expo**. O projeto consiste em um frontend mobile e um backend REST API que foram integrados do zero.

---

## O que foi desenvolvido

### Backend completo em Node.js

Foi construída uma API REST do zero com as seguintes tecnologias:

- **Node.js + Express** — servidor HTTP
- **TypeScript** — tipagem estática em todo o código
- **Prisma ORM** — mapeamento objeto-relacional com PostgreSQL
- **PostgreSQL** — banco de dados relacional hospedado na Render
- **JWT** — autenticação stateless com access token e refresh token
- **bcrypt** — hash seguro de senhas
- **Zod** — validação de dados de entrada
- **Helmet + CORS** — segurança de headers HTTP

---

## Funcionalidades implementadas

### 1. Autenticação completa
- Cadastro de usuário com validação de e-mail e senha
- Login com verificação de credenciais
- Sistema de **access token** (15 minutos) + **refresh token** (7 dias)
- **Rotação de refresh token** — cada token só pode ser usado uma vez
- **Blacklist de tokens** — logout invalida o token imediatamente
- Recuperação de senha por e-mail
- Rate limiting no login: máximo 5 tentativas por IP em 15 minutos

### 2. Perfil do usuário
- Criação e atualização de perfil (nome, peso, altura, nível)
- Upsert inteligente — cria se não existe, atualiza se já existe

### 3. Histórico de treinos
- Registro de treinos completados com data, duração e exercícios
- Listagem em ordem cronológica

### 4. Sistema de Streak (sequência)
- Cálculo automático de dias consecutivos de treino
- Preservação do melhor streak histórico
- Reset automático quando há gap de mais de 1 dia
- Treinos no mesmo dia não duplicam o streak

### 5. Conquistas (Achievements)
- Desbloqueio automático ao atingir metas de streak
- 5 conquistas disponíveis: 3, 7, 14, 30 e 100 dias consecutivos
- Sem duplicação — cada conquista é desbloqueada apenas uma vez

---

## Arquitetura do projeto

```
src/
├── lib/
│   ├── env.ts          # validação de variáveis de ambiente
│   ├── jwt.ts          # geração e verificação de tokens
│   ├── mailer.ts       # envio de e-mails
│   ├── prisma.ts       # cliente do banco de dados
│   └── tokenBlacklist.ts  # controle de tokens revogados
├── middlewares/
│   ├── auth.ts         # proteção de rotas autenticadas
│   └── errorHandler.ts # tratamento global de erros
├── routes/
│   ├── auth.ts         # /auth/*
│   ├── profile.ts      # /profile
│   ├── workouts.ts     # /workouts/history
│   ├── streak.ts       # /streak
│   └── achievements.ts # /achievements
├── app.ts              # configuração do Express
└── index.ts            # entry point
```

---

## Banco de dados

O banco foi modelado com 5 tabelas dentro de um schema isolado (`fitup`) num PostgreSQL compartilhado na Render:

| Tabela | Descrição |
|---|---|
| `users` | Credenciais de acesso |
| `profiles` | Dados pessoais do usuário |
| `workout_history` | Treinos completados |
| `streaks` | Sequência atual e melhor sequência |
| `achievements` | Conquistas desbloqueadas |

---

## Segurança implementada

| Medida | Implementação |
|---|---|
| Hash de senha | bcrypt com 12 salt rounds |
| Tokens JWT | Access (15min) + Refresh (7 dias) com rotação |
| Revogação de token | Blacklist in-memory com jti único por token |
| Rate limiting | 5 tentativas de login por IP em 15 minutos |
| Headers HTTP | Helmet (X-Frame-Options, CSP, etc.) |
| Validação de inputs | Zod em todas as rotas |
| Proteção de logs | Sanitização contra log injection |
| SMTP | TLS obrigatório |
| Variáveis de ambiente | Validação no boot com Zod (falha rápida) |

---

## Testes

Foi desenvolvido um **smoke test** automatizado (`smoke-test.js`) que testa todos os 46 cenários dos endpoints:

```
── AUTH ──────────────────────────────────────────
  ✅ POST /auth/register 201
  ✅ POST /auth/register 409 (email duplicado)
  ✅ POST /auth/register 400 (dados inválidos)
  ✅ POST /auth/login 200
  ✅ POST /auth/login 401 (senha errada)
  ✅ POST /auth/login 404 (usuário não encontrado)
  ✅ POST /auth/refresh 200
  ✅ POST /auth/refresh 401 (token já usado)
  ✅ POST /auth/forgot-password 200
  ...

  Total: 46 | ✅ 46 passou | ❌ 0 falhou
```

---

## Deploy

O backend está hospedado na **Render** com deploy automático a cada push no GitHub:

- Build: `tsc` (compilação TypeScript)
- Start: `node dist/index.js`
- Banco: PostgreSQL na Render (schema isolado)

---

## Integração com o Frontend

O app Expo se conecta ao backend via variáveis de ambiente:

```env
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_URL=https://backend-fitup.onrender.com
```

Todas as requisições autenticadas enviam o token JWT no header:
```
Authorization: Bearer <token>
```
