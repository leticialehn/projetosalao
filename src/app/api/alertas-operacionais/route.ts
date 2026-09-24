import { prisma } from "@/lib/prisma";
import { inicioDoDia } from "@/lib/datas";
import { emAlerta } from "@/lib/estoque";
import { enviarEmail, emailAlertasOperacionais } from "@/lib/email";
import { enviarWhatsapp, normalizarTelefoneBR } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const secret = process.env.ALERTAS_CRON_SECRET;
  if (!secret) {
    return Response.json(
      { erro: "Alertas operacionais desativados: configure ALERTAS_CRON_SECRET." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const produtos = await prisma.produto.findMany();
  const emAlertaLista = produtos.filter(emAlerta);

  const ontem = new Date(Date.now() - 24 * 60 * 60000);
  const fechamentoOntem = await prisma.fechamentoCaixa.findUnique({
    where: { data: inicioDoDia(ontem) },
  });
  const caixaNaoFechado = fechamentoOntem === null;

  if (emAlertaLista.length === 0 && !caixaNaoFechado) {
    return Response.json({
      enviado: false,
      produtosEmAlerta: 0,
      caixaNaoFechado: false,
    });
  }

  const nomesProdutos = emAlertaLista.map((p) => p.nome);

  const donoEmail = process.env.DONO_EMAIL;
  const donoTelefone = process.env.DONO_TELEFONE
    ? normalizarTelefoneBR(process.env.DONO_TELEFONE)
    : null;

  const emailOk = donoEmail
    ? await enviarEmail({
        to: donoEmail,
        ...emailAlertasOperacionais({
          produtos: nomesProdutos,
          caixaNaoFechado,
        }),
      })
    : false;

  const resumoTexto = [
    nomesProdutos.length > 0
      ? `${nomesProdutos.length} produto(s) em alerta`
      : null,
    caixaNaoFechado ? "caixa de ontem não fechado" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const whatsappOk = donoTelefone
    ? await enviarWhatsapp({
        to: donoTelefone,
        parametros: [resumoTexto],
        templateName: process.env.WHATSAPP_TEMPLATE_ALERTAS_NAME,
      })
    : false;

  return Response.json({
    enviado: emailOk || whatsappOk,
    produtosEmAlerta: emAlertaLista.length,
    caixaNaoFechado,
  });
}
