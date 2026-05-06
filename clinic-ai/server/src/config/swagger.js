import swaggerJSDoc from "swagger-jsdoc";

export function buildSwaggerSpec() {
  return swaggerJSDoc({
    definition: {
      openapi: "3.0.0",
      info: { title: "Clinic Booking API", version: "1.0.0" },
      servers: [{ url: "http://localhost:4000/api/v1" }],
    },
    apis: ["./src/routes/*.js"],
  });
}