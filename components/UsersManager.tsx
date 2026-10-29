"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteUser, saveUser, setUserActive } from "@/lib/actions";
import type { AppUser, Role } from "@/lib/types";
import { Button, Card, inputCls } from "./ui";

export function UsersManager({ users }: { users: AppUser[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("coordenador");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError((r as any).error);
      setError("");
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => saveUser(email, name, role), () => {
              setEmail("");
              setName("");
            });
          }}
          className="grid gap-2 sm:grid-cols-[1.3fr_1fr_160px_auto]"
        >
          <input className={inputCls} type="email" required placeholder="email@abix.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputCls} placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="coordenador">Coordenador</option>
            <option value="admin">Administrador</option>
          </select>
          <Button disabled={pending}>Autorizar</Button>
        </form>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Usuário</th>
              <th className="px-4 py-2.5 font-medium">Perfil</th>
              <th className="px-4 py-2.5 font-medium">Situação</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma conta autorizada ainda.</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.email} className={u.active ? "" : "opacity-60"}>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-900">{u.name || "—"}</div>
                  <div className="text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1"
                    value={u.role}
                    onChange={(e) => act(() => saveUser(u.email, u.name, e.target.value as Role))}
                  >
                    <option value="coordenador">Coordenador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.active ? "Ativo" : "Bloqueado"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button className="px-2 py-1 rounded hover:bg-slate-100 text-xs" onClick={() => act(() => setUserActive(u.email, !u.active))}>
                    {u.active ? "Bloquear" : "Reativar"}
                  </button>
                  <button
                    className="px-2 py-1 rounded hover:bg-red-50 text-red-600 text-xs"
                    onClick={() => confirm(`Remover ${u.email}?`) && act(() => deleteUser(u.email))}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-slate-500">
        Mudanças de perfil valem a partir do próximo login do usuário.
      </p>
    </div>
  );
}
