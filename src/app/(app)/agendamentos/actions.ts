"use server";

import { prisma } from "@/lib/prisma";
import { temConflito } from "@/lib/agenda";
import { exigirSessao } from "@/lib/sessao";
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
  await exigirSessao();
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
  await exigirSessao();
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
  await exigirSessao();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  // CONCLUIDO é exclusivo da action concluirAtendimento (Story 1.4).
  if (!["AGENDADO", "CANCELADO", "FALTOU"].includes(status)) return;
  await prisma.agendamento.update({ where: { id }, data: { status } });
  revalidarAgenda();
}

export async function excluirAgendamento(formData: FormData) {
  await exigirSessao();
  const id = String(formData.get("id"));
  await prisma.agendamento.delete({ where: { id } });
  revalidarAgenda();
}
