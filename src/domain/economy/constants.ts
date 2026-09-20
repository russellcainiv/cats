// src/domain/economy/constants.ts

import { CareerConfig, CropConfig, CafeRecipe, GoalDefinition } from './types';

export const CAREER_CONFIGS: Record<string, CareerConfig> = {
  cafe_assistant: {
    id: 'cafe_assistant',
    name: 'Café Assistant',
    outfit: {
      id: 'cafe_apron',
      name: 'Café Apron',
      body: 'apron_green',
      description: 'A cozy green apron suitable for serving coffee and treats.'
    },
    ranks: [
      { rank: 1, title: 'Barista Trainee', hourlyWage: 15, requiredSkill: 'social', requiredSkillLevel: 0, requiredDaysWorked: 0, requiredPerformance: 0, shiftStartHour: 8, shiftEndHour: 16, workDays: [1, 2, 3, 4, 5] },
      { rank: 2, title: 'Head Barista', hourlyWage: 25, requiredSkill: 'social', requiredSkillLevel: 3, requiredDaysWorked: 3, requiredPerformance: 60, shiftStartHour: 8, shiftEndHour: 16, workDays: [1, 2, 3, 4, 5] },
      { rank: 3, title: 'Café Manager', hourlyWage: 40, requiredSkill: 'social', requiredSkillLevel: 6, requiredDaysWorked: 7, requiredPerformance: 75, shiftStartHour: 8, shiftEndHour: 16, workDays: [1, 2, 3, 4, 5] }
    ]
  },
  garden_keeper: {
    id: 'garden_keeper',
    name: 'Garden Keeper',
    outfit: {
      id: 'gardener_overalls_sunhat',
      name: 'Gardener Overalls & Sunhat',
      hat: 'sunhat_straw',
      body: 'overalls_denim',
      description: 'Sturdy denim overalls and a sunhat to protect against the sun.'
    },
    ranks: [
      { rank: 1, title: 'Weed Puller', hourlyWage: 12, requiredSkill: 'gardening', requiredSkillLevel: 0, requiredDaysWorked: 0, requiredPerformance: 0, shiftStartHour: 7, shiftEndHour: 15, workDays: [1, 2, 3, 4, 5] },
      { rank: 2, title: 'Landscape Caretaker', hourlyWage: 22, requiredSkill: 'gardening', requiredSkillLevel: 3, requiredDaysWorked: 3, requiredPerformance: 60, shiftStartHour: 7, shiftEndHour: 15, workDays: [1, 2, 3, 4, 5] },
      { rank: 3, title: 'Master Botanist', hourlyWage: 38, requiredSkill: 'gardening', requiredSkillLevel: 6, requiredDaysWorked: 7, requiredPerformance: 75, shiftStartHour: 7, shiftEndHour: 15, workDays: [1, 2, 3, 4, 5] }
    ]
  },
  gallery_helper: {
    id: 'gallery_helper',
    name: 'Gallery Helper',
    outfit: {
      id: 'gallery_helper_smock_beret',
      name: 'Gallery Smock & Beret',
      hat: 'beret_red',
      body: 'smock_artist',
      description: 'An artistic smock and stylish red beret for gallery work.'
    },
    ranks: [
      { rank: 1, title: 'Art Docent', hourlyWage: 18, requiredSkill: 'painting', requiredSkillLevel: 0, requiredDaysWorked: 0, requiredPerformance: 0, shiftStartHour: 10, shiftEndHour: 18, workDays: [2, 3, 4, 5, 6] },
      { rank: 2, title: 'Exhibitions Curate', hourlyWage: 28, requiredSkill: 'painting', requiredSkillLevel: 3, requiredDaysWorked: 3, requiredPerformance: 60, shiftStartHour: 10, shiftEndHour: 18, workDays: [2, 3, 4, 5, 6] },
      { rank: 3, title: 'Gallery Director', hourlyWage: 45, requiredSkill: 'painting', requiredSkillLevel: 6, requiredDaysWorked: 7, requiredPerformance: 75, shiftStartHour: 10, shiftEndHour: 18, workDays: [2, 3, 4, 5, 6] }
    ]
  }
};

