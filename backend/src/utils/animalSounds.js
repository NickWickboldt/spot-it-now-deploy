/**
 * Animal Sounds Utility
 * 
 * A fun collection of 50 animal sound verbs for notification messages.
 * Used to make messaging notifications playful and engaging.
 * 
 * Usage: "Sam chirped at you" or "Nick bleated at you"
 */

export const ANIMAL_SOUNDS = [
  // Mammals - Common
  { sound: 'roared at', animal: 'lion' },
  { sound: 'howled at', animal: 'wolf' },
  { sound: 'barked at', animal: 'dog' },
  { sound: 'meowed at', animal: 'cat' },
  { sound: 'growled at', animal: 'bear' },
  { sound: 'trumpeted', animal: 'elephant' },
  { sound: 'chattered at', animal: 'monkey' },
  { sound: 'squeaked at', animal: 'mouse' },
  { sound: 'chittered at', animal: 'squirrel' },
  { sound: 'snorted at', animal: 'pig' },
  
  // Farm Animals
  { sound: 'mooed at', animal: 'cow' },
  { sound: 'bleated at', animal: 'sheep' },
  { sound: 'neighed at', animal: 'horse' },
  { sound: 'brayed at', animal: 'donkey' },
  { sound: 'oinked at', animal: 'pig' },
  { sound: 'clucked at', animal: 'chicken' },
  { sound: 'gobbled at', animal: 'turkey' },
  
  // Birds
  { sound: 'chirped at', animal: 'bird' },
  { sound: 'tweeted at', animal: 'sparrow' },
  { sound: 'hooted at', animal: 'owl' },
  { sound: 'cawed at', animal: 'crow' },
  { sound: 'quacked at', animal: 'duck' },
  { sound: 'honked at', animal: 'goose' },
  { sound: 'cooed at', animal: 'dove' },
  { sound: 'crowed at', animal: 'rooster' },
  { sound: 'squawked at', animal: 'parrot' },
  { sound: 'warbled at', animal: 'canary' },
  { sound: 'screeched at', animal: 'eagle' },
  { sound: 'trilled at', animal: 'nightingale' },
  
  // Reptiles & Amphibians
  { sound: 'hissed at', animal: 'snake' },
  { sound: 'croaked at', animal: 'frog' },
  { sound: 'bellowed at', animal: 'alligator' },
  { sound: 'chirruped at', animal: 'gecko' },
  
  // Marine Animals
  { sound: 'clicked at', animal: 'dolphin' },
  { sound: 'sang to', animal: 'whale' },
  { sound: 'barked at', animal: 'seal' },
  { sound: 'bubbled at', animal: 'fish' },
  
  // Insects
  { sound: 'buzzed at', animal: 'bee' },
  { sound: 'chirped at', animal: 'cricket' },
  { sound: 'hummed at', animal: 'hummingbird' },
  
  // Wild Animals
  { sound: 'yapped at', animal: 'fox' },
  { sound: 'chuffed at', animal: 'tiger' },
  { sound: 'rumbled at', animal: 'gorilla' },
  { sound: 'whooped at', animal: 'gibbon' },
  { sound: 'snuffled at', animal: 'hedgehog' },
  { sound: 'purred at', animal: 'cheetah' },
  { sound: 'yowled at', animal: 'bobcat' },
  { sound: 'trumpeted', animal: 'elk' },
  { sound: 'bugled at', animal: 'deer' },
  { sound: 'grunted at', animal: 'wild boar' },
];

/**
 * Get a random animal sound verb for notification messages
 * @returns {Object} { sound: string, animal: string }
 */
export const getRandomAnimalSound = () => {
  const randomIndex = Math.floor(Math.random() * ANIMAL_SOUNDS.length);
  return ANIMAL_SOUNDS[randomIndex];
};

/**
 * Get just the sound verb (e.g., "chirped at")
 * @returns {string}
 */
export const getRandomSoundVerb = () => {
  return getRandomAnimalSound().sound;
};

/**
 * Format a message notification with animal sound
 * @param {string} senderUsername - The username of the sender
 * @returns {Object} { title: string, subtitle: string }
 */
export const formatAnimalNotification = (senderUsername) => {
  const { sound, animal } = getRandomAnimalSound();
  return {
    title: 'New Message',
    subtitle: `${senderUsername} ${sound} you`,
    animal: animal,
    sound: sound,
  };
};

/**
 * Get an animal sound based on specific animal name (if available)
 * Falls back to random if no match found
 * @param {string} animalName - The animal to get sound for
 * @returns {Object} { sound: string, animal: string }
 */
export const getSoundForAnimal = (animalName) => {
  const lowerName = animalName?.toLowerCase() || '';
  const match = ANIMAL_SOUNDS.find(
    (item) => item.animal.toLowerCase() === lowerName
  );
  return match || getRandomAnimalSound();
};

export default {
  ANIMAL_SOUNDS,
  getRandomAnimalSound,
  getRandomSoundVerb,
  formatAnimalNotification,
  getSoundForAnimal,
};
