import {
  AccessoryItem,
  CareerOutfitItem,
  CoatVariant,
  EyeColorPalette,
  RoomSwatch,
} from './types';

// 12 Wardrobe Accessories (collars, bowties, bandanas, scarves, bells)
export const WARDROBE_ACCESSORIES: AccessoryItem[] = [
  {
    id: 'collar_bell_gold',
    displayName: 'Jingle Gold Bell Collar',
    type: 'collar',
    costCoins: 20,
    paletteVariants: ['ruby_red', 'sapphire_blue', 'emerald_green', 'black'],
    description: 'Classic leather collar with a soft jingle gold bell.',
    assetKey: 'acc_collar_bell',
  },
  {
    id: 'bowtie_dapper',
    displayName: 'Dapper Satin Bowtie',
    type: 'bowtie',
    costCoins: 30,
    paletteVariants: ['velvet_red', 'midnight_navy', 'gold_polka_dot', 'blush_pink'],
    description: 'Charming bowtie for distinguished cats.',
    assetKey: 'acc_bowtie_dapper',
  },
  {
    id: 'bandana_country',
    displayName: 'Rustic Gingham Bandana',
    type: 'bandana',
    costCoins: 25,
    paletteVariants: ['red_check', 'blue_check', 'yellow_sunflower', 'sage_plaid'],
    description: 'Folded neck bandana for sunny garden strolls.',
    assetKey: 'acc_bandana_gingham',
  },
  {
    id: 'scarf_cozy_knitted',
    displayName: 'Hand-Knitted Winter Scarf',
    type: 'scarf',
    costCoins: 35,
    paletteVariants: ['cream_wool', 'mustard_yellow', 'berry_red', 'mint_stripe'],
    description: 'Warm chunky yarn scarf for cozy winters.',
    assetKey: 'acc_scarf_knitted',
  },
  {
    id: 'collar_rhinestone',
    displayName: 'Sparkle Gem Collar',
    type: 'collar',
    costCoins: 50,
    paletteVariants: ['diamond_crystal', 'pink_sapphire', 'purple_amethyst'],
    description: 'Glittering rhinestone collar for glamour cats.',
    assetKey: 'acc_collar_rhinestone',
  },
  {
    id: 'bowtie_floral',
    displayName: 'Cottage Bloom Bowtie',
    type: 'bowtie',
    costCoins: 35,
    paletteVariants: ['daisy_print', 'lavender_field', 'rose_chintz'],
    description: 'Delicate floral pattern fabric bowtie.',
    assetKey: 'acc_bowtie_floral',
  },
  {
    id: 'bandana_adventure',
    displayName: 'Trail Explorer Bandana',
    type: 'bandana',
    costCoins: 30,
    paletteVariants: ['camo_green', 'sunset_orange', 'starry_night'],
    description: 'Durable cotton bandana for adventurous cats.',
    assetKey: 'acc_bandana_explorer',
  },
  {
    id: 'scarf_silk_ascot',
    displayName: 'Silky Ascot Cravat Scarf',
    type: 'scarf',
    costCoins: 60,
    paletteVariants: ['champagne_gold', 'emerald_satin', 'royal_burgundy'],
    description: 'Elegant smooth silk ascot scarf.',
    assetKey: 'acc_scarf_ascot',
  },
  {
    id: 'collar_safety_breakaway',
    displayName: 'Neon Safety Reflex Collar',
    type: 'collar',
    costCoins: 15,
    paletteVariants: ['highvis_yellow', 'bright_coral', 'cyan'],
    description: 'Reflective quick-release safety collar.',
    assetKey: 'acc_collar_safety',
  },
  {
    id: 'bell_pendant_charm',
    displayName: 'Chirping Brass Bell Pendant',
    type: 'bell',
    costCoins: 25,
    paletteVariants: ['antique_brass', 'polished_silver', 'rose_copper'],
    description: 'Single tinkling brass bell pendant.',
    assetKey: 'acc_bell_pendant',
  },
  {
    id: 'bowtie_velvet_party',
    displayName: 'Celebration Velvet Bowtie',
    type: 'bowtie',
    costCoins: 40,
    paletteVariants: ['festive_crimson', 'pine_green', 'plum'],
    description: 'Rich velvet bowtie for party celebrations.',
    assetKey: 'acc_bowtie_velvet',
  },
  {
    id: 'bandana_sailor',
    displayName: 'Nautical Sailor Collar Bandana',
    type: 'bandana',
    costCoins: 35,
    paletteVariants: ['navy_white_stripe', 'anchor_blue', 'red_seafarer'],
    description: 'Cute sailor flap collar bandana.',
    assetKey: 'acc_bandana_sailor',
  },
];

