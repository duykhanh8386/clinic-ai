import pinoHttp from "pino-http";

export const httpLogger = pinoHttp({
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});