export const CROP_CONFIGS: Record<string, CropConfig> = {
  tomato: {
    type: 'tomato',
    name: 'Tomato',
    seedCost: 10,
    growthTimeMinutes: 120, // 2 sim hours
    waterIntervalMinutes: 60,
    baseYield: 3,
    baseSellPrice: 8,
    requiredSkillLevel: 0
  },
  strawberry: {
    type: 'strawberry',
    name: 'Strawberry',
    seedCost: 20,
    growthTimeMinutes: 240, // 4 sim hours
    waterIntervalMinutes: 90,
    baseYield: 4,
    baseSellPrice: 15,
    requiredSkillLevel: 2
  },
  catnip: {
    type: 'catnip',
    name: 'Catnip',
    seedCost: 35,
    growthTimeMinutes: 360, // 6 sim hours
    waterIntervalMinutes: 120,
    baseYield: 5,
    baseSellPrice: 25,
    requiredSkillLevel: 4
  }
};

export const CAFE_RECIPES: CafeRecipe[] = [
  { id: 'fish_pie', name: 'Fish Pie', costToStock: 12, sellPrice: 25, unlocked: true, requiredSkillLevel: 0 },
  { id: 'cream_bun', name: 'Cream Bun', costToStock: 8, sellPrice: 18, unlocked: true, requiredSkillLevel: 0 },
  { id: 'catnip_tea', name: 'Catnip Tea', costToStock: 15, sellPrice: 32, unlocked: true, requiredSkillLevel: 1 }
];

export const GOAL_DEFINITIONS: GoalDefinition[] = [
  // 18 meaningful goals across categories
  { id: 'goal_care_1', title: 'First Care', description: 'Feed or groom a cat', category: 'care', target: 1, rewardCash: 50 },
  { id: 'goal_care_2', title: 'Attentive Caregiver', description: 'Maintain high needs across household', category: 'care', target: 10, rewardCash: 100 },
  { id: 'goal_relationships_1', title: 'Making Friends', description: 'Form a friendship bond', category: 'relationships', target: 1, rewardCash: 75 },
  { id: 'goal_relationships_2', title: 'True Love', description: 'Form a romantic love relationship', category: 'relationships', target: 1, rewardCash: 150 },
  { id: 'goal_building_1', title: 'Home Decorator', description: 'Place 5 furniture items', category: 'building', target: 5, rewardCash: 100 },
  { id: 'goal_building_2', title: 'Master Builder', description: 'Build a new wall or room segment', category: 'building', target: 1, rewardCash: 200 },
  { id: 'goal_work_1', title: 'First Shift', description: 'Complete your first work shift', category: 'work', target: 1, rewardCash: 100 },
  { id: 'goal_work_2', title: 'Hard Worker', description: 'Work 5 shifts', category: 'work', target: 5, rewardCash: 250 },
  { id: 'goal_work_3', title: 'Career Promotion', description: 'Reach rank 2 in any career', category: 'work', target: 1, rewardCash: 300 },
  { id: 'goal_hobbies_1', title: 'Budding Artist', description: 'Paint 1 artwork', category: 'hobbies', target: 1, rewardCash: 75 },
  { id: 'goal_hobbies_2', title: 'Masterpiece Painter', description: 'Paint a masterpiece artwork', category: 'hobbies', target: 1, rewardCash: 300 },
  { id: 'goal_hobbies_3', title: 'Green Thumb', description: 'Harvest 3 crops from garden', category: 'hobbies', target: 3, rewardCash: 100 },
  { id: 'goal_hobbies_4', title: 'Bountiful Harvest', description: 'Harvest catnip crop', category: 'hobbies', target: 1, rewardCash: 150 },
  { id: 'goal_business_1', title: 'Café Owner', description: 'Acquire and open the cat café', category: 'business', target: 1, rewardCash: 250 },
  { id: 'goal_business_2', title: 'Busy Barista', description: 'Serve 10 café customers', category: 'business', target: 10, rewardCash: 300 },
  { id: 'goal_neighborhood_1', title: 'Explorer', description: 'Visit a neighborhood lot', category: 'neighborhood', target: 1, rewardCash: 100 },
  { id: 'goal_neighborhood_2', title: 'Social Butterfly', description: 'Interact with 3 NPC cats', category: 'neighborhood', target: 3, rewardCash: 150 },
  { id: 'goal_legacy_1', title: 'Growing Family', description: 'Welcome a kitten to the household', category: 'legacy', target: 1, rewardCash: 500 }
];
