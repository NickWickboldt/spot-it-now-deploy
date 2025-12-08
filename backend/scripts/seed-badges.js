/**
 * Seed script to populate all 47 badges/achievements
 * Run with: node scripts/seed-badges.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Achievement } from '../src/models/achievement.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================
// BADGE DEFINITIONS - 47 Total Badges
// ============================================

const BADGES = [
  // ========================================
  // CATEGORY MASTERY BADGES (20 badges)
  // 5 categories × 4 tiers each
  // ========================================
  
  // Birds (4 tiers)
  {
    name: 'Bird Novice',
    description: 'Spot 5 different bird species',
    iconUrl: 'badges/bird_novice.png',
    xpReward: 50,
    category: 'category_mastery',
    tier: 1,
    threshold: 5,
    trackingType: 'category_sightings',
    trackingValue: 'Birds',
  },
  {
    name: 'Bird Explorer',
    description: 'Spot 15 different bird species',
    iconUrl: 'badges/bird_explorer.png',
    xpReward: 150,
    category: 'category_mastery',
    tier: 2,
    threshold: 15,
    trackingType: 'category_sightings',
    trackingValue: 'Birds',
  },
  {
    name: 'Bird Expert',
    description: 'Spot 30 different bird species',
    iconUrl: 'badges/bird_expert.png',
    xpReward: 300,
    category: 'category_mastery',
    tier: 3,
    threshold: 30,
    trackingType: 'category_sightings',
    trackingValue: 'Birds',
  },
  {
    name: 'Bird Master',
    description: 'Spot 50 different bird species',
    iconUrl: 'badges/bird_master.png',
    xpReward: 500,
    category: 'category_mastery',
    tier: 4,
    threshold: 50,
    trackingType: 'category_sightings',
    trackingValue: 'Birds',
  },
  
  // Mammals (4 tiers)
  {
    name: 'Mammal Novice',
    description: 'Spot 5 different mammal species',
    iconUrl: 'badges/mammal_novice.png',
    xpReward: 50,
    category: 'category_mastery',
    tier: 1,
    threshold: 5,
    trackingType: 'category_sightings',
    trackingValue: 'Mammals',
  },
  {
    name: 'Mammal Explorer',
    description: 'Spot 15 different mammal species',
    iconUrl: 'badges/mammal_explorer.png',
    xpReward: 150,
    category: 'category_mastery',
    tier: 2,
    threshold: 15,
    trackingType: 'category_sightings',
    trackingValue: 'Mammals',
  },
  {
    name: 'Mammal Expert',
    description: 'Spot 30 different mammal species',
    iconUrl: 'badges/mammal_expert.png',
    xpReward: 300,
    category: 'category_mastery',
    tier: 3,
    threshold: 30,
    trackingType: 'category_sightings',
    trackingValue: 'Mammals',
  },
  {
    name: 'Mammal Master',
    description: 'Spot 50 different mammal species',
    iconUrl: 'badges/mammal_master.png',
    xpReward: 500,
    category: 'category_mastery',
    tier: 4,
    threshold: 50,
    trackingType: 'category_sightings',
    trackingValue: 'Mammals',
  },
  
  // Reptiles and Amphibians (4 tiers)
  {
    name: 'Herp Novice',
    description: 'Spot 5 different reptile or amphibian species',
    iconUrl: 'badges/herp_novice.png',
    xpReward: 50,
    category: 'category_mastery',
    tier: 1,
    threshold: 5,
    trackingType: 'category_sightings',
    trackingValue: 'Reptiles and Amphibians',
  },
  {
    name: 'Herp Explorer',
    description: 'Spot 15 different reptile or amphibian species',
    iconUrl: 'badges/herp_explorer.png',
    xpReward: 150,
    category: 'category_mastery',
    tier: 2,
    threshold: 15,
    trackingType: 'category_sightings',
    trackingValue: 'Reptiles and Amphibians',
  },
  {
    name: 'Herp Expert',
    description: 'Spot 30 different reptile or amphibian species',
    iconUrl: 'badges/herp_expert.png',
    xpReward: 300,
    category: 'category_mastery',
    tier: 3,
    threshold: 30,
    trackingType: 'category_sightings',
    trackingValue: 'Reptiles and Amphibians',
  },
  {
    name: 'Herp Master',
    description: 'Spot 50 different reptile or amphibian species',
    iconUrl: 'badges/herp_master.png',
    xpReward: 500,
    category: 'category_mastery',
    tier: 4,
    threshold: 50,
    trackingType: 'category_sightings',
    trackingValue: 'Reptiles and Amphibians',
  },
  
  // Insects and Arachnids (4 tiers)
  {
    name: 'Bug Novice',
    description: 'Spot 5 different insect or arachnid species',
    iconUrl: 'badges/bug_novice.png',
    xpReward: 50,
    category: 'category_mastery',
    tier: 1,
    threshold: 5,
    trackingType: 'category_sightings',
    trackingValue: 'Insects and Arachnids',
  },
  {
    name: 'Bug Explorer',
    description: 'Spot 15 different insect or arachnid species',
    iconUrl: 'badges/bug_explorer.png',
    xpReward: 150,
    category: 'category_mastery',
    tier: 2,
    threshold: 15,
    trackingType: 'category_sightings',
    trackingValue: 'Insects and Arachnids',
  },
  {
    name: 'Bug Expert',
    description: 'Spot 30 different insect or arachnid species',
    iconUrl: 'badges/bug_expert.png',
    xpReward: 300,
    category: 'category_mastery',
    tier: 3,
    threshold: 30,
    trackingType: 'category_sightings',
    trackingValue: 'Insects and Arachnids',
  },
  {
    name: 'Bug Master',
    description: 'Spot 50 different insect or arachnid species',
    iconUrl: 'badges/bug_master.png',
    xpReward: 500,
    category: 'category_mastery',
    tier: 4,
    threshold: 50,
    trackingType: 'category_sightings',
    trackingValue: 'Insects and Arachnids',
  },
  
  // Marine Animals (4 tiers)
  {
    name: 'Marine Novice',
    description: 'Spot 5 different marine animal species',
    iconUrl: 'badges/marine_novice.png',
    xpReward: 50,
    category: 'category_mastery',
    tier: 1,
    threshold: 5,
    trackingType: 'category_sightings',
    trackingValue: 'Marine Animals',
  },
  {
    name: 'Marine Explorer',
    description: 'Spot 15 different marine animal species',
    iconUrl: 'badges/marine_explorer.png',
    xpReward: 150,
    category: 'category_mastery',
    tier: 2,
    threshold: 15,
    trackingType: 'category_sightings',
    trackingValue: 'Marine Animals',
  },
  {
    name: 'Marine Expert',
    description: 'Spot 30 different marine animal species',
    iconUrl: 'badges/marine_expert.png',
    xpReward: 300,
    category: 'category_mastery',
    tier: 3,
    threshold: 30,
    trackingType: 'category_sightings',
    trackingValue: 'Marine Animals',
  },
  {
    name: 'Marine Master',
    description: 'Spot 50 different marine animal species',
    iconUrl: 'badges/marine_master.png',
    xpReward: 500,
    category: 'category_mastery',
    tier: 4,
    threshold: 50,
    trackingType: 'category_sightings',
    trackingValue: 'Marine Animals',
  },
  
  // ========================================
  // RARITY HUNTING BADGES (10 badges)
  // ========================================
  
  // Common (2 tiers)
  {
    name: 'Common Collector',
    description: 'Discover 10 common animals',
    iconUrl: 'badges/common_collector.png',
    xpReward: 25,
    category: 'rarity_hunting',
    tier: 1,
    threshold: 10,
    trackingType: 'rarity_sightings',
    trackingValue: 'Common',
  },
  {
    name: 'Common Connoisseur',
    description: 'Discover 50 common animals',
    iconUrl: 'badges/common_connoisseur.png',
    xpReward: 100,
    category: 'rarity_hunting',
    tier: 2,
    threshold: 50,
    trackingType: 'rarity_sightings',
    trackingValue: 'Common',
  },
  
  // Uncommon (2 tiers)
  {
    name: 'Uncommon Finder',
    description: 'Discover 5 uncommon animals',
    iconUrl: 'badges/uncommon_finder.png',
    xpReward: 75,
    category: 'rarity_hunting',
    tier: 1,
    threshold: 5,
    trackingType: 'rarity_sightings',
    trackingValue: 'Uncommon',
  },
  {
    name: 'Uncommon Hunter',
    description: 'Discover 25 uncommon animals',
    iconUrl: 'badges/uncommon_hunter.png',
    xpReward: 200,
    category: 'rarity_hunting',
    tier: 2,
    threshold: 25,
    trackingType: 'rarity_sightings',
    trackingValue: 'Uncommon',
  },
  
  // Rare (3 tiers)
  {
    name: 'Rare Seeker',
    description: 'Discover 3 rare animals',
    iconUrl: 'badges/rare_seeker.png',
    xpReward: 150,
    category: 'rarity_hunting',
    tier: 1,
    threshold: 3,
    trackingType: 'rarity_sightings',
    trackingValue: 'Rare',
  },
  {
    name: 'Rare Tracker',
    description: 'Discover 10 rare animals',
    iconUrl: 'badges/rare_tracker.png',
    xpReward: 400,
    category: 'rarity_hunting',
    tier: 2,
    threshold: 10,
    trackingType: 'rarity_sightings',
    trackingValue: 'Rare',
  },
  {
    name: 'Rare Legend',
    description: 'Discover 25 rare animals',
    iconUrl: 'badges/rare_legend.png',
    xpReward: 750,
    category: 'rarity_hunting',
    tier: 3,
    threshold: 25,
    trackingType: 'rarity_sightings',
    trackingValue: 'Rare',
  },
  
  // Legendary (3 tiers)
  {
    name: 'Lucky Spotter',
    description: 'Discover your first legendary animal',
    iconUrl: 'badges/legendary_lucky.png',
    xpReward: 500,
    category: 'rarity_hunting',
    tier: 1,
    threshold: 1,
    trackingType: 'rarity_sightings',
    trackingValue: 'Legendary',
  },
  {
    name: 'Mythic Hunter',
    description: 'Discover 3 legendary animals',
    iconUrl: 'badges/legendary_mythic.png',
    xpReward: 1000,
    category: 'rarity_hunting',
    tier: 2,
    threshold: 3,
    trackingType: 'rarity_sightings',
    trackingValue: 'Legendary',
  },
  {
    name: 'Godlike Spotter',
    description: 'Discover 5 legendary animals',
    iconUrl: 'badges/legendary_godlike.png',
    xpReward: 2000,
    category: 'rarity_hunting',
    tier: 3,
    threshold: 5,
    trackingType: 'rarity_sightings',
    trackingValue: 'Legendary',
  },
  
  // ========================================
  // MILESTONE BADGES (7 badges)
  // Total unique animals discovered
  // ========================================
  {
    name: 'First Steps',
    description: 'Make your first wildlife discovery',
    iconUrl: 'badges/milestone_first.png',
    xpReward: 25,
    category: 'milestones',
    tier: 1,
    threshold: 1,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  {
    name: 'Getting Started',
    description: 'Discover 10 unique animals',
    iconUrl: 'badges/milestone_10.png',
    xpReward: 100,
    category: 'milestones',
    tier: 2,
    threshold: 10,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  {
    name: 'Dedicated Spotter',
    description: 'Discover 25 unique animals',
    iconUrl: 'badges/milestone_25.png',
    xpReward: 250,
    category: 'milestones',
    tier: 3,
    threshold: 25,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  {
    name: 'Wildlife Enthusiast',
    description: 'Discover 50 unique animals',
    iconUrl: 'badges/milestone_50.png',
    xpReward: 500,
    category: 'milestones',
    tier: 4,
    threshold: 50,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  {
    name: 'Nature Veteran',
    description: 'Discover 100 unique animals',
    iconUrl: 'badges/milestone_100.png',
    xpReward: 1000,
    category: 'milestones',
    tier: 5,
    threshold: 100,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  {
    name: 'Elite Explorer',
    description: 'Discover 200 unique animals',
    iconUrl: 'badges/milestone_200.png',
    xpReward: 2000,
    category: 'milestones',
    tier: 5,
    threshold: 200,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  {
    name: 'Legendary Explorer',
    description: 'Discover 500 unique animals',
    iconUrl: 'badges/milestone_500.png',
    xpReward: 5000,
    category: 'milestones',
    tier: 5,
    threshold: 500,
    trackingType: 'unique_animals',
    trackingValue: null,
  },
  
  // ========================================
  // CHALLENGE BADGES (5 badges)
  // ========================================
  {
    name: 'Challenge Accepted',
    description: 'Complete your first challenge',
    iconUrl: 'badges/challenge_first.png',
    xpReward: 50,
    category: 'challenges',
    tier: 1,
    threshold: 1,
    trackingType: 'challenges_completed',
    trackingValue: null,
  },
  {
    name: 'Challenge Seeker',
    description: 'Complete 5 challenges',
    iconUrl: 'badges/challenge_5.png',
    xpReward: 150,
    category: 'challenges',
    tier: 2,
    threshold: 5,
    trackingType: 'challenges_completed',
    trackingValue: null,
  },
  {
    name: 'Challenge Hunter',
    description: 'Complete 15 challenges',
    iconUrl: 'badges/challenge_15.png',
    xpReward: 300,
    category: 'challenges',
    tier: 3,
    threshold: 15,
    trackingType: 'challenges_completed',
    trackingValue: null,
  },
  {
    name: 'Challenge Champion',
    description: 'Complete 50 challenges',
    iconUrl: 'badges/challenge_50.png',
    xpReward: 750,
    category: 'challenges',
    tier: 4,
    threshold: 50,
    trackingType: 'challenges_completed',
    trackingValue: null,
  },
  {
    name: 'Challenge Legend',
    description: 'Complete 100 challenges',
    iconUrl: 'badges/challenge_100.png',
    xpReward: 1500,
    category: 'challenges',
    tier: 5,
    threshold: 100,
    trackingType: 'challenges_completed',
    trackingValue: null,
  },
  
  // ========================================
  // SPECIAL BADGES (5 badges)
  // Time-based and unique achievements
  // ========================================
  {
    name: 'Early Bird',
    description: 'Make a sighting before 7:00 AM',
    iconUrl: 'badges/special_early_bird.png',
    xpReward: 100,
    category: 'special',
    tier: 1,
    threshold: 1,
    trackingType: 'special',
    trackingValue: 'early_morning',
    isSecret: true,
  },
  {
    name: 'Night Owl',
    description: 'Make a sighting after 10:00 PM',
    iconUrl: 'badges/special_night_owl.png',
    xpReward: 100,
    category: 'special',
    tier: 1,
    threshold: 1,
    trackingType: 'special',
    trackingValue: 'late_night',
    isSecret: true,
  },
  {
    name: 'Streak Starter',
    description: 'Make sightings 3 days in a row',
    iconUrl: 'badges/streak_3.png',
    xpReward: 75,
    category: 'special',
    tier: 1,
    threshold: 3,
    trackingType: 'streak_days',
    trackingValue: null,
  },
  {
    name: 'Streak Master',
    description: 'Make sightings 7 days in a row',
    iconUrl: 'badges/streak_7.png',
    xpReward: 200,
    category: 'special',
    tier: 2,
    threshold: 7,
    trackingType: 'streak_days',
    trackingValue: null,
  },
  {
    name: 'Streak Legend',
    description: 'Make sightings 30 days in a row',
    iconUrl: 'badges/streak_30.png',
    xpReward: 1000,
    category: 'special',
    tier: 3,
    threshold: 30,
    trackingType: 'streak_days',
    trackingValue: null,
  },
];

async function seedBadges() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!\n');

    console.log(`Seeding ${BADGES.length} badges...\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const badge of BADGES) {
      try {
        // Try to find existing badge by name
        const existing = await Achievement.findOne({ name: badge.name });
        
        if (existing) {
          // Update existing badge
          await Achievement.findByIdAndUpdate(existing._id, badge);
          console.log(`✓ Updated: ${badge.name}`);
          updated++;
        } else {
          // Create new badge
          await Achievement.create(badge);
          console.log(`+ Created: ${badge.name}`);
          created++;
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`- Skipped (duplicate): ${badge.name}`);
          skipped++;
        } else {
          console.error(`✗ Error with ${badge.name}:`, error.message);
        }
      }
    }

    console.log('\n========================================');
    console.log(`Seeding complete!`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total badges in DB: ${await Achievement.countDocuments()}`);
    console.log('========================================');

  } catch (error) {
    console.error('Error seeding badges:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedBadges();
