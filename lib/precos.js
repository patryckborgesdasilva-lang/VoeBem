// Busca o menor preço disponível para uma rota via SerpAPI (Google Flights)
export async function buscarMenorPreco(origem, destino) {
  const hoje = new Date();
  const daqui30 = new Date(hoje);
  daqui30.setDate(hoje.getDate() + 30);

  // Busca nos próximos 30 dias — pega a data mais barata
  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: origem,
    arrival_id: destino,
    outbound_date: formatarData(hoje),
    return_date: formatarData(daqui30),
    currency: 'BRL',
    hl: 'pt',
    gl: 'br',
    type: '1', // só ida
    api_key: process.env.SERPAPI_KEY,
  });

  const res = await fetch(`https://serpapi.com/search?${params.toString()}`);
  if (!res.ok) throw new Error(`SerpAPI erro: ${res.status}`);

  const data = await res.json();

  // Pega o voo mais barato entre best_flights e other_flights
  const todos = [
    ...(data.best_flights || []),
    ...(data.other_flights || []),
  ];

  if (todos.length === 0) return null;

  const mais_barato = todos.reduce((menor, voo) =>
    voo.price < menor.price ? voo : menor
  );

  return {
    preco: mais_barato.price,
    companhia: mais_barato.flights?.[0]?.airline || 'Não informado',
    duracao: mais_barato.total_duration,
    data_partida: mais_barato.flights?.[0]?.departure_airport?.time,
  };
}

// Monta o link de afiliado da Decolar com rastreamento
export function montarLinkAfiliado(origem, destino, alerta_id) {
  const base = 'https://www.decolar.com/shop/flights/results/oneway';
  const params = new URLSearchParams({
    from: origem,
    to: destino,
    departing: formatarDataDecolar(new Date()),
    adults: '1',
    children: '0',
    babies: '0',
    utm_source: 'voabem',
    utm_medium: 'whatsapp',
    utm_campaign: 'alerta',
    utm_content: alerta_id,
    // substitua pelo seu ID real de afiliado após aprovação
    aid: process.env.DECOLAR_AFFILIATE_ID || 'SEU_ID_AFILIADO',
  });
  return `${base}?${params.toString()}`;
}

function formatarData(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatarDataDecolar(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
