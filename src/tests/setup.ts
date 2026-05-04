import "dotenv/config";
import { beforeAll, beforeEach, afterAll } from "vitest";
import { Client } from "pg";

let db: Client;

beforeAll(async () => {
  db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
});

beforeEach(async () => {
  await db.query(`
    DELETE FROM fitup.achievements;
    DELETE FROM fitup.streaks;
    DELETE FROM fitup.workout_history;
    DELETE FROM fitup.profiles;
    DELETE FROM fitup.users;
  `);
});

afterAll(async () => {
  await db?.end();
});
