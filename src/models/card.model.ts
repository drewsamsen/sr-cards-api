// Database model (matches PostgreSQL snake_case)
export interface CardDB {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'review';
  review_at: string | null;
  created_at: string;
  updated_at: string;
}

// API model (uses JavaScript camelCase convention)
export interface Card {
  id: string;
  userId: string;
  deckId: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'review';
  reviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Request DTOs (uses JavaScript camelCase convention)
export interface CreateCardDTO {
  front: string;
  back: string;
  status?: 'new' | 'learning' | 'review';
  reviewAt?: string;
}

export interface UpdateCardDTO {
  front?: string;
  back?: string;
  status?: 'new' | 'learning' | 'review';
  reviewAt?: string | null;
} 