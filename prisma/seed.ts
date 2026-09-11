import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Proteção: o seed apaga TODOS os dados antes de recriar. Em qualquer
  // banco que já tenha conteúdo (ex.: produção), exige SEED_FORCE=1.
  const jaTemDados =
    (await prisma.agendamento.count()) +
      (await prisma.cliente.count()) +
      (await prisma.servico.count()) >
    0;
  const force =
    process.env.SEED_FORCE === "1" || process.argv.includes("--force");
  if (jaTemDados && !force) {
    console.error(
      "Banco já contém dados. O seed foi abortado para não apagá-los.\n" +
        "Para forçar (apaga tudo): npm run db:seed -- --force",
    );
    process.exit(1);
  }

  await prisma.pagamento.deleteMany();
  await prisma.comissaoRegra.deleteMany();
  await prisma.fechamentoCaixa.deleteMany();
  await prisma.taxaPagamento.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.profissional.deleteMany();
  await prisma.cliente.deleteMany();

  await prisma.taxaPagamento.createMany({
    data: [
      { formaPagamento: "DINHEIRO", percentual: 0, valorFixo: 0 },
      { formaPagamento: "PIX", percentual: 0, valorFixo: 0 },
      { formaPagamento: "DEBITO", percentual: 1.5, valorFixo: 0 },
      { formaPagamento: "CREDITO", percentual: 3.5, valorFixo: 0 },
    ],
  });

  const [corte, escova, coloracao, manicure] = await Promise.all([
    prisma.servico.create({ data: { nome: "Corte feminino", duracaoMin: 45, preco: 80 } }),
    prisma.servico.create({ data: { nome: "Escova", duracaoMin: 40, preco: 60 } }),
    prisma.servico.create({ data: { nome: "Coloração", duracaoMin: 120, preco: 220 } }),
    prisma.servico.create({ data: { nome: "Manicure", duracaoMin: 50, preco: 45 } }),
  ]);

  const [ana, bruno, carla] = await Promise.all([
    prisma.profissional.create({ data: { nome: "Ana Souza", especialidade: "Cabeleireira", telefone: "(11) 99999-1111", comissaoPercentual: 40 } }),
    prisma.profissional.create({ data: { nome: "Bruno Lima", especialidade: "Colorista", telefone: "(11) 99999-2222", comissaoPercentual: 35 } }),
    prisma.profissional.create({ data: { nome: "Carla Dias", especialidade: "Manicure", telefone: "(11) 99999-3333" } }),
  ]);

  await prisma.comissaoRegra.createMany({
    data: [
      { profissionalId: ana.id, servicoId: null, percentual: 40 },
      { profissionalId: bruno.id, servicoId: null, percentual: 35 },
      // Regra específica (Story 2.4): Bruno ganha mais em Coloração que a
      // sua comissão geral — prevalece sobre os 35% acima só nesse serviço.
      { profissionalId: bruno.id, servicoId: coloracao.id, percentual: 50 },
    ],
  });

  const [maria, joao] = await Promise.all([
    prisma.cliente.create({ data: { nome: "Maria Oliveira", telefone: "(11) 98888-1234", email: "maria@example.com" } }),
    prisma.cliente.create({ data: { nome: "João Pereira", telefone: "(11) 97777-5678" } }),
  ]);

  const hoje = new Date();
  hoje.setHours(10, 0, 0, 0);
  const fim1 = new Date(hoje.getTime() + corte.duracaoMin * 60000);

  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(14, 0, 0, 0);
  const fim2 = new Date(amanha.getTime() + coloracao.duracaoMin * 60000);

  const atendimentoConcluido = await prisma.agendamento.create({
    data: {
      inicio: hoje,
      fim: fim1,
      clienteId: maria.id,
      profissionalId: ana.id,
      servicoId: corte.id,
      status: "CONCLUIDO",
      valorCobrado: 80,
    },
  });

  await prisma.pagamento.create({
    data: { agendamentoId: atendimentoConcluido.id, valor: 80, formaPagamento: "PIX", conferido: false },
  });

  const maisTarde = new Date(hoje);
  maisTarde.setHours(15, 0, 0, 0);
  const fim3 = new Date(maisTarde.getTime() + escova.duracaoMin * 60000);

  await prisma.agendamento.createMany({
    data: [
      { inicio: maisTarde, fim: fim3, clienteId: joao.id, profissionalId: ana.id, servicoId: escova.id },
      { inicio: amanha, fim: fim2, clienteId: joao.id, profissionalId: bruno.id, servicoId: coloracao.id, observacoes: "Alergia a amônia" },
    ],
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
