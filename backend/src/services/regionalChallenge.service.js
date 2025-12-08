import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { Animal } from '../models/animal.model.js';
import { RegionalChallenge } from '../models/regionalChallenge.model.js';
import { User } from '../models/user.model.js';
import { UserChallenge } from '../models/userChallenge.model.js';
import { log } from '../utils/logger.util.js';
import { badgeService } from './badge.service.js';
import { experienceService } from './experience.service.js';

// Lazy initialization - only check for API key when actually calling the AI
let genAI = null;

const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Calculate XP for a challenge based on animal probabilities.
 * Formula: Sum of |probability - 100| * 2 for each animal
 * This rewards harder challenges (lower probability = higher XP)
 * 
 * @param {Array} animals - Array of animals with probability field
 * @returns {number} Total XP for the challenge
 */
const calculateChallengeXP = (animals) => {
  return animals.reduce((total, animal) => {
    const xpForAnimal = Math.abs(animal.probability - 100) * 2;
    return total + xpForAnimal;
  }, 0);
};

// Distance threshold in degrees (roughly 50 miles = ~0.7 degrees latitude)
const REGION_PROXIMITY_THRESHOLD = 0.7;

/**
 * Build the "Zoologist" prompt for generating probability map.
 * This is called ONCE per region to create a static probability manifest.
 * 
 * NOTE: Probabilities represent "chance an average person walking around this area
 * for 1-2 hours on a single day would spot this animal at least once."
 */
const buildZoologistPrompt = (location, animalNames) => {
  return `You are an expert wildlife biologist specializing in animal observation probabilities.

I need you to estimate realistic daily sighting probabilities for a list of animals in a specific location.

THE QUESTION FOR EACH ANIMAL: "If an average person spent 1-2 hours walking around ${location} today (parks, neighborhoods, trails), what is the percent chance they would spot this animal at least once?"

Location: ${location}
Animals to evaluate: ${animalNames.join(', ')}

CRITICAL - Be conservative and realistic with probabilities:
- 0%: Impossible in this biome (Polar Bear in Texas, Penguin in suburban areas)
- 1-5%: Very rare - might see once per year if lucky (foxes, owls, deer in suburban areas)
- 6-15%: Uncommon - might see a few times per month (hawks, woodpeckers, rabbits)
- 16-35%: Fairly common - expect to see weekly (blue jays, doves, chipmunks)
- 36-60%: Common - likely to see on most outings (cardinals, robins, crows, squirrels)
- 61-80%: Very common - almost guaranteed (house sparrows, pigeons in urban areas)
- 81-100%: Extremely common - impossible to miss (only for the most abundant species)

IMPORTANT: Most wild animals should be BELOW 30%. Even "common" backyard birds are only seen on some days, not every day. Urban pigeons might be 70%, but most songbirds are 20-40% at best.

Return ONLY a valid JSON array. No markdown, no explanation.
Format: [{ "name": "Animal Name", "probability": 25 }, ...]

Use the EXACT animal names provided. Every animal in the list must appear in your response.`;
};

/**
 * Reverse geocode coordinates to get city and state using OpenStreetMap Nominatim
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'SpotItNow/1.0 (Wildlife Spotting App)',
      },
    });

    const address = response.data?.address || {};
    const city = address.city || address.town || address.village || address.county || 'Unknown';
    const state = address.state || address.region || '';
    const country = address.country || '';

    return {
      city,
      state,
      country,
      raw: address,
    };
  } catch (error) {
    log.error('regionalChallenge-service', 'Reverse geocoding failed', { error: error?.message, lat, lng });
    throw new Error('Failed to determine location from coordinates');
  }
};

/**
 * Generate a normalized region key from city and state
 */
export const generateRegionKey = (city, state) => {
  const normalizedCity = city.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const normalizedState = state.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `${normalizedCity}_${normalizedState}`;
};

/**
 * Find a nearby region within the proximity threshold.
 * This allows reusing probability maps for nearby locations.
 */
