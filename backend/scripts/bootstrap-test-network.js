import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import { cloudinary, configureCloudinary } from '../src/config/cloudinary.config.js';

const DFW_CLUSTER_CENTERS = [
  { name: 'Downtown Dallas', lat: 32.7767, lon: -96.7970, radiusKm: 35 },
  { name: 'Fort Worth', lat: 32.7555, lon: -97.3308, radiusKm: 35 },
  { name: 'Plano', lat: 33.0198, lon: -96.6989, radiusKm: 25 },
  { name: 'Frisco', lat: 33.1507, lon: -96.8236, radiusKm: 20 },
  { name: 'Arlington', lat: 32.7357, lon: -97.1081, radiusKm: 25 },
  { name: 'Denton', lat: 33.2148, lon: -97.1331, radiusKm: 30 },
];
const USER_DEFAULT_RADIUS_MILES = Number.parseFloat(process.env.TEST_NETWORK_USER_RADIUS || '75');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_BASE_URL = (process.env.TEST_NETWORK_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-001';
const TEST_USER_COUNT = Number.parseInt(process.env.TEST_NETWORK_USERS || '', 10) || 5;
const TEST_POSTS_PER_USER = Number.parseInt(process.env.TEST_NETWORK_POSTS || '', 10) || 3;
const POST_DELAY_MS = Number.parseInt(process.env.TEST_NETWORK_POST_DELAY_MS || '', 10) || 350;

if (!GEMINI_API_KEY) {
  console.error('Missing Gemini API key. Set GEMINI_API_KEY in backend/.env before running.');
  process.exit(1);
}

configureCloudinary();

const baseFolder = (process.env.CLOUDINARY_BASE_FOLDER || '').trim();
const cloudinaryFolder = baseFolder ? `${baseFolder}/test-network` : 'test-network';

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const joinUrl = (base, segment) => `${base.replace(/\/$/, '')}/${segment.replace(/^\//, '')}`;

const pickCluster = () => DFW_CLUSTER_CENTERS[Math.floor(Math.random() * DFW_CLUSTER_CENTERS.length)];

const SPECIES_PRESETS = [
  {
    commonName: 'Red Fox',
    scientificName: 'Vulpes vulpes',
    prompt: 'A high-resolution wildlife photograph of a red fox trotting through a snow-dusted pine forest at sunrise. 400mm lens, shallow depth of field, natural lighting.',
    captionStarters: ['Dawn patrol with a curious red fox', 'Caught a glimpse of a scarlet-coated fox'],
    location: { lat: 44.5983, lon: -110.5472, radiusKm: 150 },
  },
  {
    commonName: 'Great Horned Owl',
    scientificName: 'Bubo virginianus',
    prompt: 'Portrait of a great horned owl perched on a weathered branch under a starry desert sky. Cinematic lighting, crisp feather detail, wildlife photography.',
    captionStarters: ['Night watch from a great horned owl', 'Silent wings over the canyon tonight'],
    location: { lat: 36.107, lon: -112.113, radiusKm: 90 },
  },
  {
    commonName: 'Snow Leopard',
    scientificName: 'Panthera uncia',
    prompt: 'Telephoto shot of a snow leopard navigating rocky cliffs dusted with fresh snow. Misty mountains in the background, dramatic lighting, ultra realistic.',
    captionStarters: ['Ghost of the mountains spotted again', 'A snow leopard blending with the peaks'],
    location: { lat: 35.8825, lon: 74.4646, radiusKm: 120 },
  },
  {
    commonName: 'Atlantic Puffin',
    scientificName: 'Fratercula arctica',
    prompt: 'Colorful close-up of an Atlantic puffin standing on a grassy cliff with crashing waves behind. Golden hour glow, detailed plumage, wildlife magazine cover style.',
    captionStarters: ['Puffin parade on the cliffs', 'Bright beaks against the cold Atlantic breeze'],
    location: { lat: 64.255, lon: -14.005, radiusKm: 60 },
  },
  {
    commonName: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    prompt: 'Macro photograph of a monarch butterfly resting on wild milkweed in a sunlit meadow. Vibrant colors, creamy bokeh, nature documentary style.',
    captionStarters: ['Migration moments with monarchs', 'Delicate wings soaking in the sunshine'],
    location: { lat: 19.6012, lon: -100.2417, radiusKm: 80 },
  },
  {
    commonName: 'African Elephant',
    scientificName: 'Loxodonta africana',
    prompt: 'Wide-angle shot of an African elephant herd kicking up dust on the savanna at sunset. Warm light, dramatic clouds, National Geographic style.',
    captionStarters: ['Dusty sunset stroll with giants', 'Elephant family moving across the plains'],
    location: { lat: -1.9509, lon: 37.2972, radiusKm: 140 },
  },
  {
    commonName: 'Humpback Whale',
    scientificName: 'Megaptera novaeangliae',
    prompt: 'Split-level photograph of a humpback whale breaching beside a research boat. Crystal blue water, sunbeams underwater, high-speed capture.',
    captionStarters: ['Breach break with a humpback whale', "Wave hello from today's humpback encounter"],
    location: { lat: 58.3019, lon: -134.4197, radiusKm: 160 },
  },
  {
    commonName: 'Jaguar',
    scientificName: 'Panthera onca',
    prompt: 'Moody rainforest image of a jaguar emerging from lush foliage beside a moonlit river. Rain-kissed coat, cinematic lighting, hyper-real detail.',
    captionStarters: ['Moonlit prowl from a jaguar', 'Rainforest royalty on the move tonight'],
    location: { lat: -3.4653, lon: -62.2159, radiusKm: 200 },
  },
];

const niceCase = (value) => value.replace(/(^|\s)([a-z])/g, (_, space, letter) => `${space}${letter.toUpperCase()}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = (argv) => {
  const options = {
    users: TEST_USER_COUNT,
    posts: TEST_POSTS_PER_USER,
    baseUrl: DEFAULT_BASE_URL,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--users' || arg === '-u') {
      options.users = Number.parseInt(argv[i + 1] || '', 10) || options.users;
      i += 1;
    } else if (arg === '--posts' || arg === '-p') {
      options.posts = Number.parseInt(argv[i + 1] || '', 10) || options.posts;
      i += 1;
    } else if (arg === '--base-url' || arg === '-b') {
      const next = argv[i + 1];
      if (next) {
        options.baseUrl = next.replace(/\/$/, '');
        i += 1;
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional[0]) {
    options.users = Number.parseInt(positional[0], 10) || options.users;
  }
  if (positional[1]) {
    options.posts = Number.parseInt(positional[1], 10) || options.posts;
  }

  return options;
};

const printHelp = () => {
  console.log(`
Usage: node scripts/bootstrap-test-network.js [options]

Options:
  -u, --users <number>       Number of automated users to generate (default: ${TEST_USER_COUNT})
  -p, --posts <number>       Posts per user (default: ${TEST_POSTS_PER_USER})
  -b, --base-url <url>       API base URL (default: ${DEFAULT_BASE_URL})
  -h, --help                 Show this help message

Environment overrides:
  GEMINI_API_KEY                   Gemini API key (required)
  GEMINI_IMAGE_MODEL               Gemini model used for image generation
  TEST_NETWORK_USERS               Default user count
  TEST_NETWORK_POSTS               Default post count
  TEST_NETWORK_BASE_URL            Default API base URL
  TEST_NETWORK_POST_DELAY_MS       Delay between posts in ms (default 350)
`);
};

const randomPreset = () => SPECIES_PRESETS[Math.floor(Math.random() * SPECIES_PRESETS.length)];

const toCaption = (preset) => {
  const intro = preset.captionStarters[Math.floor(Math.random() * preset.captionStarters.length)];
  const suffix = ['Testing the new feed', 'Automated load generator drop', 'Telemetry run for content tuning'][Math.floor(Math.random() * 3)];
  return `${intro}. ${suffix}.`;
};

const jitterCoordinates = (lat, lon, radiusKm) => {
  const radiusInDegrees = radiusKm / 111;
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const deltaLat = w * Math.cos(t);
  const deltaLon = w * Math.sin(t) / Math.max(Math.cos((lat * Math.PI) / 180), 0.0001);
  return {
    latitude: lat + deltaLat,
    longitude: lon + deltaLon,
  };
};

const generateImageBuffer = async (prompt) => {
  const response = await genAI.models.generateImages({
    model: GEMINI_IMAGE_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
    },
  });

  const images = response?.generatedImages || [];
  for (const generatedImage of images) {
    const imageBytes = generatedImage?.image?.imageBytes;
    if (imageBytes) {
      return Buffer.from(imageBytes, 'base64');
    }
    const generationError = generatedImage?.error?.message || generatedImage?.error;
    if (generationError) {
      throw new Error(generationError);
    }
  }

  const errorDetail = response?.error?.message || (response?.error ? JSON.stringify(response.error) : 'Gemini did not return image data');
  throw new Error(errorDetail);
};

const uploadToCloudinary = async (buffer, preset) => new Promise((resolve, reject) => {
  const tags = ['test-network', 'autogenerated', preset.commonName.toLowerCase().replace(/\s+/g, '-')];
  const uploadOptions = {
    resource_type: 'image',
    folder: cloudinaryFolder,
    use_filename: false,
    unique_filename: true,
    overwrite: false,
    tags,
    context: {
      species: preset.commonName,
      generator: 'test-network-bootstrapper',
    },
  };

  const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
    if (error) {
      reject(error);
      return;
    }
    if (!result?.secure_url) {
      reject(new Error('Missing secure_url from Cloudinary response'));
      return;
    }
    resolve(result.secure_url);
  });

  stream.on('error', reject);
  stream.end(buffer);
});

const registerUser = async (baseUrl, username, email, password) => {
  const response = await fetch(joinUrl(baseUrl, 'users/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  if (response.status === 409) {
    console.warn(`User ${username} already exists. Skipping registration.`);
    return false;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to register user ${username}: ${response.status} ${text}`);
  }

  return true;
};

