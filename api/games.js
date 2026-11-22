// Descubre los juegos solo: busca en los repos de GitHub de OWNER un archivo `pf-juego.json`
// en la raíz. Si está, el juego aparece en el índice. No hay que tocar este repo para sumar juegos.
//
// Opcional: variable de entorno GITHUB_TOKEN (token de solo lectura) para incluir repos privados
// y no depender del límite de GitHub sin autenticar (60 consultas/hora).
const OWNER = process.env.PF_OWNER || 'paviafernando';
const FILE = 'pf-juego.json';
const TTL = 5 * 60 * 1000;

let cache = { t: 0, data: null };

module.exports = async function handler(req, res) {
  const fresh = req.query && 'fresh' in req.query;
  if (fresh || !cache.data || Date.now() - cache.t > TTL) {
    try {
      cache = { t: Date.now(), data: await discover() };
    } catch (e) {
      if (!cache.data) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(502).json({ error: String(e.message || e) });
      }
    }
  }
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400');
  res.status(200).json(cache.data);
};

async function discover() {
  const token = process.env.GITHUB_TOKEN;
  const api = { 'User-Agent': 'pf-juegos', Accept: 'application/vnd.github+json' };
  if (token) api.Authorization = `Bearer ${token}`;

  const listUrl = token
    ? 'https://api.github.com/user/repos?per_page=100&affiliation=owner&sort=pushed'
    : `https://api.github.com/users/${OWNER}/repos?per_page=100&type=owner&sort=pushed`;
  const r = await fetch(listUrl, { headers: api });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const repos = (await r.json()).filter((x) => !x.fork && !x.archived && x.owner?.login?.toLowerCase() === OWNER.toLowerCase());

  const found = await Promise.all(repos.map(async (repo) => {
    try {
      const url = repo.private
        ? `https://api.github.com/repos/${repo.full_name}/contents/${FILE}?ref=${repo.default_branch}`
        : `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/${FILE}`;
      const m = await fetch(url, { headers: repo.private ? { ...api, Accept: 'application/vnd.github.raw' } : { 'User-Agent': 'pf-juegos' } });
      if (!m.ok) return null;
      const g = await m.json();
      if (!g || g.hidden) return null;
      return { ...g, id: g.id || repo.name, url: (g.url || repo.homepage || '').replace(/\/+$/, ''), repo: repo.full_name, pushed: repo.pushed_at };
    } catch { return null; }
  }));

  return { updated: new Date().toISOString(), games: found.filter((g) => g && g.url) };
}
