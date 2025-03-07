/**
 * Response model for daily progress information
 */
export interface DailyProgressResponse {
  newCardsSeen: number;
  newCardsLimit: number;
  reviewCardsSeen: number;
  reviewCardsLimit: number;
  totalRemaining: number;
} 