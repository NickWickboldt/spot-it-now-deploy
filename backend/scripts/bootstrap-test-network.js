import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

import { cloudinary, configureCloudinary } from '../src/config/cloudinary.config.js';

const normalizeCityKey = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const createCity = (name, state, latitude, longitude, radiusKm) => {
  const displayName = `${name}, ${state}`;
  return {
    key: normalizeCityKey(`${name}-${state}`),
    name,
    state,
    displayName,
    latitude,
    longitude,
    radiusKm,
  };
};

const CITY_DATA = [
  createCity('New York', 'NY', 40.730599, -73.986581, 35),
  createCity('Los Angeles', 'CA', 34.053717, -118.242727, 35),
  createCity('Chicago', 'IL', 41.875555, -87.624421, 35),
  createCity('Houston', 'TX', 29.758938, -95.367697, 35),
  createCity('Phoenix', 'AZ', 33.446768, -112.075672, 35),
  createCity('Philadelphia', 'PA', 39.952335, -75.163789, 35),
  createCity('San Antonio', 'TX', 29.424600, -98.495141, 35),
  createCity('San Diego', 'CA', 32.717421, -117.162771, 35),
  createCity('Dallas', 'TX', 32.776196, -96.796899, 35),
  createCity('Jacksonville', 'FL', 30.332184, -81.655651, 35),
  createCity('Fort Worth', 'TX', 32.753177, -97.332746, 32),
  createCity('San Jose', 'CA', 37.343850, -121.883135, 32),
  createCity('Austin', 'TX', 30.271129, -97.743700, 32),
  createCity('Charlotte', 'NC', 35.227087, -80.843127, 32),
  createCity('Columbus', 'OH', 39.962260, -83.000707, 32),
  createCity('Indianapolis', 'IN', 39.768333, -86.158350, 32),
  createCity('San Francisco', 'CA', 37.779277, -122.419270, 32),
  createCity('Seattle', 'WA', 47.603832, -122.330062, 32),
  createCity('Denver', 'CO', 39.739154, -104.984703, 32),
  createCity('Oklahoma City', 'OK', 35.472989, -97.517054, 32),
  createCity('Nashville', 'TN', 36.187025, -86.780862, 28),
  createCity('Washington', 'DC', 38.894955, -77.036646, 28),
  createCity('El Paso', 'TX', 31.811131, -106.501349, 28),
  createCity('Las Vegas', 'NV', 36.166286, -115.149225, 28),
  createCity('Boston', 'MA', 42.360482, -71.059568, 28),
  createCity('Detroit', 'MI', 42.348664, -83.056737, 28),
  createCity('Louisville', 'KY', 38.254238, -85.759407, 28),
  createCity('Portland', 'OR', 45.520247, -122.674195, 28),
  createCity('Memphis', 'TN', 35.149022, -90.051629, 28),
  createCity('Baltimore', 'MD', 39.290861, -76.610807, 28),
  createCity('Milwaukee', 'WI', 43.034993, -87.922497, 28),
  createCity('Albuquerque', 'NM', 35.084103, -106.650985, 28),
  createCity('Tucson', 'AZ', 32.221742, -110.926476, 28),
  createCity('Fresno', 'CA', 36.739442, -119.784831, 28),
  createCity('Sacramento', 'CA', 38.581572, -121.494400, 28),
  createCity('Atlanta', 'GA', 33.749099, -84.390185, 24),
  createCity('Mesa', 'AZ', 33.436188, -111.586066, 24),
  createCity('Kansas City', 'MO', 39.084469, -94.563030, 24),
  createCity('Raleigh', 'NC', 35.780402, -78.639078, 24),
  createCity('Colorado Springs', 'CO', 38.833958, -104.825349, 24),
  createCity('Omaha', 'NE', 41.258732, -95.937873, 24),
  createCity('Miami', 'FL', 25.774266, -80.193659, 24),
  createCity('Virginia Beach', 'VA', 36.795302, -76.050925, 24),
  createCity('Long Beach', 'CA', 33.777466, -118.188487, 24),
  createCity('Oakland', 'CA', 37.804456, -122.271356, 24),
  createCity('Minneapolis', 'MN', 44.977300, -93.265469, 24),
  createCity('Bakersfield', 'CA', 35.373871, -119.019464, 24),
  createCity('Tulsa', 'OK', 36.155681, -95.992911, 24),
  createCity('Tampa', 'FL', 27.947760, -82.458444, 24),
  createCity('Arlington', 'TX', 32.735582, -97.107119, 24),
];