export const findNearbyRegion = async (lat, lng) => {
  // Find any region within ~50 miles
  const regions = await RegionalChallenge.find({
    'center.latitude': { $gte: lat - REGION_PROXIMITY_THRESHOLD, $lte: lat + REGION_PROXIMITY_THRESHOLD },
    'center.longitude': { $gte: lng - REGION_PROXIMITY_THRESHOLD, $lte: lng + REGION_PROXIMITY_THRESHOLD },
  }).limit(1);

  return regions.length > 0 ? regions[0] : null;
};

/**
 * Call Gemini AI to generate the probability manifest for a region.
 * This is called ONCE per region and the result is cached in the database.
 */
export const generateProbabilityManifest = async (location, lat, lng) => {
  // Fetch all animals from the database
  const animals = await Animal.find({}).select('commonName').lean();

  if (!animals || animals.length === 0) {
    throw new Error('No animals found in database. Please add animals before generating challenges.');
  }

  const animalNames = animals.map((a) => a.commonName);
  const prompt = buildZoologistPrompt(location, animalNames);

  try {
    log.info('regionalChallenge-service', 'Calling Gemini API for probability manifest', { location, animalCount: animalNames.length });

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    log.info('regionalChallenge-service', 'Gemini API response received', { responseLength: text?.length });

    // Parse the JSON response - clean up markdown and normalize formatting
    let cleanedText = text.trim();
    
    // Remove markdown code blocks
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    // Attempt to extract JSON array if wrapped in extra text
    const jsonArrayMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      cleanedText = jsonArrayMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      // Try to repair common JSON issues
      log.warn('regionalChallenge-service', 'Initial JSON parse failed, attempting repair', { 
        error: parseError?.message,
        sampleText: cleanedText.substring(0, 200),
      });

      // Remove trailing commas and other common issues
      let repairedText = cleanedText
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/:\s*undefined/g, ': null')  // Replace undefined with null
        .replace(/'/g, '"');  // Replace single quotes with double quotes

      try {
        parsed = JSON.parse(repairedText);
      } catch (repairError) {
        throw new Error(`Failed to parse JSON even after repair: ${repairError?.message}`);
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid response: expected an array');
    }

    // Validate and normalize the manifest
    const validAnimalNamesLower = new Set(animalNames.map((n) => n.toLowerCase()));
    const manifest = [];

    for (const item of parsed) {
      if (!item.name || typeof item.probability !== 'number') {
        log.warn('regionalChallenge-service', 'Skipping invalid manifest entry', item);
        continue;
      }

      // Check if the animal is in our database
      if (!validAnimalNamesLower.has(item.name.toLowerCase())) {
        log.warn('regionalChallenge-service', `Unknown animal in manifest: "${item.name}"`);
        continue;
      }

      // Find exact name from DB
      const exactName = animalNames.find((n) => n.toLowerCase() === item.name.toLowerCase());
      
      manifest.push({
        name: exactName || item.name,
        probability: Math.max(0, Math.min(100, Math.round(item.probability))),
      });
    }

    // Ensure all DB animals are in the manifest (with 0 probability if not mentioned)
    for (const name of animalNames) {
      if (!manifest.find((m) => m.name.toLowerCase() === name.toLowerCase())) {
        manifest.push({ name, probability: 0 });
      }
    }

    log.info('regionalChallenge-service', 'Probability manifest generated', { 
      location, 
      manifestSize: manifest.length,
      probabilityDistribution: {
        zero: manifest.filter((m) => m.probability === 0).length,
        rare: manifest.filter((m) => m.probability > 0 && m.probability <= 5).length,
        uncommon: manifest.filter((m) => m.probability > 5 && m.probability <= 15).length,
        fairlyCommon: manifest.filter((m) => m.probability > 15 && m.probability <= 35).length,
        common: manifest.filter((m) => m.probability > 35 && m.probability <= 60).length,
        veryCommon: manifest.filter((m) => m.probability > 60 && m.probability <= 80).length,
        extremelyCommon: manifest.filter((m) => m.probability > 80).length,
      },
      sampleAnimals: manifest
        .filter((m) => m.probability > 0)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 15)
        .map((m) => `${m.name} (${m.probability}%)`),
    });

    return {
      manifest,
      raw: parsed,
    };
  } catch (error) {
    log.error('regionalChallenge-service', 'Gemini API call failed', { error: error?.message, location });
    throw new Error(`Failed to generate probability manifest: ${error?.message}`);
  }
};

