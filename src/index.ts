import "dotenv/config";
import app from "./app";
import { env } from "./lib/env";

const PORT = env.PORT ?? "3000";
app.listen(Number(PORT), () => console.log(`FitUp API running on port ${PORT}`));
