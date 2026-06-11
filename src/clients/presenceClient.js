// src/clients/presenceClient.js
// Consulta presenca via API oficial do Roblox.
// Modo anonimo: retorna status basico (online/in-game/lastOnline).
// Modo autenticado (cookie .ROBLOSECURITY): destrava gameId/placeId
//   QUANDO o jogador-alvo permite (normalmente: ser amigo dele).

const PRESENCE_URL = "https://presence.roblox.com/v1/presence/users";
const AUTH_TICKET_URL = "https://auth.roblox.com/v1/authentication-ticket"; // so p/ csrf

const PRESENCE_TYPES = {
  0: "offline",
  1: "online",   // logado no site/app, fora de jogo
  2: "in-game",  // jogando
  3: "studio",   // no Roblox Studio
};

// O Roblox exige X-CSRF-TOKEN em POSTs autenticados.
// Truque padrao: fazer um POST "vazio" e ler o token do header da resposta 403.
async function getCsrfToken(cookie) {
  const res = await fetch(AUTH_TICKET_URL, {
    method: "POST",
    headers: { Cookie: `.ROBLOSECURITY=${cookie}` },
  });
  return res.headers.get("x-csrf-token");
}

export async function getPresence(userIds, { cookie } = {}) {
  const ids = Array.isArray(userIds) ? userIds : [userIds];

  const headers = { "Content-Type": "application/json" };
  if (cookie) {
    const csrf = await getCsrfToken(cookie);
    headers.Cookie = `.ROBLOSECURITY=${cookie}`;
    if (csrf) headers["X-CSRF-TOKEN"] = csrf;
  }

  const res = await fetch(PRESENCE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ userIds: ids }),
  });

  if (!res.ok) {
    const err = new Error(`Presence API ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return (data?.userPresences ?? []).map((p) => ({
    userId: p.userId,
    status: PRESENCE_TYPES[p.userPresenceType] ?? "unknown",
    presenceType: p.userPresenceType,
    lastLocation: p.lastLocation || null, // texto livre, ex: "Playing Adopt Me"
    // Campos abaixo so vem com cookie + permissao do alvo:
    placeId: p.placeId ?? null,
    rootPlaceId: p.rootPlaceId ?? null,
    universeId: p.universeId ?? null,
    gameId: p.gameId ?? null, // <- ID do servidor/instancia atual
    lastOnline: p.lastOnline ?? null,
  }));
}