/**
 * Select daily challenge animals from the probability manifest.
 * 
 * Constraints:
 * - ALL animals must be >= 40% probability (easily spottable)
 * - 70% chance: Pick 3 animals from 50%+ pool (easy challenge)
 * - 30% chance: Pick 1 animal from 40-50% pool (harder challenge)
 * - Can pick same animal multiple times (shows as count: 2)
 */
export const selectDailyChallenges = (manifest) => {
  // Filter pools
  const moderateAnimals = manifest.filter((a) => a.probability >= 40 && a.probability < 50);
  const easyAnimals = manifest.filter((a) => a.probability >= 50);

  if (easyAnimals.length === 0 && moderateAnimals.length === 0) {
    log.warn('regionalChallenge-service', 'No animals with 40%+ probability for daily challenge');
    return [];
  }

  // 30% chance to include a moderate animal (if available)
  const useModerate = moderateAnimals.length > 0 && Math.random() < 0.3;

  if (useModerate) {
    // Pick just 1 moderate animal
    const shuffled = [...moderateAnimals].sort(() => Math.random() - 0.5);
    const selected = [{ name: shuffled[0].name, probability: shuffled[0].probability, count: 1 }];

    log.info('regionalChallenge-service', 'Daily challenges selected (moderate difficulty)', {
      count: 1,
      animals: selected.map((a) => `${a.name} (${a.probability}%)`),
    });

    return selected;
  }

  // Otherwise, weighted random selection from easy animals (50%+)
  const weightedPick = (pool) => {
    const totalWeight = pool.reduce((sum, a) => sum + a.probability, 0);
    let random = Math.random() * totalWeight;
    for (const animal of pool) {
      random -= animal.probability;
      if (random <= 0) return animal;
    }
    return pool[pool.length - 1];
  };

  // Pick 3 animals (may have duplicates)
  const picks = [];
  for (let i = 0; i < 3; i++) {
    picks.push(weightedPick(easyAnimals));
  }

  // Consolidate into counts
  const countMap = new Map();
  for (const pick of picks) {
    const existing = countMap.get(pick.name);
    if (existing) {
      existing.count += 1;
    } else {
      countMap.set(pick.name, { name: pick.name, probability: pick.probability, count: 1 });
    }
  }

  const selected = Array.from(countMap.values());

  log.info('regionalChallenge-service', 'Daily challenges selected', {
    count: selected.length,
    totalSpots: picks.length,
    animals: selected.map((a) => `${a.name} (${a.probability}%) x${a.count}`),
  });

  return selected;
};

/**
 * Select weekly challenge animals from the probability manifest.
 * 
 * Constraints:
 * - NO animals under 5% probability
 * - 20% chance: Include 1 very rare animal (5-10%) + max 2 common (50%+) = 3 animals
 * - 50% chance: Include 1-2 rare animals (11-49%) + 3-4 common = 4-6 animals
 * - 30% chance: Only common animals (50%+) = 5-7 animals
 * - Consolidate duplicates into count
 */
