// src/domain/building/catalog.ts
// 30 Furniture and Construction Catalog Entries for Cats Building Subsystem

import { CatalogItem } from './types';

export const FURNITURE_CATALOG: CatalogItem[] = [
  // --- SEATING (1-5) ---
  {
    id: 'seat_cushion_sofa',
    name: 'Plush Velvet Sofa',
    category: 'seating',
    cost: 250,
    width: 2,
    height: 1,
    colorVariants: ['cream', 'sage', 'rose', 'navy'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'A cozy 2-seater couch loved by cats and humans alike.'
  },
  {
    id: 'seat_armchair_vintage',
    name: 'Vintage Wingback Chair',
    category: 'seating',
    cost: 150,
    width: 1,
    height: 1,
    colorVariants: ['mustard', 'emerald', 'burgundy'],
    interactSpots: [{ x: 0, y: 1 }],
    description: 'An elegant vintage armchair perfect for cat naps.'
  },
  {
    id: 'seat_beanbag',
    name: 'Memory Foam Beanbag',
    category: 'seating',
    cost: 80,
    width: 1,
    height: 1,
    colorVariants: ['lavender', 'charcoal', 'teal'],
    interactSpots: [{ x: 0, y: 1 }],
    description: 'Squishy beanbag that conforms perfectly to a sleeping feline.'
  },
  {
    id: 'seat_dining_chair',
    name: 'Nordic Dining Chair',
    category: 'seating',
    cost: 60,
    width: 1,
    height: 1,
    colorVariants: ['natural_oak', 'white', 'black'],
    interactSpots: [{ x: 0, y: 1 }],
    description: 'Simple wooden dining chair with curved back support.'
  },
  {
    id: 'seat_bench_window',
    name: 'Window Sun Lounger Bench',
    category: 'seating',
    cost: 180,
    width: 2,
    height: 1,
    colorVariants: ['birch', 'walnut'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'Bench positioned perfect for birdwatching in the morning sun.'
  },

  // --- SLEEP (6-10) ---
  {
    id: 'sleep_cat_donut_bed',
    name: 'Calming Donut Cat Bed',
    category: 'sleep',
    cost: 75,
    width: 1,
    height: 1,
    colorVariants: ['fluffy_pink', 'cloud_grey', 'oatmeal'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Ultra-soft self-warming donut bed for deep feline sleep.'
  },
  {
    id: 'sleep_cat_cave',
    name: 'Felt Pod Cat Cave',
    category: 'sleep',
    cost: 90,
    width: 1,
    height: 1,
    colorVariants: ['dark_grey', 'ochre', 'mint'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Enclosed wool felt cave offering security and quiet.'
  },
  {
    id: 'sleep_human_bed_queen',
    name: 'Cozy Quilted Queen Bed',
    category: 'sleep',
    cost: 600,
    width: 2,
    height: 2,
    colorVariants: ['crisp_white', 'linen_beige', 'slate'],
    interactSpots: [{ x: 0, y: 2 }, { x: 1, y: 2 }],
    description: 'Large bed with plenty of room at the foot for purring companions.'
  },
  {
    id: 'sleep_cardboard_box',
    name: 'Classic Cardboard Shipping Box',
    category: 'sleep',
    cost: 10,
    width: 1,
    height: 1,
    colorVariants: ['brown_craft', 'printed'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Inexpensive and universally agreed to be better than expensive beds.'
  },
  {
    id: 'sleep_wall_hammock',
    name: 'Wall-Mounted Canvas Hammock',
    category: 'sleep',
    cost: 110,
    width: 1,
    height: 1,
    colorVariants: ['natural_canvas', 'olive_canvas'],
    interactSpots: [{ x: 0, y: 0 }],
    requiresWall: true,
    description: 'Suspended wall hammock for cats who love high perches.'
  },

  // --- CARE & HYGIENE (11-15) ---
  {
    id: 'care_litter_box_hooded',
    name: 'Hooded Privacy Litter Box',
    category: 'care',
    cost: 120,
    width: 1,
    height: 1,
    colorVariants: ['pastel_blue', 'pure_white', 'stone'],
    interactSpots: [{ x: 0, y: 1 }],
    description: 'Enclosed litter box with odor-filtering charcoal pad.'
  },
  {
    id: 'care_food_water_bowls',
    name: 'Raised Ceramic Food & Water Set',
    category: 'care',
    cost: 50,
    width: 1,
    height: 1,
    colorVariants: ['ceramic_white', 'terracotta', 'matcha'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Ergonomic whisker-friendly ceramic bowls on a wooden stand.'
  },
  {
    id: 'care_water_fountain',
    name: 'Filtered Water Fountain',
    category: 'care',
    cost: 85,
    width: 1,
    height: 1,
    colorVariants: ['stainless_steel', 'white'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Flowing water fountain that encourages hydration.'
  },
  {
    id: 'care_cat_feeder_auto',
    name: 'Smart Automated Feeder',
    category: 'care',
    cost: 140,
    width: 1,
    height: 1,
    colorVariants: ['matte_black', 'gloss_white'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Dispenses timed kibble portions consistently.'
  },
  {
    id: 'care_grooming_station',
    name: 'Self-Grooming Arch & Brush',
    category: 'care',
    cost: 65,
    width: 1,
    height: 1,
    colorVariants: ['grey', 'blue'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Bristle arch infused with catnip for self-brushing.'
  },

  // --- PLAY (16-20) ---
  {
    id: 'play_cat_tree_tower',
    name: 'Multi-Level Activity Cat Tree',
    category: 'play',
    cost: 320,
    width: 2,
    height: 1,
    colorVariants: ['beige_carpet', 'grey_plush', 'bamboo'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'Tall tower featuring sisal posts, perches, and hanging toys.'
  },
  {
    id: 'play_scratch_post',
    name: 'Sisal Rope Scratching Post',
    category: 'play',
    cost: 45,
    width: 1,
    height: 1,
    colorVariants: ['natural', 'charcoal'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Durable post saving your sofa from feline claw maintenance.'
  },
  {
    id: 'play_crinkle_tunnel',
    name: '3-Way Crinkle Play Tunnel',
    category: 'play',
    cost: 55,
    width: 2,
    height: 2,
    colorVariants: ['rainbow', 'camo', 'pastel'],
    interactSpots: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    description: 'Crackling tunnel system ideal for ambush play.'
  },
  {
    id: 'play_laser_turret',
    name: 'Automatic Laser Pointer',
    category: 'play',
    cost: 95,
    width: 1,
    height: 1,
    colorVariants: ['white', 'red'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Projects erratic red dot paths across the room floor.'
  },
  {
    id: 'play_feather_wand_stand',
    name: 'Interactive Toy Wand Rack',
    category: 'play',
    cost: 40,
    width: 1,
    height: 1,
    colorVariants: ['pine', 'walnut'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Stores feather wands and ribbon teasers for bonding playtime.'
  },

  // --- SKILL (21-25) ---
  {
    id: 'skill_painting_easel',
    name: 'Artist Studio Easel',
    category: 'skill',
    cost: 200,
    width: 1,
    height: 1,
    colorVariants: ['natural_beech', 'stained_teak'],
    interactSpots: [{ x: 0, y: 1 }],
    description: 'Easel used to train painting skill and craft sellable artwork.'
  },
  {
    id: 'skill_planter_box',
    name: 'Indoor Herb & Catnip Garden',
    category: 'skill',
    cost: 130,
    width: 2,
    height: 1,
    colorVariants: ['terracotta', 'cedar', 'grey_stone'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'Planter box for cultivating tomatoes, strawberries, and catnip.'
  },
  {
    id: 'skill_bookshelf',
    name: 'Hardcover Wisdom Bookshelf',
    category: 'skill',
    cost: 220,
    width: 2,
    height: 1,
    colorVariants: ['espresso', 'oak', 'white'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'Packed with cat care manuals and fiction.'
  },
  {
    id: 'skill_upright_piano',
    name: 'Acoustic Upright Piano',
    category: 'skill',
    cost: 750,
    width: 2,
    height: 1,
    colorVariants: ['ebony', 'mahogany'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'Creates soothing melodies (or random paw-stomp jazz).'
  },
  {
    id: 'skill_agility_hoop',
    name: 'Cat Agility Training Hoop',
    category: 'skill',
    cost: 110,
    width: 1,
    height: 1,
    colorVariants: ['bright_yellow', 'vibrant_orange'],
    interactSpots: [{ x: 0, y: 0 }],
    description: 'Train cats to jump and balance on command.'
  },

  // --- DECOR & STORAGE (26-30) ---
  {
    id: 'decor_potted_monstera',
    name: 'Potted Monstera Deliciosa',
    category: 'decor',
    cost: 70,
    width: 1,
    height: 1,
    colorVariants: ['terracotta_pot', 'white_pot', 'black_pot'],
    interactSpots: [],
    description: 'Non-toxic pet-friendly tropical indoor plant.'
  },
  {
    id: 'decor_woven_rug_large',
    name: 'Boho Patterned Area Rug',
    category: 'decor',
    cost: 160,
    width: 3,
    height: 2,
    colorVariants: ['persian_red', 'cream_geometric', 'ocean_blue'],
    interactSpots: [],
    description: 'Soft woven rug adding warmth to any room.'
  },
  {
    id: 'storage_credenza',
    name: 'Mid-Century Credenza',
    category: 'storage',
    cost: 300,
    width: 2,
    height: 1,
    colorVariants: ['walnut', 'teak', 'white_oak'],
    interactSpots: [{ x: 0, y: 1 }, { x: 1, y: 1 }],
    description: 'Stylish storage cabinet for cat food supplies and toys.'
  },
  {
    id: 'decor_cat_wall_art',
    name: 'Framed Cat Portrait Gallery',
    category: 'decor',
    cost: 95,
    width: 1,
    height: 1,
    colorVariants: ['gold_frame', 'black_frame', 'wood_frame'],
    interactSpots: [],
    requiresWall: true,
    description: 'Framed artwork depicting illustrious ancestral cats.'
  },
  {
    id: 'decor_floor_lamp',
    name: 'Arc Brass Floor Lamp',
    category: 'decor',
    cost: 125,
    width: 1,
    height: 1,
    colorVariants: ['brass', 'matte_black', 'brushed_nickel'],
    interactSpots: [],
    description: 'Casts warm ambient light across the room.'
  }
];

export function getCatalogItem(catalogId: string): CatalogItem | undefined {
  return FURNITURE_CATALOG.find(item => item.id === catalogId);
}
