# Database Query Optimization Summary

## Problem

The original implementation of the `getAllDecks` method in the deck service had a significant performance issue:

1. It made a separate database query for each deck to get:
   - Review-ready cards count
   - Total cards count
   - Review counts from logs
   - Available new and review cards counts

This resulted in an N+1 query problem, where N is the number of decks, causing poor performance as the number of decks increased.

## Solution

We implemented a batch query approach that significantly reduces the number of database calls:

### 1. Created Batch Methods in Services

- Added `getDeckStatsBatch` to the card review service
- Added `getReviewCountsBatch` to the log service

### 2. Created Optimized SQL Functions

- Created `get_deck_stats_batch` function that:
  - Joins decks with cards
  - Uses SQL aggregation to calculate counts in one pass
  - Returns detailed statistics for multiple decks at once
  - Includes separate counts for new cards and due review cards

- Created `count_reviews_batch` function that:
  - Gets review counts for multiple decks in a single query
  - Returns new cards and review cards counts for each deck

### 3. Added Database Indexes

- Added indexes to improve query performance:
  - `idx_cards_deck_id_user_id` on cards (deck_id, user_id)
  - `idx_cards_state_due` on cards (state, due)
  - `idx_logs_user_id_review` on logs (user_id, review)
  - `idx_logs_card_id` on logs (card_id)

### 4. Refactored the Deck Service

- Updated `getAllDecks` to:
  - Fetch all decks in a single query (already implemented)
  - Extract all deck IDs
  - Call batch methods to get statistics and review counts
  - Combine the data for each deck

## Performance Improvement

The optimization reduces the number of database queries from:
- Original: 1 + 5N queries (where N is the number of decks)
- Optimized: 3 queries (regardless of the number of decks)

For a user with 10 decks:
- Original: 51 database queries
- Optimized: 3 database queries (94% reduction)

## Next Steps

1. **Monitoring**: Add performance monitoring to track query execution times
2. **Caching**: Consider adding caching for frequently accessed data
3. **Pagination**: Implement pagination for users with many decks
4. **Further Optimization**: Explore additional optimizations for other endpoints

## Implementation Notes

- The SQL functions require a database migration to be applied
- The implementation maintains backward compatibility with existing API contracts
- Performance improvements will be most noticeable for users with many decks 