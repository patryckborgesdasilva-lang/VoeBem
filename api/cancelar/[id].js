import supabase from '../../lib/supabase.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send(paginaErro('Link inválido.'));
  }

  const { error } = await supabase
    .from('alertas')
    .update({ ativo: false })
    .eq('id', id);

  if (error) {
    return res.status(500).send(paginaErro('Erro ao cancelar. Tente novamente.'));
  }

  return res.status(200).send(paginaSucesso());
}

function paginaSucesso() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta cancelado — VoaBem</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0d1117; color: #f1f5f9; }
    .box { text-align: center; padding: 40px; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #64748b; font-size: 15px; line-height: 1.6; }
    a { color: #fbbf24; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✅</div>
    <h1>Alerta cancelado</h1>
    <p>Você não receberá mais avisos para essa rota.<br>
    Quer monitorar outra rota? <a href="/">Voltar ao VoaBem</a></p>
  </div>
</body>
</html>`;
}

function paginaErro(msg) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro — VoaBem</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0d1117; color: #f1f5f9; }
    .box { text-align: center; padding: 40px; max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { color: #64748b; font-size: 15px; }
    a { color: #fbbf24; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">⚠️</div>
    <h1>Algo deu errado</h1>
    <p>${msg}<br><a href="/">Voltar ao VoaBem</a></p>
  </div>
</body>
</html>`;
}
