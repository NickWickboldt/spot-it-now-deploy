import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Define the schema for the User model
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    profilePictureUrl: {
      type: String, 
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    experiencePoints: {
      type: Number,
      default: 0,
    },
    authProvider: {
      type: String,
      enum: ['google', 'apple', 'email'],
      default: 'email',
    },
    providerId: {
      type: String,
    },
    refreshToken: {
        type: String,
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Mongoose "pre-save hook" to hash passwords before saving.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * Mongoose method to check if the provided password is correct.
 */
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

/**
 * Mongoose method to generate a short-lived JSON Web Token (JWT) for access.
 * This token is used to authenticate the user for most API requests.
 */
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

/**
 * Mongoose method to generate a long-lived JSON Web Token (JWT) for refreshing access.
 * This token is used to get a new access token without forcing the user to log in again.
 */
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


// Create and export the User model
export const User = mongoose.model('User', userSchema);