// Career Outfits (3 careers x 3 ranks)
export const CAREER_OUTFITS: CareerOutfitItem[] = [
  // Café Assistant
  {
    id: 'outfit_cafe_rank1',
    careerTrackId: 'cafe_assistant',
    rank: 1,
    displayName: 'Café Apron (Junior)',
    paletteVariant: 'burlap_brown',
    description: 'Simple waist apron with front pocket for order pads.',
    assetKey: 'outfit_cafe_apron_jr',
  },
  {
    id: 'outfit_cafe_rank2',
    careerTrackId: 'cafe_assistant',
    rank: 2,
    displayName: 'Barista Apron & Cap (Barista)',
    paletteVariant: 'espresso_green',
    description: 'Full chest apron with brass clips and barista cap.',
    assetKey: 'outfit_cafe_apron_barista',
  },
  {
    id: 'outfit_cafe_rank3',
    careerTrackId: 'cafe_assistant',
    rank: 3,
    displayName: 'Master Pastry Chef Jacket',
    paletteVariant: 'chef_white_gold',
    description: 'Double-breasted white chef jacket with toque hat.',
    assetKey: 'outfit_cafe_chef_master',
  },

  // Garden Keeper
  {
    id: 'outfit_garden_rank1',
    careerTrackId: 'garden_keeper',
    rank: 1,
    displayName: 'Gardener Overalls (Sprout)',
    paletteVariant: 'denim_blue',
    description: 'Denim overalls with small trowel pocket.',
    assetKey: 'outfit_garden_overalls_jr',
  },
  {
    id: 'outfit_garden_rank2',
    careerTrackId: 'garden_keeper',
    rank: 2,
    displayName: 'Garden Keeper Sunhat & Apron',
    paletteVariant: 'straw_sage',
    description: 'Woven straw sunhat and utility garden apron.',
    assetKey: 'outfit_garden_sunhat_apron',
  },
  {
    id: 'outfit_garden_rank3',
    careerTrackId: 'garden_keeper',
    rank: 3,
    displayName: 'Master Botanist Tweed Vest',
    paletteVariant: 'moss_tweed',
    description: 'Tweed vest with magnifying glass and seed pouches.',
    assetKey: 'outfit_garden_botanist_master',
  },

  // Gallery Helper
  {
    id: 'outfit_gallery_rank1',
    careerTrackId: 'gallery_helper',
    rank: 1,
    displayName: 'Art Smock (Apprentice)',
    paletteVariant: 'paint_splattered',
    description: 'Lightweight linen smock dotted with colorful paint.',
    assetKey: 'outfit_gallery_smock_jr',
  },
  {
    id: 'outfit_gallery_rank2',
    careerTrackId: 'gallery_helper',
    rank: 2,
    displayName: 'Painter Beret & Smock (Artist)',
    paletteVariant: 'velvet_beret_black',
    description: 'French wool beret with artist palette pin.',
    assetKey: 'outfit_gallery_beret_smock',
  },
  {
    id: 'outfit_gallery_rank3',
    careerTrackId: 'gallery_helper',
    rank: 3,
    displayName: 'Gallery Curator Tuxedo Collar',
    paletteVariant: 'midnight_black_gold',
    description: 'Sophisticated tuxedo collar and monocle.',
    assetKey: 'outfit_gallery_curator_master',
  },
];

// 16 Coat Pattern Variants
export const COAT_VARIANTS: CoatVariant[] = [
  { id: 'coat_mackerel_tabby', displayName: 'Mackerel Tabby', category: 'tabby', assetKey: 'coat_mackerel_tabby' },
  { id: 'coat_classic_blotched_tabby', displayName: 'Classic Blotched Tabby', category: 'tabby', assetKey: 'coat_classic_tabby' },
  { id: 'coat_spotted_tabby', displayName: 'Spotted Tabby', category: 'tabby', assetKey: 'coat_spotted_tabby' },
  { id: 'coat_ticked_tabby', displayName: 'Ticked Tabby', category: 'tabby', assetKey: 'coat_ticked_tabby' },
  { id: 'coat_calico_tri_color', displayName: 'Calico Tri-Color', category: 'calico', assetKey: 'coat_calico_tri' },
  { id: 'coat_dilute_calico', displayName: 'Dilute Pastel Calico', category: 'calico', assetKey: 'coat_dilute_calico' },
  { id: 'coat_tortoiseshell', displayName: 'Tortoiseshell', category: 'calico', assetKey: 'coat_tortoiseshell' },
  { id: 'coat_tuxedo_bicolor', displayName: 'Black & White Tuxedo', category: 'bicolor', assetKey: 'coat_tuxedo' },
  { id: 'coat_cow_spotted', displayName: 'Cow Spotted Bicolor', category: 'bicolor', assetKey: 'coat_cow_spotted' },
  { id: 'coat_siamese_point', displayName: 'Seal Point Siamese', category: 'pointed', assetKey: 'coat_seal_point' },
  { id: 'coat_lynx_point', displayName: 'Lynx Point', category: 'pointed', assetKey: 'coat_lynx_point' },
  { id: 'coat_solid_white', displayName: 'Solid Snow White', category: 'solid', assetKey: 'coat_solid_white' },
  { id: 'coat_solid_panther_black', displayName: 'Solid Midnight Black', category: 'solid', assetKey: 'coat_solid_black' },
  { id: 'coat_solid_ginger_orange', displayName: 'Solid Ginger Orange', category: 'solid', assetKey: 'coat_solid_orange' },
  { id: 'coat_rosette_bengal', displayName: 'Leopard Rosette', category: 'spotted', assetKey: 'coat_rosette_bengal' },
  { id: 'coat_clouded_marble', displayName: 'Clouded Marble', category: 'spotted', assetKey: 'coat_clouded_marble' },
];

