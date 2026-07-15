import supabase from '../../lib/supabase.js';
import { enviarWhatsApp, montarMensagemConfirmacao } from '../../lib/whatsapp.js';

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { whatsapp, origem, destino, preco_maximo } = req.body;

  // Validação básica
  if (!whatsapp || !origem || !destino || !preco_maximo) {
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  }

  const telefone = whatsapp.replace(/\D/g, '');
  if (telefone.length < 10 || telefone.length > 11) {
    return res.status(400).json({ erro: 'WhatsApp inválido.' });
  }

  // Verifica se já existe alerta igual ativo
  const { data: existente } = await supabase
    .from('alertas')
    .select('id')
    .eq('whatsapp', telefone)
    .eq('origem', origem.toUpperCase())
    .eq('destino', destino.toUpperCase())
    .eq('ativo', true)
    .single();

  if (existente) {
    return res.status(409).json({ erro: 'Você já tem um alerta ativo para essa rota.' });
  }

  // Salva o alerta
  const { data: alerta, error } = await supabase
    .from('alertas')
    .insert({
      whatsapp: telefone,
      origem: origem.toUpperCase(),
      destino: destino.toUpperCase(),
      preco_maximo: Number(preco_maximo),
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase erro:', error);
    return res.status(500).json({ erro: 'Erro ao salvar alerta. Tente novamente.' });
  }

  // Manda confirmação no WhatsApp
  try {
    const mensagem = montarMensagemConfirmacao({ alerta });
    await enviarWhatsApp(telefone, mensagem);
  } catch (e) {
    // Não bloqueia o cadastro se o WhatsApp falhar
    console.error('WhatsApp confirmação falhou:', e.message);
  }

  return res.status(201).json({
    ok: true,
    mensagem: 'Alerta cadastrado! Você receberá uma confirmação no WhatsApp.',
    id: alerta.id,
  });
}
