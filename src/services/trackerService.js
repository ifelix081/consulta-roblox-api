// src/services/trackerService.js
// Junta presenca + jogos e mantem um historico local de atividade.
// O Roblox NAO expoe historico de partidas de terceiros, entao o
// historico real e construido aqui: cada consulta grava o status num log.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getPresence } from "../clients/presenceClient.js";

const HISTORY_FILE = "./data/activity-history.json";

async function loadHistory() {
  try {
    return JSON.parse(await readFile(HISTORY_FILE, "utf8"));
  } catch {
    return {}; // arquivo ainda nao existe
  }
}

async function saveHistory(history) {
  await mkdir(dirname(HISTORY_FILE), { recursive: true });
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Grava um evento so se o status mudou desde a ultima vez (evita lixo).
async function recordEvent(userId, snapshot) {
  const history = await loadHistory();
  const log = history[userId] ?? [];
  const last = log[log.length - 1];

  const changed =
    !last ||
    last.status !== snapshot.status ||
    last.lastLocation !== snapshot.lastLocation;

  if (changed) {
    log.push({
      status: snapshot.status,
      lastLocation: snapshot.lastLocation,
      gameId: snapshot.gameId,
      at: new Date().toISOString(),
    });
    history[userId] = log.slice(-200); // mantem ultimos 200 eventos
    await saveHistory(history);
  }
  return history[userId] ?? log;
}

// Snapshot de atividade de UM usuario (com gravacao no historico).
export async function trackUser(userId, { cookie } = {}) {
  const [presence] = await getPresence(userId, { cookie });
  const snapshot = presence ?? { userId, status: "unknown", lastLocation: null };
  const history = await recordEvent(userId, snapshot);

  return {
    userId,
    online: snapshot.status !== "offline",
    status: snapshot.status,                 // offline | online | in-game | studio
    currentGame: snapshot.lastLocation,      // nome do jogo (texto), se disponivel
    currentServer: snapshot.gameId,          // ID do servidor; null sem auth/permissao
    placeId: snapshot.placeId,
    lastOnline: snapshot.lastOnline,
    serverVisible: snapshot.gameId != null,  // flag clara p/ o front
    history,                                 // historico local acumulado
    checkedAt: new Date().toISOString(),
  };
}

// Rastreia varios usuarios de uma vez (1 chamada na API do Roblox).
export async function trackMany(userIds, { cookie } = {}) {
  const presences = await getPresence(userIds, { cookie });
  const out = [];
  for (const p of presences) {
    await recordEvent(p.userId, p);
    out.push({
      userId: p.userId,
      online: p.status !== "offline",
      status: p.status,
      currentGame: p.lastLocation,
      currentServer: p.gameId,
      serverVisible: p.gameId != null,
    });
  }
  return out;
}
