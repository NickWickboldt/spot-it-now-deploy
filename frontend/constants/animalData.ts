export interface AnimalCategory {
	title: string;
	data: string[];
}

// Full animal dataset (trimmed categories may be extended).
export const ANIMAL_DATA = [
  {
    title: 'Mammals',
    data: [
      'Lion', 'Tiger', 'Leopard', 'Jaguar', 'Cheetah', 'Cougar',
      'Bobcat', 'Ocelot', 'Serval', 'Clouded Leopard', 'Gray Wolf', 'Coyote',
      'Red Fox', 'African Wild Dog', 'Fennec Fox', 'Maned Wolf', 'Polar Bear',
      'Brown Bear', 'Black Bear', 'Sun Bear', 'Spectacled Bear',
      'Wolverine', 'Pine Marten', 'Stoat', 'Weasel', 'Ferret',
      'European Badger', 'Honey Badger', 'Striped Skunk', 'Raccoon', 'Spotted Hyena',
      'Mongoose', 'Genet', 'Harbor Seal', 'Aardvark', 'American Bison', 'Moose',
      'Elk', 'White-tailed Deer', 'Fallow Deer', 'Roe Deer', 'Wild Boar',
      'Hippopotamus', 'Giraffe', 'Zebra', 'Okapi', 'Camel', 'Pronghorn', 'Yak',
      'Rhinoceros', 'Tapir', 'African Elephant', 'Hedgehog', 'Opossum', 'Armadillo',
      'Gorilla', 'Chimpanzee', 'Orangutan', 'Bonobo', 'Gibbons', 'Mandrill',
      'Howler Monkey', 'Gray Squirrel', 'Red Squirrel', 'Chipmunk', 'Prairie Dog',
      'Gopher', 'Vole', 'House Mouse', 'Brown Rat', 'Beaver', 'Porcupine', 'Capybara',
      'Eastern Cottontail Rabbit', 'European Rabbit', 'Kangaroo', 'Koala', 'Quokka',
      'Wombat', 'Wallaby', 'Tasmanian Devil', 'Sugar Glider', 'Platypus', 'Echidna',
      'Sloth', 'Pangolin', 'Coati', 'Tamandua'
    ],
  },
  {
    title: 'Birds',
    data: [
      'American Robin', 'House Sparrow', 'Northern Cardinal', 'Blue Jay',
      'European Starling', 'Mourning Dove', 'American Crow', 'Common Raven',
      'Rock Pigeon', 'House Finch', 'American Goldfinch', 'Black-capped Chickadee',
      'Tufted Titmouse', 'Carolina Wren', 'Northern Mockingbird', 'Downy Woodpecker',
      'Red-winged Blackbird', 'Song Sparrow', 'White-throated Sparrow', 'Dark-eyed Junco',
      'Grackle', 'Cedar Waxwing', 'Bald Eagle', 'Golden Eagle', 'Osprey', 'Red-tailed Hawk',
      'Peregrine Falcon', 'American Kestrel', 'Great Horned Owl', 'Barn Owl', 'Barred Owl',
      'Northern Harrier', 'Turkey Vulture', 'Black Vulture', 'Screech Owl', 'Harpy Eagle',
      'Canada Goose', 'Snow Goose', 'Mute Swan', 'Mallard', 'Wood Duck', 'Blue-winged Teal',
      'Common Merganser', 'Great Blue Heron', 'Great Egret', 'Sandhill Crane',
      'American White Ibis', 'Roseate Spoonbill', 'Common Loon', 'Pelican', 'Gull',
      'Stork', 'Cormorant', 'Anhinga', 'Peacock', 'Macaw',
      'Parakeet', 'Hummingbird', 'Flamingo', 'Quetzal', 'Kingfisher',
      'Toco Toucan', 'Cockatoo', 'Kea', 'Hoopoe', 'Bee-eater',
      'Wren', 'Swallow', 'Robin',
      'Blackbird', 'Great Tit', 'Blue Tit', 'Chaffinch', 'Magpie',
      'Jackdaw', 'Jay', 'Skylark', 'Nightingale', 'Wagtail', 'Dunnock',
      'Myna', 'Drongo', 'Bulbul',
      'Spotted Dove', 'Oystercatcher', 'Sandpiper', 'Common Tern', 'Plover',
      'Kittiwake', 'Albatross', 'Shearwater', 'Murre', 'Razorbill', 'Skua',
      'Pileated Woodpecker', 'Hairy Woodpecker', 'Northern Flicker', 'Nutcracker',
      'Treecreeper', 'Nuthatch', 'Cuckoo', 'Roadrunner', 'Trogon', 'Ostrich', 'Emu',
      'Cassowary', 'Condor', 'Shoebill Stork', 'Secretarybird', 'Toucan',
      'Hornbill', 'Crowned Crane', 'Gannet', 'Puffin', 'Kiwi', 'Penguin'
    ],
  },
  {
    title: 'Insects and Arachnids',
    data: [
      'Monarch Butterfly', 'Painted Lady', 'Cabbage White', 'Swallowtail',
      'Blue Morpho', 'Common Blue', 'Red Admiral', 'Atlas Moth', 'Luna Moth', 'Hummingbird Hawk-Moth',
      'Tiger Moth', 'Cecropia Moth', 'Garden Tiger Moth', 'Old World Swallowtail', 'Death\'s-Head Hawkmoth',
      'Emperor Moth', 'Honey Bee', 'Bumblebee', 'Carpenter Bee',
      'Paper Wasp', 'Yellowjacket', 'Mud Dauber', 'European Hornet', 'Bald-faced Hornet',
      'Fire Ant', 'Carpenter Ant', 'Leafcutter Ant', 'Weaver Ant', 'Velvet Ant', 'Argentine Ant',
      'Ladybug', 'Japanese Beetle', 'Stag Beetle', 'Rhino Beetle',
      'Hercules Beetle', 'Dung Beetle', 'June Bug', 'Firefly', 'Tiger Beetle',
      'Soldier Beetle', 'Longhorn Beetle', 'Weevil', 'Blister Beetle', 'Bombardier Beetle',
      'Click Beetle', 'Housefly', 'Fruit Fly', 'Mosquito', 'Crane Fly', 'Horse Fly',
      'Botfly', 'Hoverfly', 'Dragonfly', 'Damselfly',
      'Robber Fly', 'Common House Spider', 'Orb-weaver Spider', 'Jumping Spider', 'Wolf Spider',
      'Brown Recluse', 'Black Widow', 'Garden Spider', 'Tarantula', 'Hobo Spider',
      'Daddy Longlegs', 'Scorpion', 'Bark Scorpion', 'Orb Weaver',
      'Cellar Spider', 'House Cricket', 'Grasshopper', 'Katydid',
      'Mole Cricket', 'Jerusalem Cricket', 'Praying Mantis', 'Stick Insect',
      'Camel Cricket', 'Locust', 'Cicada', 'Stink Bug',
      'Boxelder Bug', 'Water Strider', 'Bed Bug', 'Shield Bug', 'Leafhopper', 'Assassin Bug',
      'Giant Water Bug', 'Kissing Bug', 'Caterpillar', 'Hornworm',
      'Tent Caterpillar', 'Woolly Bear Caterpillar', 'Armyworm', 'Cabbage White Butterfly Larva',
      'Centipede', 'Millipede', 'Pillbug', 'Earwig', 'Cockroach',
      'Termite', 'Silverfish', 'Flea', 'Tick', 'Mite', 'Slug', 'Snail',
      'Leech', 'Earthworm', 'Antlion', 'Dobsonfly'
    ],
  },
  {
    title: 'Reptiles and Amphibians',
    data: [
      'Corn Snake', 'Garter Snake', 'Black Rat Snake', 'Kingsnake',
      'Common Watersnake', 'Northern Copperhead', 'Timber Rattlesnake', 'Eastern Diamondback Rattlesnake',
      'Eastern Coral Snake', 'Ball Python', 'Boa Constrictor', 'Green Anaconda', 'King Cobra',
      'Gopher Snake', 'Grass Snake', 'Ring-necked Snake', 'Hog-nosed Snake', 'Milk Snake', 'Black Mamba',
      'Anole', 'Geckos', 'Five-lined Skink', 'Eastern Fence Lizard',
      'Komodo Dragon', 'Bearded Dragon', 'Iguana', 'Frilled Lizard', 'Gila Monster',
      'Chameleon', 'Chuckwalla', 'Leopard Gecko', 'Monitor Lizard',
      'Legless Lizard', 'Blue-tongued Skink', 'Basilisk Lizard',
      'Alligator Lizard', 'Horned Lizard', 'Painted Turtle', 'Snapping Turtle',
      'Box Turtle', 'Red-eared Slider', 'Eastern Musk Turtle', 'Spiny Softshell Turtle',
      'Galápagos Tortoise', 'Sulcata Tortoise', 'Alligator Snapping Turtle', 'American Alligator',
      'American Crocodile', 'Saltwater Crocodile', 'Nile Crocodile', 'Caiman',
      'Gharial', 'American Bullfrog', 'American Toad', 'Spring Peeper', 'Gray Treefrog',
      'Green Treefrog', 'Poison Dart Frog', 'Goliath Frog', 'Cane Toad', 'Northern Leopard Frog',
      'African Clawed Frog', 'Fire-bellied Toad', 'Ornate Horned Frog', 'Wood Frog',
      'Chorus Frog', 'Spadefoot Toad', 'Spotted Salamander', 'Eastern Newt', 'Axolotl',
      'Tiger Salamander', 'Hellbender', 'Red Salamander', 'Marbled Salamander',
      'Red-backed Salamander', 'Rough-skinned Newt'
    ],
  },
  {
    title: 'Marine Animals',
    data: [
      'Clownfish', 'Blue Tang', 'Yellow Tang', 'Lionfish', 'Pufferfish',
      'Anglerfish', 'Great White Shark', 'Hammerhead Shark', 'Whale Shark', 'Reef Shark',
      'Manta Ray', 'Stingray', 'Swordfish', 'Sunfish', 'Parrotfish', 'Moray Eel', 'Electric Eel',
      'Seahorse', 'Surgeonfish', 'Barracuda', 'Tuna', 'Cod',
      'Flounder', 'Octopus', 'Squid', 'Giant Squid', 'Cuttlefish',
      'Jellyfish', 'Portuguese Man-of-War', 'Starfish', 'Sea Urchin',
      'Sand Dollar', 'Sea Cucumber', 'Horseshoe Crab', 'Crab', 'Lobster',
      'Shrimp', 'Hermit Crab', 'Oyster', 'Clam', 'Snail', 'Nudibranch', 'Krill',
      'Sea Anemone', 'Coral', 'Green Sea Turtle', 'Loggerhead Sea Turtle',
      'Leatherback Sea Turtle', 'Marine Iguana', 'Bottlenose Dolphin', 'Orca',
      'Humpback Whale', 'Blue Whale', 'Beluga Whale', 'Narwhal', 'Manatee', 'Sea Otter',
      'Sea Lion', 'Walrus', 'Harp Seal'
    ],
  },
];

export const TOTAL_ANIMALS = ANIMAL_DATA.reduce((sum, c) => sum + c.data.length, 0);
