import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the UserDiscovery model.
 * This stores which animals a user has discovered (like a Pokédex).
 */
const userDiscoverySchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One discovery record per user
      index: true, // Fast lookups by user
    },
    // Simple array of discovered animal IDs for fast checking
    discoveredAnimals: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal'
    }],
    // Detailed discovery information
    animalDiscoveries: [{
      animal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animal',
        required: true
      },
      discoveredAt: {
        type: Date,
        default: Date.now
      },
      firstSighting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sighting'
      },
      verifiedByAI: {
        type: Boolean,
        default: false,
        description: 'Whether this discovery was verified by AI identification'
      },
      verifiedByUser: {
        type: Boolean,
        default: false,
        description: 'Whether this discovery was verified by a user'
      },
      verifiedByCommunity: {
        type: Boolean,
        default: false,
        description: 'Whether this discovery was verified by the community'
      }
    }],
    // Cached statistics for quick access
    stats: {
      totalDiscovered: {
        type: Number,
        default: 0
      },
      commonDiscovered: {
        type: Number,
        default: 0
      },
      uncommonDiscovered: {
        type: Number,
        default: 0
      },
      rareDiscovered: {
        type: Number,
        default: 0
      },
      legendaryDiscovered: {
        type: Number,
        default: 0
      },
      categoriesCompleted: [{
        category: String,
        total: Number,
        discovered: Number,
        completedAt: Date
      }]
    }
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
userDiscoverySchema.index({ user: 1, 'discoveredAnimals': 1 });

// Virtual for completion percentage
userDiscoverySchema.virtual('completionPercentage').get(function() {
  // This would need total animal count from Animal model
  return 0; // Placeholder
});

// Method to check if user has discovered an animal
userDiscoverySchema.methods.hasDiscovered = function(animalId) {
  return this.discoveredAnimals.includes(animalId);
};

// Method to add a new discovery
userDiscoverySchema.methods.addDiscovery = async function(animalId, sightingId, verifiedBy = 'AI') {
  if (this.hasDiscovered(animalId)) {
    // If already discovered, just update verification status
    const existingDiscovery = this.animalDiscoveries.find(
      discovery => discovery.animal.toString() === animalId.toString()
    );
    
    if (existingDiscovery) {
      // Update verification flags based on the new verification
      if (verifiedBy === 'AI') {
        existingDiscovery.verifiedByAI = true;
      } else if (verifiedBy === 'USER') {
        existingDiscovery.verifiedByUser = true;
      } else if (verifiedBy === 'COMMUNITY') {
        existingDiscovery.verifiedByCommunity = true;
      }
      
      await this.save();
      return false; // Not a new discovery, but updated verification
    }
  }

  // Add to simple array
  this.discoveredAnimals.push(animalId);
  
  // Create verification flags based on initial verification type
  const verificationFlags = {
    verifiedByAI: verifiedBy === 'AI',
    verifiedByUser: verifiedBy === 'USER',
    verifiedByCommunity: verifiedBy === 'COMMUNITY'
  };
  
  // Add detailed record
  this.animalDiscoveries.push({
    animal: animalId,
    discoveredAt: new Date(),
    firstSighting: sightingId,
    ...verificationFlags
  });

  // Update stats
  this.stats.totalDiscovered = this.discoveredAnimals.length;

  await this.save();
  return true;
};

// Method to update verification status for an existing discovery
userDiscoverySchema.methods.updateVerification = async function(animalId, verifiedBy) {
  const existingDiscovery = this.animalDiscoveries.find(
    discovery => discovery.animal.toString() === animalId.toString()
  );
  
  if (!existingDiscovery) {
    return false; // Discovery doesn't exist
  }
  
  // Update verification flags
  if (verifiedBy === 'AI') {
    existingDiscovery.verifiedByAI = true;
  } else if (verifiedBy === 'USER') {
    existingDiscovery.verifiedByUser = true;
  } else if (verifiedBy === 'COMMUNITY') {
    existingDiscovery.verifiedByCommunity = true;
  }
  
  await this.save();
  return true;
};

export const UserDiscovery = mongoose.model('UserDiscovery', userDiscoverySchema);