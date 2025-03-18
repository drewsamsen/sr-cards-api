import { Router, Response } from 'express';
import OpenAI from 'openai';
import { cardController } from '../controllers/card.controller';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { cardService } from '../services/card.service';

// OpenAI setup
let openai: OpenAI;

const initOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is missing');
  }
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

const router = Router();

// Apply auth middleware to all card routes
router.use(authenticate);

// Get cards (with optional deck filter)
router.get('/', cardController.getCards);

// Search cards
router.get('/search', cardController.searchCards);

// Get cards due for review
router.get('/review', cardController.getCardsForReview);

// Get a specific card
router.get('/:id', cardController.getCardById);

// Update a card
router.patch('/:id', cardController.updateCard);

// Delete a card
router.delete('/:id', cardController.deleteCard);

// Submit a review for a card
router.post('/:cardId/review', cardController.reviewCard);

// Get logs for a specific card
router.get('/:id/logs', cardController.getCardLogs);

/**
 * Expound on card content - provide more detailed explanation about the card content
 */
router.post('/:cardId/expound', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Initialize OpenAI if not already initialized
    if (!openai) {
      initOpenAI();
    }

    const { cardId } = req.params;
    const userId = req.user.id;

    // Fetch the card to make sure it exists and belongs to the user
    const card = await cardService.getCardById(cardId, userId);
    
    if (!card) {
      res.status(404).json({
        status: 'error',
        message: 'Card not found or does not belong to the user'
      });
      return;
    }

    // Create a prompt using the card's front and back content
    const prompt = `The user already has the following information about the card:
Card Front: ${card.front}
Card Back: ${card.back}

Please provide a brief, additional helpful explanation of this concept. Include additional context, 
examples, and related information that would help someone understand this topic better. If there is 
not enough information to provide a helpful explanation, suggest techniques or tips to memorize the 
information better. If the cards seems to be a vocabulary word, suggest alternate definitions or uses.

The explanation should be concise and to the point, and should not exceed 150 words. Prioritize short 
sentences and plenty of new lines. Format your response as markdown. 
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a knowledgeable tutor that helps expand on flashcard content. Provide concise explanations that enhance the user's understanding of the topic."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    res.json({
      status: 'success',
      data: {
        cardId: card.id,
        front: card.front,
        back: card.back,
        explanation: response.choices[0].message.content
      }
    });
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate explanation'
    });
  }
});

export default router; 