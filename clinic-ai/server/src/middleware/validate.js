function buildValidator(source, schema, sourceLabel) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid request ${sourceLabel}`,
          details: parsed.error.flatten(),
        },
      });
    }

    if (source === "body") {
      req.body = parsed.data;
    } else if (source === "params") {
      req.params = parsed.data;
    } else if (source === "query") {
      req.validatedQuery = parsed.data;
    }

    next();
  };
}

export function validateBody(schema) {
  return buildValidator("body", schema, "body");
}

export function validateQuery(schema) {
  return buildValidator("query", schema, "query");
}

export function validateParams(schema) {
  return buildValidator("params", schema, "params");
}