const CITY_LOOKUP = new Map();
CITY_DATA.forEach((city) => {
  const candidates = [
    city.key,
    normalizeCityKey(city.name),
    normalizeCityKey(city.displayName),
    normalizeCityKey(`${city.name}${city.state}`),
    normalizeCityKey(`${city.name} ${city.state}`),
  ];
  candidates.forEach((candidate) => {
    if (!CITY_LOOKUP.has(candidate)) {
      CITY_LOOKUP.set(candidate, city);
    }
  });
});

const resolveCity = (input) => {
  if (!input) {
    return undefined;
  }
  const normalized = normalizeCityKey(input);
  if (CITY_LOOKUP.has(normalized)) {
    return CITY_LOOKUP.get(normalized);
  }
  const lowercase = input.toLowerCase();
  return CITY_DATA.find(
    (city) =>
      city.displayName.toLowerCase() === lowercase
      || normalizeCityKey(city.name).startsWith(normalized)
      || normalized.startsWith(normalizeCityKey(city.name)),
  );
};

const DEFAULT_CITY_NAME = process.env.TEST_NETWORK_CITY || 'Dallas, TX';
const DEFAULT_CITY = resolveCity(DEFAULT_CITY_NAME) || resolveCity('Dallas, TX') || CITY_DATA[0];

const printAvailableCities = () => {
  console.log('Available cities (50 largest US metros):');
  CITY_DATA.forEach((city) => {
    console.log(`  - ${city.displayName}`);
  });
};

const kmToLatitudeDegrees = (km) => km / 111;
const kmToLongitudeDegrees = (km, latitude) => {
  const radians = (latitude * Math.PI) / 180;
  const denominator = 111 * Math.cos(radians);
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-6) {
    return 0;
  }
  return km / denominator;
};

const buildCityClusters = (city) => {
  const baseRadius = Math.max(10, city.radiusKm);
  const neighborhoodRadius = Math.max(6, Math.round(baseRadius * 0.6));
  const offsetKm = baseRadius * 0.5;
  const latOffset = kmToLatitudeDegrees(offsetKm);
  const lonOffset = kmToLongitudeDegrees(offsetKm, city.latitude);
  return [
    { name: `${city.displayName} (Downtown)`, lat: city.latitude, lon: city.longitude, radiusKm: baseRadius },
    { name: `${city.displayName} (North)`, lat: city.latitude + latOffset, lon: city.longitude, radiusKm: neighborhoodRadius },
    { name: `${city.displayName} (South)`, lat: city.latitude - latOffset, lon: city.longitude, radiusKm: neighborhoodRadius },
    { name: `${city.displayName} (East)`, lat: city.latitude, lon: city.longitude + lonOffset, radiusKm: neighborhoodRadius },
    { name: `${city.displayName} (West)`, lat: city.latitude, lon: city.longitude - lonOffset, radiusKm: neighborhoodRadius },
  ];
};

const pickCluster = (clusters) => clusters[Math.floor(Math.random() * clusters.length)];

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
    city: DEFAULT_CITY,
  };

  const positional = [];
  let cityCandidate;

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
    } else if (arg === '--city' || arg === '-c') {
      const next = argv[i + 1];
      if (!next) {
        console.error('Missing value for --city');
        printAvailableCities();
        process.exit(1);
      }
      if (next.toLowerCase() === 'list') {
        printAvailableCities();
        process.exit(0);
      }
      cityCandidate = next.trim();
      i += 1;
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
  if (positional[2] && !cityCandidate) {
    cityCandidate = positional[2];
  }

  if (cityCandidate) {
    const trimmedCity = cityCandidate.trim();
    const resolvedCity = resolveCity(trimmedCity);
    if (!resolvedCity) {
      console.error(`Unknown city "${trimmedCity}".`);
      printAvailableCities();
      process.exit(1);
    }
    options.city = resolvedCity;
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
  -c, --city <name>          Anchor city for generated accounts (default: ${DEFAULT_CITY.displayName})
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
  const cityClusters = buildCityClusters(options.city);
  console.log(`
Bootstrapping test network -> users: ${options.users}, posts/user: ${options.posts}, city: ${options.city.displayName}, base URL: ${options.baseUrl}`);

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

      const cluster = pickCluster(cityClusters);
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




















