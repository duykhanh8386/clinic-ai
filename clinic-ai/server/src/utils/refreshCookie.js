export function setRefreshCookie(res, name, token, maxAgeMs) {
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // production => true (https)
    maxAge: maxAgeMs,
    path: "/",
  });
}

export function clearRefreshCookie(res, name) {
  res.clearCookie(name, { path: "/" });
}