const loginUser = async (baseUrl, username, password) => {
  const response = await fetch(joinUrl(baseUrl, 'users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to login user ${username}: ${response.status} ${text}`);
  }

  const payload = await response.json();
  return payload?.data?.accessToken;
};

const createSighting = async (baseUrl, accessToken, payload) => {
  const response = await fetch(joinUrl(baseUrl, 'sightings/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create sighting: ${response.status} ${text}`);
  }
};

const updateUserProfileLocation = async (baseUrl, accessToken, coords, radiusMiles) => {
  if (!accessToken) return;
  try {
    await fetch(joinUrl(baseUrl, 'users/me'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        longitude: Number(coords.longitude.toFixed(6)),
        latitude: Number(coords.latitude.toFixed(6)),
        radius: Math.max(1, Math.round(radiusMiles)),
      }),
    });
  } catch (error) {
    console.error('Failed to update user profile location', error?.message || error);
  }
};

const createUserIdentity = () => {
  const base = ['aurora', 'summit', 'wild', 'stride', 'glade', 'echo', 'ridge', 'trail'];
  const animals = ['lynx', 'falcon', 'otter', 'wolf', 'finch', 'orca'];
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const slug = `${pick(base)}${pick(animals)}`;
  const suffix = crypto.randomBytes(3).toString('hex');
  const username = `${slug.slice(0, 10)}_${suffix}`.toLowerCase();
  const email = `${username}@example.test`;
  const password = `T${crypto.randomBytes(6).toString('hex')}!9`;
  return { username, email, password };
};

