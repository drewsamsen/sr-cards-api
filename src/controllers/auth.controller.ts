import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils';
import { AuthenticatedRequest } from '../middleware/auth';

export const authController = {
  /**
   * Register a new user
   */
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const user = await authService.signUp({ email, password, fullName });

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.user.id,
          email: user.user.email,
          fullName: user.user.user_metadata?.full_name,
        },
      },
    });
  }),

  /**
   * Login a user
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const { user, session } = await authService.signIn({ email, password });

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name,
        },
        token: session.access_token,
        refreshToken: session.refresh_token,
      },
    });
  }),

  /**
   * Logout a user
   */
  logout: asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || '';

    await authService.signOut(token);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }),

  /**
   * Get current user
   */
  getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name,
        },
      },
    });
  }),
}; 