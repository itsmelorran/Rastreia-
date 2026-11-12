// Simulador do app Android: envia coordenadas GPS para a API a cada X segundos.
// Uso:  node simulador/dispositivo.js <TOKEN_DO_DISPOSITIVO>
// O token e exibido quando voce cadastra um dispositivo na tela "Dispositivos".

const API = process.env.API_URL || 'http://localhost:3000';
const token = process.argv[2];
if (!token) {
  console.error('Informe o token do dispositivo: node simulador/dispositivo.js <TOKEN>');
  process.exit(1);
}

// Ponto de partida (centro de Sao Paulo) e um pequeno passeio aleatorio.
let lat = -2.4430, lon = -54.7080, bateria = 95;

async function enviar() {
  lat += (Math.random() - 0.5) * 0.0008;
  lon += (Math.random() - 0.5) * 0.0008;
  bateria = Math.max(5, bateria - Math.random() * 0.5);
  try {
    const res = await fetch(`${API}/api/localizacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': token },
      body: JSON.stringify({ latitude: +lat.toFixed(6), longitude: +lon.toFixed(6), precisao_m: 5, bateria: Math.round(bateria) }),
    });
    const data = await res.json();
    if (res.ok) console.log(`enviado  lat=${lat.toFixed(5)} lon=${lon.toFixed(5)} bat=${Math.round(bateria)}%  -> loc #${data.localizacao_id}`);
    else console.error('erro:', data.erro);
  } catch (e) {
    console.error('falha de conexao:', e.message);
  }
}

console.log(`Simulador iniciado. Enviando GPS para ${API} a cada 10s. (Ctrl+C para parar)`);
enviar();
setInterval(enviar, 10000);
