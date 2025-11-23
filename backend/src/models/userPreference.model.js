import mongoose, { Schema } from 'mongoose';

/**
 * User Preference Model
 * Tracks user interactions and preferences for personalized content algorithm
 */
const userPreferenceSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    
    // Animal preferences (which animals user engages with most)
    animalPreferences: [
      {
        animal: { type: Schema.Types.ObjectId, ref: 'Animal' },
        score: { type: Number, default: 0 }, // Accumulated engagement score
        lastInteraction: { type: Date, default: Date.now },
      }
    ],
    
    // Category preferences (Big Cats, Birds, Marine, etc.)
    categoryPreferences: {
      type: Map,
      of: Number, // category name -> score
      default: {},
    },
    
    // User interaction preferences (whose content they engage with)
    userInteractions: [
      {
        targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, default: 0 },
        lastInteraction: { type: Date, default: Date.now },
      }
    ],
    
    // Interaction history (for decay calculation)
    interactionHistory: [
      {
        sighting: { type: Schema.Types.ObjectId, ref: 'Sighting' },
        interactionType: {
          type: String,
          enum: ['view', 'like', 'comment'],
          required: true,
        },
        score: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      }
    ],
    
    // Metadata
    totalInteractions: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    algorithmVersion: { type: String, default: '1.0' },
    
    // Flag to disable algorithm (show chronological instead)
    algorithmEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying (user index already created by unique: true)
userPreferenceSchema.index({ 'animalPreferences.animal': 1 });
userPreferenceSchema.index({ 'userInteractions.targetUser': 1 });
userPreferenceSchema.index({ lastUpdated: -1 });

// Method to update animal preference
userPreferenceSchema.methods.updateAnimalPreference = function(animalId, score) {
  const existing = this.animalPreferences.find(
    p => p.animal.toString() === animalId.toString()
  );
  
  if (existing) {
    existing.score += score;
    existing.lastInteraction = new Date();
  } else {
    this.animalPreferences.push({
      animal: animalId,
      score,
      lastInteraction: new Date(),
    });
  }
};

// Method to update category preference
userPreferenceSchema.methods.updateCategoryPreference = function(category, score) {
  const currentScore = this.categoryPreferences.get(category) || 0;
  this.categoryPreferences.set(category, currentScore + score);
};

// Method to update user interaction
userPreferenceSchema.methods.updateUserInteraction = function(targetUserId, score) {
  const existing = this.userInteractions.find(
    i => i.targetUser.toString() === targetUserId.toString()
  );
  
  if (existing) {
    existing.score += score;
    existing.lastInteraction = new Date();
  } else {
    this.userInteractions.push({
      targetUser: targetUserId,
      score,
      lastInteraction: new Date(),
    });
  }
};

// Method to add interaction to history
userPreferenceSchema.methods.addInteraction = function(sightingId, interactionType, score) {
  this.interactionHistory.push({
    sighting: sightingId,
    interactionType,
    score,
    timestamp: new Date(),
  });
  
  // Keep only last 1000 interactions
  if (this.interactionHistory.length > 1000) {
    this.interactionHistory = this.interactionHistory.slice(-1000);
  }
  
  this.totalInteractions += 1;
  this.lastUpdated = new Date();
};

// Method to get top animals
userPreferenceSchema.methods.getTopAnimals = function(limit = 10) {
  return this.animalPreferences
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(p => ({ animal: p.animal, score: p.score }));
};

// Method to get top categories
userPreferenceSchema.methods.getTopCategories = function(limit = 5) {
  const entries = Array.from(this.categoryPreferences.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  
  return entries.map(([category, score]) => ({ category, score }));
};

// Method to reset algorithm
userPreferenceSchema.methods.resetAlgorithm = function() {
  this.animalPreferences = [];
  this.categoryPreferences = new Map();
  this.userInteractions = [];
  this.interactionHistory = [];
  this.totalInteractions = 0;
  this.lastUpdated = new Date();
};

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

export default UserPreference;
