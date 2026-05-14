const base = import.meta.env.BASE_URL;
const cache = {};

async function load(url) {
  if (!cache[url]) cache[url] = fetch(url).then(r => r.json());
  return cache[url];
}

export const loadRegions = () => load(`${base}assets/data/regions.json`);

export function loadFingerprintAnalysis(analysis) {
  return load(`${base}assets/data/fingerprints_${analysis}.json`);
}

export function byId(list) {
  return new Map(list.map(r => [r.id, r]));
}
