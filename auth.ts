import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { createHash, timingSafeEqual } from "crypto";
import { headers as nextHeaders } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";
import { clearFailures, clientIp, isLocked, recordFailure } from "@/lib/ratelimit";

/** Erro exibido quando o login está bloqueado por excesso de tentativas. */
class LockedError extends CredentialsSignin {
  code = "locked";
}

export const microsoftEnabled = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
);

// Compara pelo hash: tempo constante e sem revelar o tamanho da senha
function safeEqual(a: string, b: string) {
  const h = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(h(a), h(b));
}

const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

const providers: any[] = [
  Credentials({
    id: "credentials",
    name: "Administrador",
    credentials: { email: {}, password: {} },
    async authorize(creds, request) {
      const email = String(creds?.email || "").trim().toLowerCase();
      const password = String(creds?.password || "");
      const expected = process.env.ADMIN_PASSWORD || "";
      if (!adminEmail || !expected) return null;

      let reqHeaders: Headers | null = (request as Request | undefined)?.headers ?? null;
      if (!reqHeaders?.get("x-forwarded-for")) {
        try {
          reqHeaders = new Headers(await nextHeaders());
        } catch {
          /* fora de uma requisição */
        }
      }
      const ip = clientIp(reqHeaders);

      if (await isLocked(ip, email)) throw new LockedError();
      if (email !== adminEmail || !safeEqual(password, expected)) {
        await recordFailure(ip, email);
        await new Promise((r) => setTimeout(r, 400)); // atrasa tentativas automáticas
        return null;
      }
      await clearFailures(ip);
      return {
        id: adminEmail,
        email: adminEmail,
        name: process.env.ADMIN_NAME || "Administrador",
        role: "admin",
      } as any;
    },
  }),
];

if (microsoftEnabled) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
      // Perfil próprio: evita baixar a foto do Graph (deixa o cookie de sessão enorme)
      profile(profile: any) {
        return {
          id: profile.sub || profile.oid,
          name: profile.name,
          email: String(profile.email || profile.preferred_username || profile.upn || "").toLowerCase(),
          image: null,
        };
      },
    })
  );
}

async function lookupUser(email: string) {
  await ensureSchema();
  const rows = await sql`select email, name, role, active from app_users where email = ${email}`;
  return rows[0] as { email: string; name: string; role: string; active: boolean } | undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;
      const email = String(user?.email || "").toLowerCase();
      if (!email) return false;
      if (email === adminEmail) return true;
      const found = await lookupUser(email);
      if (found) return found.active;
      if (process.env.ALLOW_ALL_TENANT_USERS === "true") {
        await sql`insert into app_users (email, name, role) values (${email}, ${user?.name || ""}, 'coordenador')
                  on conflict (email) do nothing`;
        return true;
      }
      return false;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const email = String(user.email || "").toLowerCase();
        token.email = email;
        token.name = user.name;
        delete (token as any).picture;
        if (account?.provider === "credentials" || email === adminEmail) {
          token.role = "admin";
        } else {
          const found = await lookupUser(email);
          token.role = found?.role === "admin" ? "admin" : "coordenador";
          if (found && !found.name && user.name) {
            await sql`update app_users set name = ${user.name} where email = ${email}`;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = String(token.email || "");
        session.user.name = String(token.name || "");
        (session.user as any).role = token.role || "coordenador";
      }
      return session;
    },
  },
});