export const selectWeeklyChallenges = (manifest) => {
  // Pool tiers
  const veryRareAnimals = manifest.filter((a) => a.probability >= 5 && a.probability <= 10);
  const rareAnimals = manifest.filter((a) => a.probability > 10 && a.probability < 50);
  const commonAnimals = manifest.filter((a) => a.probability >= 50);

  if (commonAnimals.length === 0 && rareAnimals.length === 0 && veryRareAnimals.length === 0) {
    log.warn('regionalChallenge-service', 'No animals with 5%+ probability for weekly challenge');
    return [];
  }

  // Weighted random selection
  const weightedPick = (pool) => {
    if (pool.length === 0) return null;
    const totalWeight = pool.reduce((sum, a) => sum + a.probability, 0);
    let random = Math.random() * totalWeight;
    for (const animal of pool) {
      random -= animal.probability;
      if (random <= 0) return animal;
    }
    return pool[pool.length - 1];
  };

  const picks = [];
  const rand = Math.random();
  
  // 20% chance to include very rare animal (if available)
  if (veryRareAnimals.length > 0 && rand < 0.2) {
    // Pick 1 very rare animal
    const shuffledVeryRare = [...veryRareAnimals].sort(() => Math.random() - 0.5);
    picks.push(shuffledVeryRare[0]);
    
    // Pick MAX 2 common animals (50%+)
    if (commonAnimals.length > 0) {
      const commonCount = Math.min(2, commonAnimals.length);
      for (let i = 0; i < commonCount; i++) {
        picks.push(weightedPick(commonAnimals));
      }
    }
  } 
  // 50% chance to include rare animals (11-49%)
  else if (rareAnimals.length > 0 && rand < 0.7) {
    // Pick 1-2 rare animals
    const rareCount = rareAnimals.length > 1 && Math.random() < 0.5 ? 2 : 1;
    const shuffledRare = [...rareAnimals].sort(() => Math.random() - 0.5);
    for (let i = 0; i < rareCount; i++) {
      picks.push(shuffledRare[i]);
    }
    
    // Add 3-4 common picks
    const commonCount = 3 + (Math.random() > 0.5 ? 1 : 0);
    for (let i = 0; i < commonCount; i++) {
      picks.push(weightedPick(commonAnimals));
    }
  } 
  // 30% chance: Only common animals
  else {
    // Pick 5-7 common animals
    const totalPicks = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < totalPicks; i++) {
      picks.push(weightedPick(commonAnimals));
    }
  }

  // Consolidate into counts
  const countMap = new Map();
  for (const pick of picks) {
    if (!pick) continue;
    const existing = countMap.get(pick.name);
    if (existing) {
      existing.count += 1;
    } else {
      countMap.set(pick.name, { name: pick.name, probability: pick.probability, count: 1 });
    }
  }

  const selected = Array.from(countMap.values());

  log.info('regionalChallenge-service', 'Weekly challenges selected', {
    count: selected.length,
    totalSpots: picks.length,
    animals: selected.map((a) => `${a.name} (${a.probability}%) x${a.count}`),
  });

  return selected;
};

/**
 * Main service function: Get or generate regional challenges.
 * 
 * NEW WORKFLOW:
 * 1. Reverse geocode coordinates to get city/state
 * 2. Check if a Region document exists (by key OR proximity)
 * 3. If exists: Load the stored animal_manifest
 * 4. If new region: Call AI ONCE to generate probability manifest, save to DB
 * 5. Use local code to select Daily/Weekly challenges from manifest
 * 6. Return the selected challenges
 */
export const getOrGenerateRegionalChallenge = async (lat, lng) => {
  // Step 1: Reverse geocode
  const location = await reverseGeocode(lat, lng);
  const { city, state } = location;
  const regionKey = generateRegionKey(city, state);
  const locationString = `${city}, ${state}`;

  log.info('regionalChallenge-service', 'Processing challenge request', { regionKey, city, state, lat, lng });

  // Step 2: Check for existing region (by key first, then by proximity)
  let region = await RegionalChallenge.findOne({ region_key: regionKey });

  if (!region) {
    // Try to find a nearby region
    region = await findNearbyRegion(lat, lng);
    if (region) {
      log.info('regionalChallenge-service', 'Using nearby region', { 
        requested: regionKey, 
        using: region.region_key,
      });
    }
  }

  // Step 3: If no region exists, generate probability manifest with AI
  if (!region) {
    log.info('regionalChallenge-service', 'Creating new region with AI-generated manifest', { regionKey });

    const { manifest, raw } = await generateProbabilityManifest(locationString, lat, lng);

    region = await RegionalChallenge.create({
      region_key: regionKey,
      location: locationString,
      center: {
        latitude: lat,
        longitude: lng,
      },
      animal_manifest: manifest,
      raw_response: raw,
    });

    log.info('regionalChallenge-service', 'New region created', { regionKey, id: region._id });
  }

  // Step 4: Select challenges using local code logic (NO AI)
  const daily = selectDailyChallenges(region.animal_manifest);
  const weekly = selectWeeklyChallenges(region.animal_manifest);

  log.info('regionalChallenge-service', 'Challenges selected', { 
    regionKey,
    daily: daily.map((d) => d.name),
    weekly: weekly.map((w) => w.name),
  });

  return {
    cached: true, // Region manifest was cached (or just created)
    region,
    daily,
    weekly,
  };
};

