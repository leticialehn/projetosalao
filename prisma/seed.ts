import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.pagamento.deleteMany();
  await prisma.comissaoRegra.deleteMany();
  await prisma.fechamentoCaixa.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.profissional.deleteMany();
  await prisma.cliente.deleteMany();

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
      { profissionalId: ana.id, percentual: 40 },
      { profissionalId: bruno.id, percentual: 35 },
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
