import mongoose, { Schema } from 'mongoose';

/**
 * Defines the schema for the Admin model.
 * An Admin document represents a user who has been granted administrative privileges.
 * This creates a one-to-one relationship with the User model.
 */
const adminSchema = new Schema(
  {
    // This creates a direct link to a document in the 'User' collection.
    // It's like a foreign key in a relational database.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // This must match the model name we used in user.model.js
      required: true,
      unique: true, // Ensures one user can only have one admin entry
    },
    // Defines the level of access the admin has.
    // 1 could be a standard moderator, 2 could be a super-admin, etc.
    permissionLevel: {
      type: Number,
      required: true,
      default: 1, // Default to the lowest permission level
    },
  },
  // The `timestamps` option automatically adds `createdAt` and `updatedAt` fields
  {
    timestamps: true,
  }
);

// Create and export the Admin model
export const Admin = mongoose.model('Admin', adminSchema);