/**
 * Force regenerate the probability manifest for a region.
 * Deletes the existing region and creates a new one with fresh AI data.
 */
export const regenerateRegionManifest = async (lat, lng) => {
  const location = await reverseGeocode(lat, lng);
  const { city, state } = location;
  const regionKey = generateRegionKey(city, state);
  const locationString = `${city}, ${state}`;

  // Delete existing region
  await RegionalChallenge.deleteOne({ region_key: regionKey });

  // Generate new manifest
  const { manifest, raw } = await generateProbabilityManifest(locationString, lat, lng);

  const region = await RegionalChallenge.create({
    region_key: regionKey,
    location: locationString,
    center: {
      latitude: lat,
      longitude: lng,
    },
    animal_manifest: manifest,
    raw_response: raw,
  });

  // Select challenges
  const daily = selectDailyChallenges(region.animal_manifest);
  const weekly = selectWeeklyChallenges(region.animal_manifest);

  return {
    region,
    daily,
    weekly,
  };
};

/**
 * Get or create user-specific challenges.
 * 
 * This is the main entry point for users. It:
 * 1. Checks if the user has valid (non-expired) challenges
 * 2. If expired or missing, generates new challenges from the regional manifest
 * 3. Persists challenges with expiration dates
 * 
 * @param {string} userId - The user's ID
 * @param {number} lat - User's latitude
 * @param {number} lng - User's longitude
 */
export const getOrCreateUserChallenges = async (userId, lat, lng) => {
  const now = new Date();

  // First, get or generate the regional manifest
  const location = await reverseGeocode(lat, lng);
  const { city, state } = location;
  const regionKey = generateRegionKey(city, state);
  const locationString = `${city}, ${state}`;

  log.info('regionalChallenge-service', 'Getting user challenges', { userId, regionKey });

  // Check for existing user challenge document
  let userChallenge = await UserChallenge.findOne({ user_id: userId, region_key: regionKey });

  // Check if we need to regenerate daily and/or weekly
  let needNewDaily = !userChallenge || !userChallenge.daily?.expires_at || userChallenge.daily.expires_at < now;
  let needNewWeekly = !userChallenge || !userChallenge.weekly?.expires_at || userChallenge.weekly.expires_at < now;

  // If both are still valid, return existing challenges
  if (!needNewDaily && !needNewWeekly) {
    log.info('regionalChallenge-service', 'Returning existing user challenges', { 
      userId, 
      regionKey,
      dailyExpires: userChallenge.daily.expires_at,
      weeklyExpires: userChallenge.weekly.expires_at,
    });

    return {
      cached: true,
      userChallenge,
      location: locationString,
    };
  }

  // Get the regional manifest (will generate if needed)
  const { region } = await getOrGenerateRegionalChallenge(lat, lng);

  // Calculate expiration dates
  const dailyExpires = new Date(now);
  dailyExpires.setHours(23, 59, 59, 999); // End of today

  const weeklyExpires = new Date(now);
  weeklyExpires.setDate(weeklyExpires.getDate() + (7 - weeklyExpires.getDay())); // Next Sunday
  weeklyExpires.setHours(23, 59, 59, 999);

  // Build updated challenges
  const updateData = {
    user_id: userId,
    region_id: region._id,
    region_key: regionKey,
    location: locationString,
  };

  if (needNewDaily) {
    const daily = selectDailyChallenges(region.animal_manifest);
    const dailyXP = calculateChallengeXP(daily);
    updateData.daily = {
      animals: daily.map((a) => ({ name: a.name, probability: a.probability, count: a.count, progress: 0 })),
      expires_at: dailyExpires,
      completed: false,
      xp_potential: dailyXP,
    };
    log.info('regionalChallenge-service', 'Generated new daily challenge', { 
      userId, 
      animals: daily.map((a) => a.name),
      expires: dailyExpires,
      xpPotential: dailyXP,
    });
  }

  if (needNewWeekly) {
    const weekly = selectWeeklyChallenges(region.animal_manifest);
    const weeklyXP = calculateChallengeXP(weekly);
    updateData.weekly = {
      animals: weekly.map((a) => ({ name: a.name, probability: a.probability, count: a.count, progress: 0 })),
      expires_at: weeklyExpires,
      completed: false,
      xp_potential: weeklyXP,
    };
    log.info('regionalChallenge-service', 'Generated new weekly challenge', { 
      userId, 
      animals: weekly.map((a) => a.name),
      expires: weeklyExpires,
      xpPotential: weeklyXP,
    });
  }

  // Upsert the user challenge
  userChallenge = await UserChallenge.findOneAndUpdate(
    { user_id: userId, region_key: regionKey },
    { $set: updateData },
    { upsert: true, new: true }
  );

  return {
    cached: false,
    userChallenge,
    location: locationString,
  };
};

