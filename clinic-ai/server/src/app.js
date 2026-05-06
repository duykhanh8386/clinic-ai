import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./config/logger.js";
import { buildSwaggerSpec } from "./config/swagger.js";
import { requestId } from "./middleware/requestId.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  // Swagger
  const spec = buildSwaggerSpec();
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));

  // API v1
  app.use("/api/v1", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}