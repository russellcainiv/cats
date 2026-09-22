// src/content/cat-catalog.ts
// CATS-5: Canonical appearance and trait definitions for the cat creator.
// Appearance IDs and trait IDs are persistent canonical keys. If a catalog
// entry's label or emoji changes, existing cats keep their stored ID and
// resolve to the new metadata at read time (safe migration).

export type AppearanceDef = {
  variant: string;    // canonical catalog ID — never changes
  label: string;      // human-readable name
  emoji: string;      // Unicode cat emoji for sprite/portrait
  description: string;
};

export type TraitDef = {
  id: string;          // canonical catalog ID — never changes
  label: string;       // human-readable name
  description: string;
};

export const catCatalog = {
  appearances: [
    { variant: 'orange-tabby', label: 'Orange Tabby', emoji: '🐈', description: 'Classic marmalade stripes' },
    { variant: 'black-tuxedo', label: 'Black Tuxedo', emoji: '🐈⬛', description: 'Glossy black with white chest' },
    { variant: 'gray-tabby', label: 'Gray Tabby', emoji: '🐱', description: 'Soft blue-grey stripes' },
    { variant: 'brown-tabby', label: 'Brown Tabby', emoji: '🐱', description: 'Warm brown mackerel coat' },
    { variant: 'cream', label: 'Cream', emoji: '🐈', description: 'Solid pale orange' },
    { variant: 'tortoiseshell', label: 'Tortoiseshell', emoji: '🐱', description: 'Swirling black, orange, and brown' },
    { variant: 'calico', label: 'Calico', emoji: '🐈', description: 'White with orange and black patches' },
    { variant: 'black-solid', label: 'Black', emoji: '🐈⬛', description: 'Solid jet-black coat' },
  ] as const satisfies AppearanceDef[],

  traits: [
    { id: 'playful', label: 'Playful', description: 'Loves games and climbing' },
    { id: 'lazy', label: 'Lazy', description: 'Prefers naps to adventures' },
    { id: 'affectionate', label: 'Affectionate', description: 'Seeks attention and cuddles' },
    { id: 'curious', label: 'Curious', description: 'Investigates everything new' },
    { id: 'shy', label: 'Shy', description: 'Takes time to warm up to strangers' },
    { id: 'bold', label: 'Bold', description: 'Fearless explorer of high places' },
  ] as const satisfies TraitDef[],

  appearanceEmoji: {
    'orange-tabby': '🐈',
    'black-tuxedo': '🐈⬛',
    'gray-tabby': '🐱',
    'brown-tabby': '🐱',
    'cream': '🐈',
    'tortoiseshell': '🐱',
    'calico': '🐈',
    'black-solid': '🐈⬛',
  } as Record<string, string>,
};

// Look up an appearance by variant ID.
export function getAppearance(variant: string): AppearanceDef | undefined {
  return catCatalog.appearances.find(a => a.variant === variant);
}

// Look up a trait by ID.
export function getTrait(id: string): TraitDef | undefined {
  return catCatalog.traits.find(t => t.id === id);
}
