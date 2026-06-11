// src/server.js
import express from "express";
import {
  resolveTarget,
  getProfile,
  getAvatar,
  getFriends,
  getGames,
} from "./robloxClient.js";
import { trackUser, trackMany } from "./services/trackerService.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

function asyncHandler(fn) {
  return (req, res) => fn(req, res).catch((err) => {
    res.status(err.status || 500).json({ error: err.message });
  });
}

// Health check / lista de rotas (JSON)
app.get("/api", (req, res) => {
  res.json({
    service: "Roblox Data API",
    rotas: [
      "GET /user/:identifier            -> perfil + avatar",
      "GET /user/:identifier/friends    -> lista de amigos",
      "GET /user/:identifier/games      -> jogos criados e favoritos",
      "GET /user/:identifier/full       -> tudo agregado",
      "GET /user/:identifier/activity   -> tracker: status + servidor + historico",
      "GET /track?ids=1,2,3              -> status de varios usuarios de uma vez",
    ],
    nota: "identifier pode ser username ou ID numerico. Servidor atual (gameId) so com ROBLOX_COOKIE configurado e se o jogador permitir.",
  });
});

// Perfil basico
app.get("/user/:identifier", asyncHandler(async (req, res) => {
  const userId = await resolveTarget(req.params.identifier);
  const [profile, avatar] = await Promise.all([
    getProfile(userId),
    getAvatar(userId),
  ]);
  res.json({ ...profile, avatar });
}));

// Amigos
app.get("/user/:identifier/friends", asyncHandler(async (req, res) => {
  const userId = await resolveTarget(req.params.identifier);
  res.json(await getFriends(userId));
}));

// Jogos
app.get("/user/:identifier/games", asyncHandler(async (req, res) => {
  const userId = await resolveTarget(req.params.identifier);
  res.json(await getGames(userId));
}));

// Tudo agregado
app.get("/user/:identifier/full", asyncHandler(async (req, res) => {
  const userId = await resolveTarget(req.params.identifier);
  const [profile, avatar, friends, games] = await Promise.all([
    getProfile(userId),
    getAvatar(userId),
    getFriends(userId),
    getGames(userId),
  ]);
  res.json({
    profile: { ...profile, avatar },
    friends,
    games,
    geradoEm: new Date().toISOString(),
  });
}));

// Tracker de atividade de um usuario (status + servidor + historico)
app.get("/user/:identifier/activity", asyncHandler(async (req, res) => {
  const userId = await resolveTarget(req.params.identifier);
  const cookie = process.env.ROBLOX_COOKIE; // opcional: destrava servidor atual
  res.json(await trackUser(userId, { cookie }));
}));

// Tracker em lote: /track?ids=1,2,3
app.get("/track", asyncHandler(async (req, res) => {
  const raw = String(req.query.ids ?? "").trim();
  if (!raw) {
    return res.status(400).json({ error: "informe ?ids=1,2,3" });
  }
  const ids = raw.split(",").map((s) => Number(s.trim())).filter(Boolean);
  const cookie = process.env.ROBLOX_COOKIE;
  res.json(await trackMany(ids, { cookie }));
}));

app.listen(PORT, () => {
  console.log(`Roblox Data API rodando em http://localhost:${PORT}`);
});
