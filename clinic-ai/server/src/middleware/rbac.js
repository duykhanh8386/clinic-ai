export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing auth context" },
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient role" },
      });
    }

    next();
  };
}