const orchestrate = async () => {
  const options = parseArgs(process.argv.slice(2));
  console.log(`
Bootstrapping test network -> users: ${options.users}, posts/user: ${options.posts}, base URL: ${options.baseUrl}`);

  let aborted = false;
  process.on('SIGINT', () => {
    console.log('Received SIGINT. Finishing current operation then stopping...');
    aborted = true;
  });

  for (let i = 0; i < options.users; i += 1) {
    if (aborted) {
      break;
    }

    const identity = createUserIdentity();
    try {
      const registered = await registerUser(options.baseUrl, identity.username, identity.email, identity.password);
      if (!registered) {
        continue;
      }

      const accessToken = await loginUser(options.baseUrl, identity.username, identity.password);
      console.log(`Created user ${identity.username}`);

      const cluster = pickCluster();
      const homeCoords = jitterCoordinates(cluster.lat, cluster.lon, cluster.radiusKm);
      await updateUserProfileLocation(options.baseUrl, accessToken, homeCoords, USER_DEFAULT_RADIUS_MILES);

      for (let p = 0; p < options.posts; p += 1) {
        if (aborted) {
          break;
        }

        const preset = randomPreset();
        try {
          const prompt = preset.prompt;
          const imageBuffer = await generateImageBuffer(prompt);
          const mediaUrl = await uploadToCloudinary(imageBuffer, preset);
          const coords = jitterCoordinates(homeCoords.latitude, homeCoords.longitude, Math.max(cluster.radiusKm / 1.5, 8));
          const payload = {
            mediaUrls: [mediaUrl],
            latitude: Number(coords.latitude.toFixed(6)),
            longitude: Number(coords.longitude.toFixed(6)),
            caption: toCaption(preset),
            isPrivate: false,
            identification: {
              source: 'USER',
              commonName: preset.commonName,
              scientificName: preset.scientificName || null,
            },
          };

          await createSighting(options.baseUrl, accessToken, payload);
          console.log(`  -> Posted ${preset.commonName} from ${mediaUrl}`);
          await sleep(POST_DELAY_MS);
        } catch (postError) {
          console.error(`  !! Failed to create post for ${identity.username}:`, postError.message);
        }
      }
    } catch (userError) {
      console.error(`Failed to set up user ${identity.username}:`, userError.message);
    }
  }

  if (aborted) {
    console.log('Stopped by user request.');
  } else {
    console.log('Test network bootstrap completed.');
  }
};

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('bootstrap-test-network.js')) {
  orchestrate().catch((error) => {
    console.error('Fatal error during bootstrap:', error);
    process.exit(1);
  });
}



