/**
 * Update challenge progress when a user spots an animal.
 * 
 * @param {string} userId - The user's ID
 * @param {string} animalName - The name of the spotted animal
 * @returns {Object} - Updated challenge status
 */
export const updateChallengeProgress = async (userId, animalName) => {
  const now = new Date();
  
  // Find active user challenges
  const userChallenge = await UserChallenge.findOne({
    user_id: userId,
    $or: [
      { 'daily.expires_at': { $gt: now } },
      { 'weekly.expires_at': { $gt: now } },
    ],
  });

  if (!userChallenge) {
    log.info('regionalChallenge-service', 'No active challenges for user', { userId, animalName });
    return { updated: false, reason: 'no_active_challenges' };
  }

  const updates = [];
  let dailyMatch = false;
  let weeklyMatch = false;

  // Check daily challenge
  if (userChallenge.daily?.expires_at > now && !userChallenge.daily.completed) {
    const animalIndex = userChallenge.daily.animals.findIndex(
      (a) => a.name.toLowerCase() === animalName.toLowerCase() && a.progress < a.count
    );
    
    if (animalIndex !== -1) {
      dailyMatch = true;
      userChallenge.daily.animals[animalIndex].progress += 1;
      
      // Check if daily challenge is now complete
      const allComplete = userChallenge.daily.animals.every((a) => a.progress >= a.count);
      if (allComplete) {
        userChallenge.daily.completed = true;
        userChallenge.daily.completed_at = now;
        
        // Award XP for daily challenge completion
        try {
          const xpAmount = userChallenge.daily.xp_potential || calculateChallengeXP(userChallenge.daily.animals);
          const xpResult = await experienceService.awardXP(userId, xpAmount, 'Daily Challenge Completed');
          userChallenge.daily.xp_awarded = xpAmount;
          log.info('regionalChallenge-service', 'Daily challenge XP awarded', {
            userId,
            xpAmount,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.newLevel,
          });
        } catch (xpError) {
          log.warn('regionalChallenge-service', 'Failed to award daily challenge XP', {
            userId,
            error: xpError.message,
          });
        }
        
        // Increment challenges completed counter and check badges
        try {
          await User.findByIdAndUpdate(userId, { $inc: { challengesCompleted: 1 } });
          const newBadges = await badgeService.checkBadgesAfterChallenge(userId);
          if (newBadges.length > 0) {
            log.info('regionalChallenge-service', 'Badges awarded for daily challenge', {
              userId,
              badges: newBadges.map(b => b.name),
            });
          }
        } catch (badgeError) {
          log.warn('regionalChallenge-service', 'Failed to check badges for challenge', {
            userId,
            error: badgeError.message,
          });
        }
      }
      
      log.info('regionalChallenge-service', 'Daily challenge progress updated', {
        userId,
        animal: animalName,
        newProgress: userChallenge.daily.animals[animalIndex].progress,
        required: userChallenge.daily.animals[animalIndex].count,
        challengeComplete: allComplete,
      });
    }
  }

  // Check weekly challenge
  if (userChallenge.weekly?.expires_at > now && !userChallenge.weekly.completed) {
    const animalIndex = userChallenge.weekly.animals.findIndex(
      (a) => a.name.toLowerCase() === animalName.toLowerCase() && a.progress < a.count
    );
    
    if (animalIndex !== -1) {
      weeklyMatch = true;
      userChallenge.weekly.animals[animalIndex].progress += 1;
      
      // Check if weekly challenge is now complete
      const allComplete = userChallenge.weekly.animals.every((a) => a.progress >= a.count);
      if (allComplete) {
        userChallenge.weekly.completed = true;
        userChallenge.weekly.completed_at = now;
        
        // Award XP for weekly challenge completion
        try {
          const xpAmount = userChallenge.weekly.xp_potential || calculateChallengeXP(userChallenge.weekly.animals);
          const xpResult = await experienceService.awardXP(userId, xpAmount, 'Weekly Challenge Completed');
          userChallenge.weekly.xp_awarded = xpAmount;
          log.info('regionalChallenge-service', 'Weekly challenge XP awarded', {
            userId,
            xpAmount,
            leveledUp: xpResult.leveledUp,
            newLevel: xpResult.newLevel,
          });
        } catch (xpError) {
          log.warn('regionalChallenge-service', 'Failed to award weekly challenge XP', {
            userId,
            error: xpError.message,
          });
        }
        
        // Increment challenges completed counter and check badges
        try {
          await User.findByIdAndUpdate(userId, { $inc: { challengesCompleted: 1 } });
          const newBadges = await badgeService.checkBadgesAfterChallenge(userId);
          if (newBadges.length > 0) {
            log.info('regionalChallenge-service', 'Badges awarded for weekly challenge', {
              userId,
              badges: newBadges.map(b => b.name),
            });
          }
        } catch (badgeError) {
          log.warn('regionalChallenge-service', 'Failed to check badges for challenge', {
            userId,
            error: badgeError.message,
          });
        }
      }
      
      log.info('regionalChallenge-service', 'Weekly challenge progress updated', {
        userId,
        animal: animalName,
        newProgress: userChallenge.weekly.animals[animalIndex].progress,
        required: userChallenge.weekly.animals[animalIndex].count,
        challengeComplete: allComplete,
      });
    }
  }

  if (dailyMatch || weeklyMatch) {
    await userChallenge.save();
    return {
      updated: true,
      dailyMatch,
      weeklyMatch,
      dailyComplete: userChallenge.daily?.completed || false,
      weeklyComplete: userChallenge.weekly?.completed || false,
    };
  }

  return { updated: false, reason: 'animal_not_in_challenge' };
};

