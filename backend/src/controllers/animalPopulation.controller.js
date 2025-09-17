import { Animal } from '../models/animal.model.js';

/**
 * Populate animals in the database
 * POST /api/v1/admins/populate-animals
 */
export const populateAnimals = async (req, res) => {
  try {
    const { animals } = req.body;

    if (!animals || !Array.isArray(animals)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid animals data. Expected an array of animals.' 
      });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each animal
    for (const animalData of animals) {
      try {
        const result = await Animal.updateOne(
          { commonName: animalData.commonName },
          { 
            $set: animalData,  // Update all fields with new data
            $setOnInsert: { createdAt: new Date() }  // Only set createdAt if it's a new document
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          addedCount++;
        } else if (result.modifiedCount > 0) {
          updatedCount++;
        } else {
          skippedCount++; // No changes were made
        }
      } catch (error) {
        console.error(`Error processing animal ${animalData.commonName}:`, error);
        skippedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Animals processed successfully',
      data: {
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
        total: animals.length
      }
    });

  } catch (error) {
    console.error('Error populating animals:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
};

/**
 * Get animal statistics
 * GET /api/v1/admins/animal-stats
 */
export const getAnimalStats = async (req, res) => {
  try {
    const totalCount = await Animal.countDocuments();
    const rarityStats = await Animal.aggregate([
      {
        $group: {
          _id: '$rarityLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAnimals: totalCount,
        rarityBreakdown: rarityStats
      }
    });

  } catch (error) {
    console.error('Error getting animal stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
};