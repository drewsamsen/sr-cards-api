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
  reviewCount?: number; // Number of cards ready for review
}

// Request DTOs (uses JavaScript camelCase convention)
export interface CreateDeckDTO {
  name: string;
  description?: string;
}

export interface UpdateDeckDTO {
  name?: string;
  description?: string;
} 