// 8 Eye Color Palettes
export const EYE_COLOR_PALETTES: EyeColorPalette[] = [
  { id: 'eye_amber_gold', displayName: 'Amber Gold', hexCode: '#FFBF00' },
  { id: 'eye_emerald_green', displayName: 'Emerald Green', hexCode: '#50C878' },
  { id: 'eye_sapphire_blue', displayName: 'Sapphire Blue', hexCode: '#0F52BA' },
  { id: 'eye_copper_hazel', displayName: 'Copper Hazel', hexCode: '#B87333' },
  { id: 'eye_jade_mint', displayName: 'Jade Mint', hexCode: '#00A86B' },
  { id: 'eye_amethyst_violet', displayName: 'Amethyst Violet', hexCode: '#9966CC' },
  { id: 'eye_aquamarine_cyan', displayName: 'Aquamarine Cyan', hexCode: '#7FFFD4' },
  { id: 'eye_dichroic_heterochromia', displayName: 'Heterochromia (Gold/Blue)', hexCode: '#FFBF00,#0F52BA' },
];

// Reversible Room Swatches (Wall & Floor)
export const ROOM_SWATCHES: RoomSwatch[] = [
  // Wallpapers
  { id: 'wall_cottage_floral', displayName: 'Floral Meadow Wallpaper', category: 'wallpaper', style: 'cozy_cottage', costCoins: 40, hexColor: '#FDF0ED', textureAssetKey: 'wall_floral' },
  { id: 'wall_modern_sage_slats', displayName: 'Sage Slat Panel Wallpaper', category: 'wallpaper', style: 'modern_cat', costCoins: 50, hexColor: '#8A9A86', textureAssetKey: 'wall_sage_slats' },
  { id: 'wall_whimsical_starry', displayName: 'Starry Sky Night Wallpaper', category: 'wallpaper', style: 'whimsical_play', costCoins: 45, hexColor: '#1F2937', textureAssetKey: 'wall_starry' },
  { id: 'wall_rustic_brick', displayName: 'Exposed Red Brick Wallpaper', category: 'wallpaper', style: 'rustic_garden', costCoins: 40, hexColor: '#A0522D', textureAssetKey: 'wall_brick' },
  { id: 'wall_pastel_yellow_stripe', displayName: 'Butter Yellow Stripe Wallpaper', category: 'wallpaper', style: 'cozy_cottage', costCoins: 35, hexColor: '#FFF8DC', textureAssetKey: 'wall_yellow_stripe' },

  // Flooring
  { id: 'floor_oak_hardwood', displayName: 'Warm Oak Plank Flooring', category: 'flooring', style: 'cozy_cottage', costCoins: 50, hexColor: '#C19A6B', textureAssetKey: 'floor_oak' },
  { id: 'floor_modern_terrazzo', displayName: 'Pastel Speckle Terrazzo Flooring', category: 'flooring', style: 'modern_cat', costCoins: 65, hexColor: '#E5E7EB', textureAssetKey: 'floor_terrazzo' },
  { id: 'floor_whimsical_checkboard', displayName: 'Mint Checkboard Tile Flooring', category: 'flooring', style: 'whimsical_play', costCoins: 55, hexColor: '#A7F3D0', textureAssetKey: 'floor_checker' },
  { id: 'floor_rustic_stone_pavers', displayName: 'Garden Stone Pavers Flooring', category: 'flooring', style: 'rustic_garden', costCoins: 60, hexColor: '#9CA3AF', textureAssetKey: 'floor_pavers' },
  { id: 'floor_herringbone_parquet', displayName: 'Herringbone Walnut Parquet', category: 'flooring', style: 'cozy_cottage', costCoins: 75, hexColor: '#5C4033', textureAssetKey: 'floor_herringbone' },
];
