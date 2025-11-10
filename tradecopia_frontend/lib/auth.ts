const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "tradecopia_session";
const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? "admin@tradecopia.local";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD ?? "admin123";
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? `${LOGIN_EMAIL}:${LOGIN_PASSWORD}`;

export { AUTH_COOKIE_NAME, AUTH_TOKEN, LOGIN_EMAIL, LOGIN_PASSWORD };

export function credentialsMatch(email: string, password: string): boolean {
  return email === LOGIN_EMAIL && password === LOGIN_PASSWORD;
}

export function isAuthorizedToken(value: string | undefined | null): boolean {
  return Boolean(value) && value === AUTH_TOKEN;
}