/**
 * Get a user's current active challenges.
 * 
 * @param {string} userId - The user's ID
 */
export const getUserActiveChallenges = async (userId) => {
  const now = new Date();
  
  const userChallenge = await UserChallenge.findOne({
    user_id: userId,
    $or: [
      { 'daily.expires_at': { $gt: now } },
      { 'weekly.expires_at': { $gt: now } },
    ],
  });

  if (!userChallenge) {
    return null;
  }

  return {
    region_key: userChallenge.region_key,
    location: userChallenge.location,
    daily: userChallenge.daily?.expires_at > now ? {
      animals: userChallenge.daily.animals,
      expires_at: userChallenge.daily.expires_at,
      completed: userChallenge.daily.completed,
    } : null,
    weekly: userChallenge.weekly?.expires_at > now ? {
      animals: userChallenge.weekly.animals,
      expires_at: userChallenge.weekly.expires_at,
      completed: userChallenge.weekly.completed,
    } : null,
  };
};

export const regionalChallengeService = {
  reverseGeocode,
  generateRegionKey,
  findNearbyRegion,
  generateProbabilityManifest,
  selectDailyChallenges,
  selectWeeklyChallenges,
  getOrGenerateRegionalChallenge,
  regenerateRegionManifest,
  getOrCreateUserChallenges,
  updateChallengeProgress,
  getUserActiveChallenges,
};
