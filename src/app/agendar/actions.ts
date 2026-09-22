"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { temConflito } from "@/lib/agenda";
import {
  segundosDeEspera,
  registrarFalha,
  limparTentativas,
} from "@/lib/rate-limit";

export type AgendarPublicoResult = { ok: boolean; erro?: string };

async function ipDoCliente(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function criarAgendamentoPublico(
  _prev: AgendarPublicoResult,
  formData: FormData,
): Promise<AgendarPublicoResult> {
  const ip = await ipDoCliente();
  const espera = segundosDeEspera(ip);
  if (espera > 0) {
    const min = Math.ceil(espera / 60);
    return {
      ok: false,
      erro: `Muitas tentativas. Tente novamente em ${min} min.`,
    };
  }

  const servicoId = String(formData.get("servicoId") ?? "");
  const profissionalId = String(formData.get("profissionalId") ?? "");
  const inicioRaw = String(formData.get("inicio") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!servicoId || !profissionalId || !inicioRaw || !nome) {
    registrarFalha(ip);
    return { ok: false, erro: "Preencha todos os campos obrigatórios." };
  }

  const inicio = new Date(inicioRaw);
  if (Number.isNaN(inicio.getTime())) {
    registrarFalha(ip);
    return { ok: false, erro: "Horário inválido." };
  }

  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico || !servico.ativo) {
    registrarFalha(ip);
    return { ok: false, erro: "Serviço não encontrado." };
  }

  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
    include: { servicos: { select: { id: true } } },
  });
  if (!profissional || !profissional.ativo) {
    registrarFalha(ip);
    return { ok: false, erro: "Profissional não encontrado." };
  }
  // Lista vazia = sem restrição configurada (retrocompatibilidade — Story 5.1, AC 2).
  if (
    profissional.servicos.length > 0 &&
    !profissional.servicos.some((s) => s.id === servicoId)
  ) {
    registrarFalha(ip);
    return { ok: false, erro: "Este profissional não atende esse serviço." };
  }

  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60000);

  // Revalida o conflito no momento da gravação — o horário pode ter sido
  // ocupado por outra pessoa entre a listagem e esta confirmação.
  if (await temConflito(prisma, { profissionalId, inicio, fim })) {
    registrarFalha(ip);
    return {
      ok: false,
      erro: "Esse horário acabou de ser ocupado. Escolha outro horário.",
    };
  }

  let cliente = telefone
    ? await prisma.cliente.findFirst({ where: { telefone } })
    : null;
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: { nome, telefone: telefone || null, email: email || null },
    });
  }

  await prisma.agendamento.create({
    data: {
      clienteId: cliente.id,
      profissionalId,
      servicoId,
      inicio,
      fim,
      status: "AGENDADO",
    },
  });

  limparTentativas(ip);
  revalidatePath("/agendamentos");
  revalidatePath("/");
  revalidatePath("/painel");
  return { ok: true };
}
