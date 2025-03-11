// Database model (matches PostgreSQL snake_case)
export interface DeckDB {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// API model (uses JavaScript camelCase convention)
export interface Deck {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  newCards?: number;    // Number of new cards in the deck
  dueCards?: number;    // Number of cards due for review (not new, with due date in the past)
  totalCards?: number;  // Total number of cards in the deck
  remainingReviews?: number; // Number of cards that can be reviewed today (based on daily limits and available cards)
}

// Request DTOs (uses JavaScript camelCase convention)
export interface CreateDeckDTO {
  name: string;
  description?: string;
}

export interface UpdateDeckDTO {
  name?: string;
  description?: string;
  slug?: string;
} 