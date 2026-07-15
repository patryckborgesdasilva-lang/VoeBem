// Envia mensagem de texto via Z-API
export async function enviarWhatsApp(telefone, mensagem) {
  const numero = telefone.replace(/\D/g, ''); // remove tudo que não é número

  const res = await fetch(
    `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE}/token/${process.env.ZAPI_TOKEN}/send-text`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `55${numero}`, message: mensagem }),
    }
  );

  if (!res.ok) {
    const erro = await res.text();
    throw new Error(`Z-API erro: ${erro}`);
  }

  return res.json();
}

// Monta a mensagem de alerta de queda de preço
export function montarMensagemAlerta({ alerta, preco, companhia, linkAfiliado }) {
  return (
    `✈️ *Alerta VoaBem!*\n\n` +
    `A passagem que você monitora *caiu de preço!*\n\n` +
    `📍 ${alerta.origem} → ${alerta.destino}\n` +
    `💰 *R$ ${preco.toLocaleString('pt-BR')}* (seu limite: R$ ${alerta.preco_maximo})\n` +
    `🛫 ${companhia}\n\n` +
    `👉 Ver e comprar agora:\n${linkAfiliado}\n\n` +
    `_Promoções podem acabar rápido!_\n\n` +
    `Cancelar alertas: ${process.env.BASE_URL}/cancelar/${alerta.id}`
  );
}

// Monta a mensagem de confirmação de cadastro
export function montarMensagemConfirmacao({ alerta }) {
  return (
    `✅ *Alerta cadastrado no VoaBem!*\n\n` +
    `📍 ${alerta.origem} → ${alerta.destino}\n` +
    `💰 Aviso quando baixar de R$ ${alerta.preco_maximo}\n\n` +
    `Você receberá uma mensagem assim que encontrarmos um preço abaixo do seu limite.\n\n` +
    `_Parcelei e Fui — viajando mais, pagando menos_ 🧡\n\n` +
    `Cancelar alertas: ${process.env.BASE_URL}/cancelar/${alerta.id}`
  );
}
