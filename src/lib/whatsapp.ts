function configurado(templateName?: string): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      (templateName || process.env.WHATSAPP_TEMPLATE_NAME),
  );
}

/**
 * Converte um telefone em formato livre (como cadastrado em `Cliente`) para
 * o E.164 exigido pela WhatsApp Cloud API. Retorna `null` quando não parece
 * um número brasileiro válido — tratado como "sem WhatsApp disponível",
 * nunca como erro.
 */
export function normalizarTelefoneBR(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return null;
}

export async function enviarWhatsapp({
  to,
  parametros,
  templateName,
}: {
  to: string;
  parametros: string[];
  /** Nome do template aprovado a usar; default `WHATSAPP_TEMPLATE_NAME` (o
   * template de lembrete de agendamento — Story 8.3). Outras rotas (retenção,
   * alertas operacionais) passam seu próprio template aqui, já que cada
   * template da Meta tem um número fixo e diferente de variáveis aprovado. */
  templateName?: string;
}): Promise<boolean> {
  const nomeTemplate = templateName || process.env.WHATSAPP_TEMPLATE_NAME;
  if (!configurado(nomeTemplate)) return false;

  const corpo = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: nomeTemplate,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "pt_BR" },
      components: [
        {
          type: "body",
          parameters: parametros.map((texto) => ({ type: "text", text: texto })),
        },
      ],
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      },
    );

    if (!response.ok) {
      const erro = await response.text().catch(() => "");
      console.error("[whatsapp] Falha ao enviar mensagem:", response.status, erro);
      return false;
    }

    return true;
  } catch (erro) {
    console.error("[whatsapp] Falha ao enviar mensagem:", erro);
    return false;
  }
}
