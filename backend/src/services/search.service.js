import { Animal } from '../models/animal.model.js';
import { Sighting } from '../models/sighting.model.js';
import { User } from '../models/user.model.js';

/**
 * Search across users, animals, and sightings
 * @param {string} query - Search query
 * @param {string} type - 'all' | 'users' | 'animals' | 'sightings'
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 */
const search = async (query, type = 'all', page = 1, pageSize = 20) => {
  const regex = new RegExp(query, 'i');
  const skip = (page - 1) * pageSize;
  
  const results = {
    users: [],
    animals: [],
    sightings: [],
  };

  // Search users
  if (type === 'all' || type === 'users') {
    results.users = await User.find({
      $or: [
        { username: regex },
        { bio: regex },
      ],
    })
      .select('username profilePictureUrl bio experiencePoints')
      .limit(type === 'users' ? pageSize : 10)
      .skip(type === 'users' ? skip : 0)
      .lean();
  }

  // Search animals
  if (type === 'all' || type === 'animals') {
    results.animals = await Animal.find({
      $or: [
        { commonName: regex },
        { scientificName: regex },
        { category: regex },
        { description: regex },
      ],
    })
      .select('commonName scientificName category rarityLevel imageUrls')
      .limit(type === 'animals' ? pageSize : 10)
      .skip(type === 'animals' ? skip : 0)
      .lean();
  }

  // Search sightings
  if (type === 'all' || type === 'sightings') {
    // First, find animals that match the search
    const matchingAnimals = await Animal.find({
      $or: [
        { commonName: regex },
        { scientificName: regex },
      ],
    })
      .select('_id')
      .lean();
    
    const matchingAnimalIds = matchingAnimals.map(a => a._id);
    
    // Debug logging
    console.log(`[SEARCH DEBUG] Query: "${query}", Type: "${type}", Page: ${page}`);
    console.log(`[SEARCH DEBUG] Found ${matchingAnimalIds.length} matching animals`);
    
    // Build query with all possible search fields
    const sightingQuery = {
      isPrivate: { $ne: true },
      $or: [
        { caption: regex },
        { aiIdentification: regex },
        { 'identification.commonName': regex },
        { 'identification.scientificName': regex },
      ],
    };
    
    // Add animal ID search if we found matching animals
    if (matchingAnimalIds.length > 0) {
      sightingQuery.$or.push({ animalId: { $in: matchingAnimalIds } });
    }
    
    console.log('[SEARCH DEBUG] Sighting query:', JSON.stringify(sightingQuery, null, 2));
    
    results.sightings = await Sighting.find(sightingQuery)
      .select('caption mediaUrls aiIdentification user likes comments createdAt animalId')
      .populate('user', 'username profilePictureUrl')
      .populate('animalId', 'commonName scientificName')
      .sort({ createdAt: -1 })
      .limit(type === 'sightings' ? pageSize : 10)
      .skip(type === 'sightings' ? skip : 0)
      .lean();
      
    console.log(`[SEARCH DEBUG] Found ${results.sightings.length} sightings`);
    if (results.sightings.length > 0) {
      console.log('[SEARCH DEBUG] First 3 sightings:', results.sightings.slice(0, 3).map(s => ({
        caption: s.caption,
        aiIdentification: s.aiIdentification,
        animalId: s.animalId?.commonName || s.animalId,
        'identification.commonName': s.identification?.commonName
      })));
    }
  }

  return results;
};

/**
 * Get trending search terms (placeholder - could be enhanced with actual tracking)
 */
const getTrendingSearches = async () => {
  // For now, return popular animal categories as suggestions
  const popularAnimals = await Animal.find()
    .select('commonName')
    .sort({ 'stats.sightingsCount': -1 })
    .limit(10)
    .lean();

  return popularAnimals.map((a) => a.commonName);
};

export const searchService = {
  search,
  getTrendingSearches,
};
