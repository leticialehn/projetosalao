"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { IconCalendar, IconUser, IconChevronDown } from "@/components/icons";

export default function AgendaControles({
  data,
  modo,
  prof,
  profissionais,
}: {
  data: string;
  modo: string;
  prof: string;
  profissionais: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function set(patch: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) p.set(k, v);
    router.push(`/?${p.toString()}`);
  }

  function deslocar(dias: number) {
    const d = new Date(data + "T00:00:00");
    d.setDate(d.getDate() + dias);
    set({ data: d.toISOString().slice(0, 10) });
  }

  const passo = modo === "semana" ? 7 : 1;

  return (
    <div className="card toolbar">
      <div className="pill-group">
        <button className="ghost" onClick={() => deslocar(-passo)} aria-label="Anterior">
          ‹
        </button>
        <button
          className="ghost"
          onClick={() => set({ data: new Date().toISOString().slice(0, 10) })}
        >
          Hoje
        </button>
        <button className="ghost" onClick={() => deslocar(passo)} aria-label="Próximo">
          ›
        </button>
      </div>
      <div className="pill-group">
        <button
          className={modo === "dia" ? "" : "ghost"}
          onClick={() => set({ modo: "dia" })}
        >
          Dia
        </button>
        <button
          className={modo === "semana" ? "" : "ghost"}
          onClick={() => set({ modo: "semana" })}
        >
          Semana
        </button>
      </div>
      <div className="pill-field">
        <IconCalendar size={16} className="leading" />
        <input
          type="date"
          value={data}
          onChange={(e) => set({ data: e.target.value })}
        />
      </div>
      <div className="pill-field">
        <IconUser size={16} className="leading" />
        <select value={prof} onChange={(e) => set({ prof: e.target.value })}>
          <option value="todos">Todas as profissionais</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <IconChevronDown size={14} className="trailing" />
      </div>
    </div>
  );
}
