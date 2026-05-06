import { createApp } from "./src/app.js";
import { env } from "./src/config/env.js";
import { prisma } from "./src/config/prisma.js";
import { startScheduler } from "./src/services/scheduler.js";

const app = createApp();

app.listen(env.port, async () => {
  try {
    await prisma.$connect();
    console.log(`✅ API running on http://localhost:${env.port}`);
    console.log(`✅ Swagger: http://localhost:${env.port}/api-docs`);
    startScheduler();
  } catch (e) {
    console.error("❌ Prisma connect failed", e);
  }
});