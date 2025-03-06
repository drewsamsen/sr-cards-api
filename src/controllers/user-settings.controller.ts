import { Response } from 'express';
import { userSettingsService, UserSettingsUpdate } from '../services/user-settings.service';
import { asyncHandler } from '../utils';
import { AuthenticatedRequest } from '../middleware/auth';

export const userSettingsController = {
  /**
   * Get user settings
   */
  getUserSettings: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    const settings = await userSettingsService.getUserSettings(userId);

    if (!settings) {
      // If settings don't exist, create default settings
      const defaultSettings = await userSettingsService.createDefaultSettings(userId);
      
      if (!defaultSettings) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to create default settings',
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          settings: defaultSettings,
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        settings,
      },
    });
  }),

  /**
   * Update user settings
   */
  updateUserSettings: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { settings } = req.body;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Settings object is required',
      });
    }

    // Validate settings object
    try {
      // First ensure user has settings
      let userSettings = await userSettingsService.getUserSettings(userId);
      
      if (!userSettings) {
        // Create default settings first
        userSettings = await userSettingsService.createDefaultSettings(userId);
        
        if (!userSettings) {
          return res.status(500).json({
            status: 'error',
            message: 'Failed to create default settings',
          });
        }
      }
      
      // Update settings
      const updatedSettings = await userSettingsService.updateUserSettings(userId, settings as UserSettingsUpdate);
      
      if (!updatedSettings) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to update settings',
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          settings: updatedSettings,
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Invalid settings format',
      });
    }
  }),
}; 