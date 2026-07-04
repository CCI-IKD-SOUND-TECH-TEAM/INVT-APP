// Placeholder Unsplash photos per category, used until an item has a real photo.
const CATEGORY_PLACEHOLDER_IDS: Record<string, [string, string]> = {
  Speakers: ["1531104985437-603d6490e6d4", "1762342210626-b2ffdefad170"],
  Microphones: ["1662644287860-ba9f2ee65ec9", "1712669310182-051011bb61c5"],
  "Mixing Consoles": ["1566612453429-50faafea3e5f", "1578125769963-ef5edfa5b0fc"],
  "Cabling & Connectors": ["1570770691583-0a1fa5847306", "1570770691583-0a1fa5847306"],
  "Lighting Fixtures": ["1676063258992-1562bbecb583", "1760539619529-cfd85a2a9cfd"],
  "Lighting Controllers": ["1763480708634-cd8de0549987", "1755508159006-d93494f2ee4c"],
  Projectors: ["1579036095242-fe07594274ca", "1633510964011-05b18d618db5"],
  "Screens & Mounts": ["1733222765056-b0790217baa9", "1521607630287-ee2e81ad3ced"],
  "Stands & Rigging": ["1621235218771-d7ccf11a1408", "1561264974-153c4dacddd2"],
  "Power & Batteries": ["1734616699978-1a5fccec41e7", "1637773339519-679b29199c18"],
};

const FALLBACK_IDS: [string, string] = [
  "1531104985437-603d6490e6d4",
  "1566612453429-50faafea3e5f",
];

function unsplashUrl(id: string, width: number) {
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${Math.round(width * 0.75)}&fit=crop&auto=format&q=80`;
}

function pickIndex(seed: string, length: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % length;
}

export function itemImage(category: string, itemId: string, width = 480) {
  const ids = CATEGORY_PLACEHOLDER_IDS[category] ?? FALLBACK_IDS;
  const id = ids[pickIndex(itemId, ids.length)];
  return unsplashUrl(id, width);
}
