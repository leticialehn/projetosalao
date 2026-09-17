"use server";

import { prisma } from "@/lib/prisma";
import { temConflito } from "@/lib/agenda";
import { exigirSessao, PAPEL_PROFISSIONAL, ERRO_SOMENTE_LEITURA } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

export type AgendamentoResult = { ok: boolean; erro?: string };

function revalidarAgenda() {
  revalidatePath("/agendamentos");
  revalidatePath("/");
  revalidatePath("/painel");
}

export async function criarAgendamento(
  _prev: AgendamentoResult,
  formData: FormData,
): Promise<AgendamentoResult> {
  const { papel } = await exigirSessao();
  if (papel === PAPEL_PROFISSIONAL) return { ok: false, erro: ERRO_SOMENTE_LEITURA };
  const clienteId = String(formData.get("clienteId") ?? "");
  const profissionalId = String(formData.get("profissionalId") ?? "");
  const servicoId = String(formData.get("servicoId") ?? "");
  const inicioRaw = String(formData.get("inicio") ?? "");
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  if (!clienteId || !profissionalId || !servicoId || !inicioRaw) {
    return { ok: false, erro: "Preencha todos os campos obrigatórios." };
  }

  const inicio = new Date(inicioRaw);
  if (Number.isNaN(inicio.getTime())) {
    return { ok: false, erro: "Data/hora inválida." };
  }

  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico) return { ok: false, erro: "Serviço não encontrado." };

  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
    include: { servicos: { select: { id: true } } },
  });
  if (!profissional) return { ok: false, erro: "Profissional não encontrado." };
  // Lista vazia = sem restrição configurada (retrocompatibilidade — Story 5.1, AC 2).
  if (
    profissional.servicos.length > 0 &&
    !profissional.servicos.some((s) => s.id === servicoId)
  ) {
    return { ok: false, erro: "Este profissional não atende esse serviço." };
  }

  const fim = new Date(inicio.getTime() + servico.duracaoMin * 60000);

  if (await temConflito(prisma, { profissionalId, inicio, fim })) {
    return { ok: false, erro: "O profissional já tem um agendamento nesse horário." };
  }

  await prisma.agendamento.create({
    data: { clienteId, profissionalId, servicoId, inicio, fim, observacoes },
  });
  revalidarAgenda();
  return { ok: true };
}

export async function remarcarAgendamento(
  _prev: AgendamentoResult,
  formData: FormData,
): Promise<AgendamentoResult> {
  const { papel } = await exigirSessao();
  if (papel === PAPEL_PROFISSIONAL) return { ok: false, erro: ERRO_SOMENTE_LEITURA };
  const id = String(formData.get("id") ?? "");
  const inicioRaw = String(formData.get("inicio") ?? "");
  const profissionalId = String(formData.get("profissionalId") ?? "");

  if (!id || !inicioRaw || !profissionalId) {
    return { ok: false, erro: "Preencha todos os campos obrigatórios." };
  }

  const inicio = new Date(inicioRaw);
  if (Number.isNaN(inicio.getTime())) {
    return { ok: false, erro: "Data/hora inválida." };
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: { servico: true },
  });
  if (!agendamento) return { ok: false, erro: "Agendamento não encontrado." };
  if (agendamento.status !== "AGENDADO") {
    return {
      ok: false,
      erro: "Só agendamentos em aberto podem ser remarcados.",
    };
  }

  const fim = new Date(inicio.getTime() + agendamento.servico.duracaoMin * 60000);

  if (
    await temConflito(prisma, { profissionalId, inicio, fim, ignorarId: id })
  ) {
    return { ok: false, erro: "O profissional já tem um agendamento nesse horário." };
  }

  await prisma.agendamento.update({
    where: { id },
    data: { inicio, fim, profissionalId },
  });
  revalidarAgenda();
  return { ok: true };
}

export async function mudarStatus(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel === PAPEL_PROFISSIONAL) return;
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  // CONCLUIDO é exclusivo da action concluirAtendimento (Story 1.4).
  if (!["AGENDADO", "CANCELADO", "FALTOU"].includes(status)) return;
  await prisma.agendamento.update({ where: { id }, data: { status } });
  revalidarAgenda();
}

export async function excluirAgendamento(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel === PAPEL_PROFISSIONAL) return;
  const id = String(formData.get("id"));
  await prisma.agendamento.delete({ where: { id } });
  revalidarAgenda();
}
