import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { timingSafeEqual } from "crypto";
import { ensureSchema, sql } from "@/lib/db";

export const microsoftEnabled = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
);

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

const providers: any[] = [
  Credentials({
    id: "credentials",
    name: "Administrador",
    credentials: { email: {}, password: {} },
    async authorize(creds) {
      const email = String(creds?.email || "").trim().toLowerCase();
      const password = String(creds?.password || "");
      const expected = process.env.ADMIN_PASSWORD || "";
      if (!adminEmail || !expected) return null;
      if (email !== adminEmail || !safeEqual(password, expected)) return null;
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
