/**
 * demo-content.js
 * 
 * Shared demo content used in multiple scripts:
 * - Used by ensure-demo-user.js (production deployment)
 * - Used by seed-data.js (development environment setup)
 * 
 * Contains all the demo deck names, descriptions, and cards.
 */

// Demo user configuration
const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demopassword',
  fullName: 'Demo User',
  metadata: {
    isDemoUser: true,
    demoResetInterval: 30 // Minutes until the demo user resets
  }
};

// Spaced Repetition Basics deck and cards
const SPACED_REPETITION_DECK = {
  name: 'Spaced Repetition Basics',
  description: 'Learn about the spaced repetition technique',
  cards: [
    {
      front: "What is spaced repetition?",
      back: "Spaced repetition is a learning technique that incorporates increasing intervals of time between subsequent review of previously learned material to exploit the psychological spacing effect."
    },
    {
      front: "Who developed the first spaced repetition system?",
      back: "Sebastian Leitner developed the Leitner system in the 1970s, which is considered one of the first practical spaced repetition systems."
    },
    {
      front: "What is the forgetting curve?",
      back: "The forgetting curve, discovered by Hermann Ebbinghaus, illustrates the decline of memory retention over time. It shows how information is lost when there is no attempt to retain it."
    }
  ]
};

// Memory Techniques deck and cards
const MEMORY_TECHNIQUES_DECK = {
  name: 'Memory Techniques',
  description: 'Powerful methods to improve memory',
  cards: [
    {
      front: "What is the method of loci?",
      back: "The method of loci (memory palace) is a mnemonic device that relies on spatial memory to visualize familiar locations to help remember information."
    },
    {
      front: "What is chunking in memory techniques?",
      back: "Chunking is a memory technique that involves grouping individual pieces of information into larger units to make them easier to remember."
    },
    {
      front: "What is the major system?",
      back: "The major system is a mnemonic technique used to aid in memorizing numbers by converting them into more memorable consonant sounds, then into words by adding vowels."
    }
  ]
};

// Tech Startup Buzzwords deck and cards
const STARTUP_BUZZWORDS_DECK = {
  name: 'Tech Startup Buzzwords',
  description: 'Essential terminology for navigating the startup ecosystem',
  cards: [
    {
      front: "MVP",
      back: "Minimum Viable Product — aka the version that barely works but proves we're \"building in public.\""
    },
    {
      front: "Pivot",
      back: "When your original idea flops and you change direction while pretending it was intentional."
    },
    {
      front: "Runway",
      back: "The number of months until we run out of money and start calling angel investors \"again.\""
    },
    {
      front: "Disruptive Innovation",
      back: "We do what others do, but with an app and a pitch deck."
    },
    {
      front: "Unicorn",
      back: "A startup valued at $1 billion — often before it makes a single dollar."
    },
    {
      front: "Growth Hacking",
      back: "Marketing, but with more caffeine and no budget."
    },
    {
      front: "Product-Market Fit",
      back: "That magical moment when people actually want what you're building — still loading…"
    },
    {
      front: "Web3",
      back: "Something to do with crypto, ownership, and vibes. Still unclear."
    },
    {
      front: "Burn Rate",
      back: "How fast we're setting investor money on fire each month."
    },
    {
      front: "Scalable",
      back: "Sounds impressive, means \"we hope this can make money someday.\""
    },
    {
      front: "Thought Leader",
      back: "Someone who posts long threads on X (formerly Twitter) and uses phrases like \"the future of work.\""
    }
  ]
};

// SAT Vocabulary deck and cards
const SAT_VOCABULARY_DECK = {
  name: 'SAT Vocabulary',
  description: 'Advanced vocabulary words commonly found on standardized tests',
  cards: [
    {
      front: "Abate",
      back: "v. /uh-BAYT/\n\nto reduce in intensity or amount\n\n\"The storm finally began to abate, and the sun peeked through the clouds.\""
    },
    {
      front: "Cacophony",
      back: "n. /kuh-KAW-fuh-nee/\n\na harsh, discordant mixture of sounds\n\n\"The cacophony of car horns made it impossible to concentrate.\""
    },
    {
      front: "Ubiquitous",
      back: "adj. /yoo-BIK-wih-tuss/\n\npresent or existing everywhere\n\n\"Cell phones are so ubiquitous that it's hard to imagine life without them.\""
    },
    {
      front: "Mollify",
      back: "v. /MAH-luh-fy/\n\nto calm or soothe someone who is angry or upset\n\n\"She tried to mollify her friend by offering a heartfelt apology.\""
    },
    {
      front: "Lethargic",
      back: "adj. /luh-THAR-jik/\n\nsluggish, lacking energy or enthusiasm\n\n\"After staying up all night, he felt too lethargic to get out of bed.\""
    }
  ]
};

// Logical Fallacies deck and cards
const LOGICAL_FALLACIES_DECK = {
  name: 'Logical Fallacies',
  description: 'Common reasoning errors that undermine arguments',
  cards: [
    {
      front: "Ad Hominem",
      back: "Attacking the person instead of addressing their argument.\n\nExample: \"You can't trust his economic theory because he went bankrupt once.\""
    },
    {
      front: "Straw Man",
      back: "Misrepresenting someone's argument to make it easier to attack.\n\nExample: \"Vegans want us all to stop eating any animal products immediately, which would destroy the economy.\""
    },
    {
      front: "False Dilemma",
      back: "Presenting only two options when more exist.\n\nExample: \"Either we cut education funding or we go bankrupt. There's no other choice.\""
    },
    {
      front: "Appeal to Authority",
      back: "Claiming something is true because an authority figure says it is, without supporting evidence.\n\nExample: \"Dr. Smith has a PhD, so her claim about climate change must be correct.\""
    },
    {
      front: "Slippery Slope",
      back: "Arguing that a small step will inevitably lead to extreme consequences.\n\nExample: \"If we allow same-sex marriage, next people will want to marry their pets!\""
    },
    {
      front: "Post Hoc Ergo Propter Hoc",
      back: "Assuming that because one event followed another, the first caused the second.\n\nExample: \"I wore my lucky socks and we won the game, so my socks caused our victory.\""
    },
    {
      front: "Circular Reasoning",
      back: "Making an argument where the conclusion is included in the premise.\n\nExample: \"The Bible is true because it says so in the Bible.\""
    }
  ]
};

// All demo decks for easy access
const DEMO_DECKS = [
  SPACED_REPETITION_DECK,
  MEMORY_TECHNIQUES_DECK,
  STARTUP_BUZZWORDS_DECK,
  SAT_VOCABULARY_DECK,
  LOGICAL_FALLACIES_DECK
];

module.exports = {
  DEMO_USER,
  DEMO_DECKS,
  SPACED_REPETITION_DECK,
  MEMORY_TECHNIQUES_DECK,
  STARTUP_BUZZWORDS_DECK,
  SAT_VOCABULARY_DECK,
  LOGICAL_FALLACIES_DECK
}; 