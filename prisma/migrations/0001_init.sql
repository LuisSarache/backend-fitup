-- Cria o schema fitup se não existir
CREATE SCHEMA IF NOT EXISTS fitup;

-- CreateTable
CREATE TABLE IF NOT EXISTS fitup."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS fitup."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "height_cm" INTEGER,
    "date_of_birth" TIMESTAMP(3),
    "sex" TEXT,
    "level" TEXT NOT NULL DEFAULT 'Beginner',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS fitup."workout_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workout_key" TEXT NOT NULL,
    "workout_label" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "exercises_total" INTEGER NOT NULL,

    CONSTRAINT "workout_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS fitup."streaks" (
    "user_id" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "last_workout_date" TIMESTAMP(3),

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS fitup."achievements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON fitup."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_user_id_key" ON fitup."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_user_id_achievement_id_key" ON fitup."achievements"("user_id", "achievement_id");

-- AddForeignKey (ignora se já existe)
DO $$ BEGIN
  ALTER TABLE fitup."profiles" ADD CONSTRAINT "profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES fitup."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE fitup."workout_history" ADD CONSTRAINT "workout_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES fitup."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE fitup."streaks" ADD CONSTRAINT "streaks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES fitup."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE fitup."achievements" ADD CONSTRAINT "achievements_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES fitup."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
