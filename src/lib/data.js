const cache = {};

async function load(url) {
  if (!cache[url]) cache[url] = fetch(url).then(r => r.json());
  return cache[url];
}

export const loadRegions      = () => load("/assets/data/regions.json");
export const loadFingerprints = () => load("/assets/data/fingerprints.json");

// Returns Map<id, region> for O(1) lookup
export function byId(list) {
  return new Map(list.map(r => [r.id, r]));
}
