import { ensureSchema, sql } from "./db";

// Proteção contra tentativas repetidas no login do administrador.
const MAX_PER_IP = 5; // falhas por IP dentro da janela
const MAX_PER_ACCOUNT = 20; // falhas na conta (de qualquer IP) dentro da janela
const WINDOW_MIN = 15;
const LOCK_MIN = 15;

export function clientIp(headers: Headers | undefined | null): string {
  const h = headers;
  const fwd = h?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h?.get("x-real-ip") || "desconhecido";
}

const keys = (ip: string, email: string) => [`ip:${ip}`, `conta:${email.toLowerCase()}`];

/** Retorna true se o login estiver temporariamente bloqueado. */
export async function isLocked(ip: string, email: string): Promise<boolean> {
  await ensureSchema();
  const rows = await sql`select 1 from login_attempts where key = any(${keys(ip, email)}) and locked_until > now()`;
  return rows.length > 0;
}

export async function recordFailure(ip: string, email: string) {
  await ensureSchema();
  const [ipKey, accKey] = keys(ip, email);
  for (const [key, max] of [[ipKey, MAX_PER_IP], [accKey, MAX_PER_ACCOUNT]] as const) {
    await sql`insert into login_attempts (key, failures, window_start) values (${key}, 1, now())
      on conflict (key) do update set
        failures = case when login_attempts.window_start < now() - make_interval(mins => ${WINDOW_MIN})
                        then 1 else login_attempts.failures + 1 end,
        window_start = case when login_attempts.window_start < now() - make_interval(mins => ${WINDOW_MIN})
                        then now() else login_attempts.window_start end`;
    await sql`update login_attempts set locked_until = now() + make_interval(mins => ${LOCK_MIN}), failures = 0, window_start = now()
      where key = ${key} and failures >= ${max}`;
  }
}

export async function clearFailures(ip: string) {
  await ensureSchema();
  await sql`delete from login_attempts where key = ${`ip:${ip}`}`;
}
