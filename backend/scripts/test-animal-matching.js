// ==================================================================
// File: scripts/test-animal-matching.js
// ==================================================================
import { connectDB } from '../src/config/db.config.js';
import { animalService } from '../src/services/animal.service.js';

const testAnimalMatching = async () => {
  try {
    await connectDB();
    console.log('🔗 Connected to database');

    // Test cases for animal matching
    const testCases = [
      { commonName: 'Lion', scientificName: 'Panthera leo' },
      { commonName: 'lion', scientificName: null }, // case insensitive
      { commonName: 'African Lion', scientificName: null }, // partial match
      { commonName: null, scientificName: '(Panthera leo)' }, // with parentheses
      { commonName: 'Eagle', scientificName: null },
      { commonName: 'Nonexistent Animal', scientificName: null },
    ];

    console.log('🧪 Testing animal matching...\n');

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.commonName || 'N/A'} (${testCase.scientificName || 'N/A'})`);
      
      const result = await animalService.findAnimalByIdentification(testCase);
      
      if (result) {
        console.log(`✅ Found: ${result.commonName} (${result.scientificName}) - ID: ${result._id}`);
      } else {
        console.log('❌ No match found');
      }
      console.log('---');
    }

    console.log('✨ Animal matching test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing animal matching:', error);
    process.exit(1);
  }
};

testAnimalMatching();