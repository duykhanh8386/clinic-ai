import jwt from "jsonwebtoken";

export function signAccessToken({ userId, role }, secret, expiresIn) {
  return jwt.sign({ role }, secret, { subject: userId, expiresIn });
}

export function signRefreshToken({ userId }, secret, expiresIn) {
  // refresh JWT chỉ cần sub=userId
  return jwt.sign({}, secret, { subject: userId, expiresIn });
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret); // trả payload có sub
}