import supabase from '../../lib/supabase.js';
import { buscarMenorPreco, montarLinkAfiliado } from '../../lib/precos.js';
import { enviarWhatsApp, montarMensagemAlerta } from '../../lib/whatsapp.js';

// Vercel Cron: roda a cada 6 horas
// Adicione no vercel.json: { "crons": [{ "path": "/api/cron/verificar-precos", "schedule": "0 */6 * * *" }] }

export default async function handler(req, res) {
  // Proteção: só a Vercel pode chamar este endpoint
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  console.log(`[VoaBem Cron] Iniciando verificação — ${new Date().toISOString()}`);

  // Busca todos os alertas ativos
  const { data: alertas, error } = await supabase
    .from('alertas')
    .select('*')
    .eq('ativo', true);

  if (error) {
    console.error('Erro ao buscar alertas:', error);
    return res.status(500).json({ erro: 'Erro ao buscar alertas' });
  }

  console.log(`[VoaBem Cron] ${alertas.length} alertas ativos encontrados`);

  // Agrupa por rota pra não chamar a SerpAPI duas vezes pra mesma rota
  const rotas = {};
  for (const alerta of alertas) {
    const chave = `${alerta.origem}-${alerta.destino}`;
    if (!rotas[chave]) rotas[chave] = [];
    rotas[chave].push(alerta);
  }

  let enviados = 0;
  let erros = 0;

  for (const [chave, grupo] of Object.entries(rotas)) {
    const [origem, destino] = chave.split('-');

    try {
      const resultado = await buscarMenorPreco(origem, destino);
      if (!resultado) {
        console.log(`[${chave}] Sem resultados`);
        continue;
      }

      console.log(`[${chave}] Menor preço: R$ ${resultado.preco}`);

      // Verifica quais alertas deste grupo devem ser disparados
      for (const alerta of grupo) {
        if (resultado.preco > alerta.preco_maximo) continue;

        // Evita mandar o mesmo alerta duas vezes em menos de 12 horas
        if (alerta.ultimo_aviso) {
          const diff = Date.now() - new Date(alerta.ultimo_aviso).getTime();
          if (diff < 12 * 60 * 60 * 1000) {
            console.log(`[${chave}] Alerta ${alerta.id} ignorado — avisado recentemente`);
            continue;
          }
        }

        const linkAfiliado = montarLinkAfiliado(origem, destino, alerta.id);
        const mensagem = montarMensagemAlerta({
          alerta,
          preco: resultado.preco,
          companhia: resultado.companhia,
          linkAfiliado,
        });

        try {
          await enviarWhatsApp(alerta.whatsapp, mensagem);

          // Registra o disparo
          await supabase.from('disparos').insert({
            alerta_id: alerta.id,
            preco: resultado.preco,
            companhia: resultado.companhia,
            link: linkAfiliado,
          });

          // Atualiza o alerta com o timestamp do último aviso
          await supabase
            .from('alertas')
            .update({
              ultimo_aviso: new Date().toISOString(),
              total_avisos: (alerta.total_avisos || 0) + 1,
            })
            .eq('id', alerta.id);

          enviados++;
          console.log(`[${chave}] Alerta enviado para ${alerta.whatsapp}`);
        } catch (e) {
          erros++;
          console.error(`[${chave}] Falha ao enviar para ${alerta.whatsapp}:`, e.message);
        }
      }

      // Pausa de 1s entre rotas pra não sobrecarregar a SerpAPI
      await new Promise(r => setTimeout(r, 1000));

    } catch (e) {
      erros++;
      console.error(`[${chave}] Erro na busca de preço:`, e.message);
    }
  }

  const resumo = { rotas: Object.keys(rotas).length, enviados, erros };
  console.log('[VoaBem Cron] Finalizado:', resumo);
  return res.status(200).json(resumo);
}
