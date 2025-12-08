/**
 * Recalculate XP for existing challenges that have xp_potential = 0
 * This is needed because challenges created before the XP formula was implemented
 * have their xp_potential set to 0.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnimalMapping } from '../src/models/animalMapping.model.js';
import { UserChallenge } from '../src/models/userChallenge.model.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// XP calculation formula: |probability - 100| * 2 per animal
const calculateChallengeXP = (animals) => {
  if (!animals || animals.length === 0) return 0;
  
  return animals.reduce((total, animal) => {
    const probability = animal.probability || 0;
    const xpValue = Math.abs(probability - 100) * 2;
    return total + xpValue;
  }, 0);
};

async function recalculateXP() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spotitnow');
    console.log('Connected successfully!\n');

    // Find all challenges where xp_potential is 0 or undefined
    const challenges = await UserChallenge.find({
      $or: [
        { 'daily.xp_potential': { $exists: false } },
        { 'daily.xp_potential': 0 },
        { 'weekly.xp_potential': { $exists: false } },
        { 'weekly.xp_potential': 0 }
      ]
    });

    console.log(`Found ${challenges.length} challenges to update\n`);

    let updated = 0;
    for (const challenge of challenges) {
      let needsUpdate = false;
      
      // Recalculate daily XP if needed
      if (!challenge.daily.xp_potential || challenge.daily.xp_potential === 0) {
        if (challenge.daily.animals && challenge.daily.animals.length > 0) {
          // Get full animal data with probabilities
          const animalIds = challenge.daily.animals.map(a => a.animalId);
          const animalMappings = await AnimalMapping.find({ 
            _id: { $in: animalIds },
            regionId: challenge.regionId 
          });
          
          // Map probabilities to animals
          const animalsWithProb = challenge.daily.animals.map(animal => {
            const mapping = animalMappings.find(m => m._id.equals(animal.animalId));
            return {
              ...animal.toObject(),
              probability: mapping ? mapping.probability : 50
            };
          });
          
          const xp = calculateChallengeXP(animalsWithProb);
          challenge.daily.xp_potential = xp;
          console.log(`  Daily: ${challenge.daily.animals.length} animals -> ${xp} XP`);
          needsUpdate = true;
        }
      }

      // Recalculate weekly XP if needed
      if (!challenge.weekly.xp_potential || challenge.weekly.xp_potential === 0) {
        if (challenge.weekly.animals && challenge.weekly.animals.length > 0) {
          // Get full animal data with probabilities
          const animalIds = challenge.weekly.animals.map(a => a.animalId);
          const animalMappings = await AnimalMapping.find({ 
            _id: { $in: animalIds },
            regionId: challenge.regionId 
          });
          
          // Map probabilities to animals
          const animalsWithProb = challenge.weekly.animals.map(animal => {
            const mapping = animalMappings.find(m => m._id.equals(animal.animalId));
            return {
              ...animal.toObject(),
              probability: mapping ? mapping.probability : 50
            };
          });
          
          const xp = calculateChallengeXP(animalsWithProb);
          challenge.weekly.xp_potential = xp;
          console.log(`  Weekly: ${challenge.weekly.animals.length} animals -> ${xp} XP`);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await challenge.save();
        updated++;
        console.log(`✓ Updated challenge for user ${challenge.userId}\n`);
      }
    }

    console.log(`\nRecalculation complete!`);
    console.log(`Updated ${updated} challenges`);

  } catch (error) {
    console.error('Error recalculating XP:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
recalculateXP();
