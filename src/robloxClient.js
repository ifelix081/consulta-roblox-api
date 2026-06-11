// src/robloxClient.js
// Cliente para os endpoints publicos oficiais do Roblox.
// IMPORTANTE: so retorna dados que o usuario deixou publicos.

const ENDPOINTS = {
  usersByName: "https://users.roblox.com/v1/usernames/users",
  userById: (id) => `https://users.roblox.com/v1/users/${id}`,
  friends: (id) => `https://friends.roblox.com/v1/users/${id}/friends`,
  friendsCount: (id) => `https://friends.roblox.com/v1/users/${id}/friends/count`,
  // "favoritos/jogos" publicos: jogos criados/em destaque pelo usuario
  userGames: (id) =>
    `https://games.roblox.com/v2/users/${id}/games?accessFilter=Public&sortOrder=Desc&limit=50`,
  favoriteGames: (id) =>
    `https://games.roblox.com/v2/users/${id}/favorite/games?sortOrder=Desc&limit=50`,
  avatarThumb: (id) =>
    `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`,
};

async function getJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Roblox API ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Resolve username -> userId
export async function resolveUserId(username) {
  const data = await getJSON(ENDPOINTS.usersByName, {
    method: "POST",
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });
  const user = data?.data?.[0];
  if (!user) {
    const err = new Error(`Usuario "${username}" nao encontrado`);
    err.status = 404;
    throw err;
  }
  return user.id;
}

export async function getProfile(userId) {
  return getJSON(ENDPOINTS.userById(userId));
}

export async function getAvatar(userId) {
  const data = await getJSON(ENDPOINTS.avatarThumb(userId));
  return data?.data?.[0]?.imageUrl ?? null;
}

export async function getFriends(userId) {
  const [list, count] = await Promise.all([
    getJSON(ENDPOINTS.friends(userId)).catch(() => ({ data: [] })),
    getJSON(ENDPOINTS.friendsCount(userId)).catch(() => ({ count: null })),
  ]);
  return {
    count: count?.count ?? (list?.data?.length ?? 0),
    list: (list?.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      displayName: f.displayName,
    })),
  };
}

export async function getGames(userId) {
  const [created, favorites] = await Promise.all([
    getJSON(ENDPOINTS.userGames(userId)).catch(() => ({ data: [] })),
    getJSON(ENDPOINTS.favoriteGames(userId)).catch(() => ({ data: [] })),
  ]);
  const map = (g) => ({
    id: g.id,
    name: g.name,
    placeVisits: g.placeVisits ?? null,
    created: g.created ?? null,
    updated: g.updated ?? null,
  });
  return {
    created: (created?.data ?? []).map(map),
    favorites: (favorites?.data ?? []).map(map),
  };
}

// Aceita username OU id. Se for numero puro, trata como id.
export async function resolveTarget(identifier) {
  const isNumeric = /^\d+$/.test(String(identifier).trim());
  return isNumeric ? Number(identifier) : resolveUserId(identifier);
}
