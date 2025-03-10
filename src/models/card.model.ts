import { ReviewMetrics } from '../services/fsrs.service';

// Database model (matches PostgreSQL snake_case)
export interface CardDB {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: string | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  last_review: string | null;
  created_at: string;
  updated_at: string;
  deck_name?: string; // Optional field from join with decks table
  deck_slug?: string; // Optional field from join with decks table
}

// API model (uses JavaScript camelCase convention)
export interface Card {
  id: string;
  userId: string;
  deckId: string;
  front: string;
  back: string;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: string | null;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview: string | null;
  createdAt: string;
  updatedAt: string;
  deckName?: string; // Optional field from join with decks table
  deckSlug?: string; // Optional field from join with decks table
  reviewMetrics?: ReviewMetrics; // Optional review metrics calculated for this card
}

// Request DTOs (uses JavaScript camelCase convention)
export interface CreateCardDTO {
  front: string;
  back: string;
  // FSRS fields are initialized with default values in the database
}

export interface UpdateCardDTO {
  front?: string;
  back?: string;
  // FSRS fields are typically updated by the review endpoint, not directly
}

// Review DTO
export interface CardReviewDTO {
  rating: 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy
  reviewedAt?: string; // Optional, defaults to current time
} 