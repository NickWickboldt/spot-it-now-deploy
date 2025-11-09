npm # User Onboarding Experience Implementation

## Overview
A comprehensive user onboarding flow has been implemented that guides new users through:
1. Account registration (username, email, password)
2. Profile setup (profile picture, bio)
3. Animal preferences selection (choose specific animals or see all)

After completion, users are automatically taken to the feed page.

---

## Backend Changes

### 1. User Model Update (`backend/src/models/user.model.js`)
Added two new fields to the User schema:

```javascript
animalPreferences: {
  // Array of animal IDs. Empty array means 'see all'
  type: [mongoose.Schema.Types.ObjectId],
  ref: 'Animal',
  default: [],
},
onboardingCompleted: {
  type: Boolean,
  default: false,
}
```

- **animalPreferences**: Stores array of selected animal IDs. Empty array indicates user wants to see all animals.
- **onboardingCompleted**: Boolean flag to track if user has completed onboarding.

### 2. User Service Enhancement (`backend/src/services/user.service.js`)
Added `completeOnboarding()` function that:
- Accepts onboarding data (username, bio, profilePictureUrl, animalPreferences)
- Updates user profile with provided details
- Sets `onboardingCompleted` to `true`
- Returns updated user object

### 3. User Controller Enhancement (`backend/src/controllers/user.controller.js`)
Added `completeOnboarding` controller function that:
- Validates incoming onboarding data
- Calls the user service to complete onboarding
- Returns success response with updated user

### 4. User Routes Update (`backend/src/routes/user.routes.js`)
Added new secured route:
```javascript
router.route('/onboarding').post(verifyJWT, completeOnboarding);
```

This endpoint is secured with JWT verification and can only be called by authenticated users.

---

## Frontend Changes

### 1. Auth API Enhancement (`frontend/api/auth.ts`)
Added three new API functions:

- **apiRegisterUser**: POST `/users/register` - Creates new user account
- **apiCompleteOnboarding**: POST `/users/onboarding` - Completes onboarding with profile and animal preferences
- **apiLogoutUser**: POST `/users/logout` - Logs out user

### 2. Auth Context Updates (`frontend/context/AuthContext.tsx`)
Enhanced AuthContext with:
- **register()** method: Handles user registration and automatically logs them in
- **completeOnboarding()** method: Saves onboarding data and updates user state
- Updated routing logic to check `onboardingCompleted` flag:
  - If not completed: Routes to onboarding flow
  - If completed: Routes to feed page

### 3. Onboarding Screens

#### A. Registration Screen (`frontend/app/(user)/onboarding_register.tsx`)
- Fields: username, email, password, confirm password
- Validation for:
  - All fields required
  - Passwords match
  - Password minimum 6 characters
- Uses `register()` from AuthContext
- Navigates to profile setup on success

#### B. Profile Setup Screen (`frontend/app/(user)/onboarding_profile.tsx`)
- Displays:
  - Profile picture upload (tap to change)
  - Bio input (optional, with character count)
- Picture picker using `expo-image-picker`
- Navigates to animal preferences on "Next" button
- Note: Username is set during registration (Step 1), not duplicated here to avoid confusion

#### C. Animal Preferences Screen (`frontend/app/(user)/onboarding_animals.tsx`)
- Search functionality for animals
- Toggle option: "Show All Animals" mode
- Visual feedback for selected animals (highlighted in green)
- Displays animal common name and category
- Animal list from backend API
- Completes onboarding and navigates to feed on "Complete Setup"

### 4. User Layout (`frontend/app/(user)/_layout.tsx`)
Created Stack navigator configuration for user group screens:
- onboarding_register
- onboarding_profile
- onboarding_animals
- edit_profile
- user_profile
- user_sighting
- challenges

### 5. Root Layout Updates (`frontend/app/_layout.tsx`)
Changed to reference `(user)` group instead of individual routes for cleaner organization.

### 6. Login Screen Enhancement (`frontend/app/index.tsx`)
- Added "Create account" link in footer
- Navigates to registration screen on press
- Routes to `/(user)/onboarding_register`

---

## User Flow

### New User Journey
```
1. Login Screen
   ↓ (Click "Create account")
2. Registration Screen
   ↓ (Enter credentials, register)
3. Profile Setup Screen
   ↓ (Add photo, write bio, click "Next")
4. Animal Preferences Screen
   ↓ (Select animals or "See All", click "Complete")
5. Feed Page (onboarding complete)
```

### Existing User with Incomplete Onboarding
```
1. Login with credentials
2. System detects onboardingCompleted = false
3. Automatically redirected to onboarding flow
```

### Completed User
```
1. Login with credentials
2. System detects onboardingCompleted = true
3. Redirected directly to feed page
```

---

## Data Model

### Animal Preferences Storage
- **Empty Array []**: User wants to see all animals
- **[id1, id2, ...]**: User wants to see only these specific animals

### Onboarding Completion
- All profile fields are optional except username
- Animal preferences can be empty (see all) or contain selected animal IDs
- Once `onboardingCompleted` is set to true, user bypasses onboarding on future logins

---

## Features

✅ User registration with validation
✅ Profile picture upload with image picker
✅ Optional bio field
✅ Animal search and selection
✅ "See All Animals" toggle mode
✅ Persistent user session storage
✅ Automatic routing based on onboarding status
✅ Error handling and user feedback
✅ Responsive UI design
✅ Animal preferences storage in database

---

## API Endpoints Summary

### POST `/users/register`
Creates new user account
- Body: `{ username, email, password }`
- Returns: `{ user, accessToken, refreshToken }`

### POST `/users/onboarding` (Secured)
Completes user onboarding
- Header: `Authorization: Bearer {token}`
- Body: `{ username, bio, profilePictureUrl, animalPreferences }`
- Returns: `{ updated user object }`

### POST `/users/logout` (Secured)
Logs out user
- Header: `Authorization: Bearer {token}`
- Returns: `{ success response }`

---

## Testing Recommendations

1. **Registration**: Test with valid/invalid credentials
2. **Profile Setup**: Verify image upload and bio character limit
3. **Animal Selection**: Test search, selection, and "See All" toggle
4. **Persistence**: Verify onboardingCompleted flag persists across sessions
5. **Routing**: Test incomplete onboarding redirect on login
6. **Error States**: Test network errors, validation failures

---

## Future Enhancements

- Profile picture upload to cloud storage (Cloudinary)
- Email verification
- Social login (Google, Apple)
- Onboarding progress indicators
- Skip option for certain steps
- Multi-language support
