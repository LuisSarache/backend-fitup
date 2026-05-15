# FitUp — Backend

API REST do app FitUp, construída com Node.js, Express, Prisma e PostgreSQL.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express |
| Banco de dados | PostgreSQL (Render) |
| ORM | Prisma |
| Autenticação | JWT (access + refresh token) |
| Hash de senha | bcrypt (saltRounds: 12) |
| Validação | Zod |
| Hospedagem | Render |

---

## Configuração local

### 1. Clone e instale

```bash
git clone https://github.com/LuisSarache/backend-fitup
cd backend-fitup
npm install
```

### 2. Configure o `.env`

```bash
cp .env.example .env
```

Preencha as variáveis:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="minimo-32-caracteres"
JWT_REFRESH_SECRET="minimo-32-caracteres"
PORT=3000
ALLOWED_ORIGIN="*"
FRONTEND_URL="http://localhost:8081"
```

### 3. Rode as migrations

```bash
npx prisma db execute --file prisma/migrations/0001_init.sql --schema prisma/schema.prisma
npx prisma generate
```

### 4. Inicie o servidor

```bash
npm run dev
```

### 5. Rode os testes

Com o servidor rodando em outro terminal:

```bash
npm test
```

---

## Endpoints

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria conta |
| POST | `/auth/login` | Autentica usuário |
| POST | `/auth/refresh` | Renova tokens |
| POST | `/auth/logout` | Revoga tokens |
| POST | `/auth/forgot-password` | Envia e-mail de recuperação |

### Perfil
| Método | Rota | Descrição |
|---|---|---|
| GET | `/profile` | Retorna perfil do usuário |
| PUT | `/profile` | Cria ou atualiza perfil |

### Treinos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/workouts/history` | Lista histórico de treinos |
| POST | `/workouts/history` | Registra treino completado |

### Streak & Conquistas
| Método | Rota | Descrição |
|---|---|---|
| GET | `/streak` | Retorna sequência atual |
| GET | `/achievements` | Lista conquistas desbloqueadas |

---

## Banco de dados

Schema `fitup` dentro do banco PostgreSQL compartilhado na Render.

```
users
profiles
workout_history
streaks
achievements
```

---

## Segurança

- Senhas com bcrypt (saltRounds: 12)
- JWT access token (15min) + refresh token (7 dias)
- Rotação de refresh token a cada uso
- Blacklist de tokens revogados (in-memory)
- Rate limiting: 5 tentativas de login por IP em 15 minutos
- Helmet para headers de segurança
- CORS configurável via `ALLOWED_ORIGIN`
- Validação de inputs com Zod em todas as rotas
- Logs sanitizados (proteção contra log injection)
- SMTP com TLS obrigatório

---

## Scripts

```bash
npm run dev       # servidor em modo watch
npm run build     # compila TypeScript
npm start         # inicia build compilado
npm test          # smoke test (requer servidor rodando)
npm run db:generate  # gera Prisma Client
```
