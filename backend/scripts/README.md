# Test Network Bootstrap Script

This script generates test data for the SpotItNow application by creating automated users and wildlife sighting posts with AI-generated images across major US metropolitan areas.

## Prerequisites

1. **Environment Setup**: Ensure you have a `.env` file in the `backend/` directory with the required configuration
2. **Gemini API Key**: You must have a valid Google Gemini API key for image generation
3. **Cloudinary Account**: Configured Cloudinary credentials for image storage
4. **Running Server**: The SpotItNow backend server should be running and accessible

## Required Environment Variables

Add these variables to your `backend/.env` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
# Alternative names also supported:
# GOOGLE_GENAI_API_KEY=your_key
# GOOGLE_API_KEY=your_key

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Optional overrides
GEMINI_IMAGE_MODEL=imagen-4.0-generate-001
TEST_NETWORK_USERS=5
TEST_NETWORK_POSTS=3
TEST_NETWORK_BASE_URL=http://localhost:8000/api/v1
TEST_NETWORK_POST_DELAY_MS=350
TEST_NETWORK_USER_RADIUS=75
TEST_NETWORK_CITY=Dallas, TX
CLOUDINARY_BASE_FOLDER=your_folder_name
```

## Usage

### Basic Usage

Run the script with default settings (5 users, 3 posts each, Dallas TX area):

```bash
cd backend
node scripts/bootstrap-test-network.js
```

### Custom Parameters

Specify the number of users and posts per user:

```bash
# Create 10 users with 5 posts each
node scripts/bootstrap-test-network.js --users 10 --posts 5

# Or use short flags
node scripts/bootstrap-test-network.js -u 10 -p 5

# Positional arguments also work
node scripts/bootstrap-test-network.js 10 5
```

### Custom City Selection

Choose from 50 major US metropolitan areas for test data generation:

```bash
# Use New York City as the anchor
node scripts/bootstrap-test-network.js --city "New York, NY"

# Use Los Angeles
node scripts/bootstrap-test-network.js -c "Los Angeles, CA"

# List all available cities
node scripts/bootstrap-test-network.js --city list
```

### Get Help

```bash
node scripts/bootstrap-test-network.js --help
```

This displays:
```
Usage: node scripts/bootstrap-test-network.js [options]

Options:
  -u, --users <number>       Number of automated users to generate (default: 5)
  -p, --posts <number>       Posts per user (default: 3)
  -b, --base-url <url>       API base URL (default: http://localhost:8000/api/v1)
  -c, --city <name>          Anchor city for generated accounts (default: Dallas, TX)
                             Use "--city list" to print available cities
  -h, --help                 Show this help message

Environment overrides:
  GEMINI_API_KEY                   Gemini API key (required)
  GEMINI_IMAGE_MODEL               Gemini model used for image generation
  TEST_NETWORK_USERS               Default user count
  TEST_NETWORK_POSTS               Default post count
  TEST_NETWORK_BASE_URL            Default API base URL
  TEST_NETWORK_POST_DELAY_MS       Delay between posts in ms (default 350)
  TEST_NETWORK_CITY                Default city anchor (matches --city)
```

## What the Script Does

1. **Creates Test Users**: Generates users with randomized usernames like `wildotter_a1b2c3`
2. **Sets User Locations**: Assigns users to neighborhoods within the selected metropolitan area
3. **Generates Wildlife Images**: Uses Google Gemini AI to create realistic wildlife photographs
4. **Creates Sighting Posts**: Posts the generated images with captions and location data
5. **Uploads to Cloudinary**: Stores all images in your Cloudinary account under the `test-network` folder

## Generated Content

The script creates posts featuring these wildlife species:
- Red Fox
- Great Horned Owl
- Snow Leopard
- Atlantic Puffin
- Monarch Butterfly
- African Elephant
- Humpback Whale
- Jaguar

Each post includes:
- AI-generated wildlife photograph
- Realistic caption describing the sighting
- Geographic coordinates within the selected metropolitan area
- Species identification (common and scientific names)

## Geographic Distribution

Test users are distributed across neighborhoods within the selected metropolitan area. For each city, the script creates 5 clusters:

- **Downtown**: Central business district (largest radius)
- **North**: Northern neighborhoods
- **South**: Southern neighborhoods  
- **East**: Eastern neighborhoods
- **West**: Western neighborhoods

### Supported Cities

The script supports 50 major US metropolitan areas including:

**Major Hubs (35km radius)**: New York, NY; Los Angeles, CA; Chicago, IL; Houston, TX; Phoenix, AZ; Philadelphia, PA; San Antonio, TX; San Diego, CA; Dallas, TX; Jacksonville, FL

**Regional Centers (32km radius)**: Fort Worth, TX; San Jose, CA; Austin, TX; Charlotte, NC; Columbus, OH; Indianapolis, IN; San Francisco, CA; Seattle, WA; Denver, CO; Oklahoma City, OK

**Mid-sized Cities (28km radius)**: Nashville, TN; Washington, DC; El Paso, TX; Las Vegas, NV; Boston, MA; Detroit, MI; Louisville, KY; Portland, OR; Memphis, TN; Baltimore, MD; Milwaukee, WI; Albuquerque, NM; Tucson, AZ; Fresno, CA; Sacramento, CA

**Smaller Metros (24km radius)**: Atlanta, GA; Mesa, AZ; Kansas City, MO; Raleigh, NC; Colorado Springs, CO; Omaha, NE; Miami, FL; Virginia Beach, VA; Long Beach, CA; Oakland, CA; Minneapolis, MN; Bakersfield, CA; Tulsa, OK; Tampa, FL; Arlington, TX

Use `node scripts/bootstrap-test-network.js --city list` to see all available cities.

## Performance Notes

- **Rate Limiting**: The script includes a 350ms delay between posts to avoid overwhelming the server
- **Image Generation**: Each image takes 2-5 seconds to generate via Gemini AI
- **Error Handling**: The script continues if individual posts fail, logging errors for debugging
- **Graceful Shutdown**: Press Ctrl+C to stop the script after the current operation completes

## Troubleshooting

### Common Issues

1. **Missing Gemini API Key**: Ensure `GEMINI_API_KEY` is set in your `.env` file
2. **Server Not Running**: Start your SpotItNow backend server before running the script
3. **Cloudinary Errors**: Verify your Cloudinary credentials are correct
4. **Network Timeouts**: Check your internet connection for AI image generation
5. **Invalid City**: Use `node scripts/bootstrap-test-network.js --city list` to see valid city names

### Debug Tips

- Check the server logs for API errors
- Verify environment variables with `node -e "console.log(process.env.GEMINI_API_KEY)"`
- Test Cloudinary connection separately if uploads fail
- Use fewer users/posts for initial testing

## Cleanup

To remove test data:
1. Delete test users through the admin interface
2. Remove images from Cloudinary's `test-network` folder
3. Clear any test data from your database

## Examples

```bash
# Quick test with minimal data
node scripts/bootstrap-test-network.js -u 2 -p 1

# Large dataset for load testing
node scripts/bootstrap-test-network.js -u 50 -p 10

# Custom server with moderate data
node scripts/bootstrap-test-network.js -u 15 -p 4 -b http://staging.myapp.com/api/v1

# Generate data for different cities
node scripts/bootstrap-test-network.js -u 10 -p 3 -c "New York, NY"
node scripts/bootstrap-test-network.js -u 10 -p 3 -c "Los Angeles, CA"
node scripts/bootstrap-test-network.js -u 10 -p 3 -c "Chicago, IL"

# List all available cities
node scripts/bootstrap-test-network.js --city list
```