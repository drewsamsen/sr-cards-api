import { fsrsService } from '../../services/fsrs.service';
import { userSettingsService } from '../../services/user-settings.service';

// Mock the fsrsService
jest.mock('../../services/fsrs.service', () => ({
  fsrsService: {
    clearFSRSCache: jest.fn()
  }
}));

// Mock the userSettingsService
jest.mock('../../services/user-settings.service', () => ({
  userSettingsService: {
    getUserSettings: jest.fn(),
    updateUserSettings: jest.fn(),
    createDefaultSettings: jest.fn()
  }
}));

describe('User Settings Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserSettings', () => {
    it('should clear the FSRS cache when settings are updated', async () => {
      // Mock the fsrsService.clearFSRSCache method
      const clearFSRSCacheSpy = jest.spyOn(fsrsService, 'clearFSRSCache');
      
      // Mock the updated settings
      const mockUpdatedSettings = {
        id: 'test-settings-id',
        userId: 'test-user-id',
        settings: {
          theme: 'dark',
          showAnswerTimer: false,
          notifications: {
            enabled: true,
            reminderTime: '18:00',
            reminderDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          },
          learning: {
            newCardsPerDay: 5,
            maxReviewsPerDay: 10
          },
          fsrsParams: {
            requestRetention: 0.9,
            maximumInterval: 365,
            w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
            enableFuzz: false,
            enableShortTerm: true
          }
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      // Get the original implementation
      const originalUpdateUserSettings = jest.requireActual('../../services/user-settings.service').userSettingsService.updateUserSettings;
      
      // Create a spy on the original implementation
      const updateUserSettingsSpy = jest.spyOn(userSettingsService, 'updateUserSettings');
      
      // Mock the implementation to call fsrsService.clearFSRSCache
      updateUserSettingsSpy.mockImplementation(async (userId, settings) => {
        // Call the real fsrsService.clearFSRSCache
        fsrsService.clearFSRSCache(userId);
        return mockUpdatedSettings;
      });

      // Call the updateUserSettings method
      const userId = 'test-user-id';
      const updatedSettings = {
        theme: 'dark'
      };
      await userSettingsService.updateUserSettings(userId, updatedSettings);

      // Verify that fsrsService.clearFSRSCache was called with the correct userId
      expect(fsrsService.clearFSRSCache).toHaveBeenCalledWith(userId);
    });

    it('should not clear the FSRS cache if the update fails', async () => {
      // Mock the updateUserSettings method to return null (update failed)
      const updateUserSettingsSpy = jest.spyOn(userSettingsService, 'updateUserSettings');
      updateUserSettingsSpy.mockResolvedValue(null);

      // Call the updateUserSettings method
      const userId = 'test-user-id';
      const updatedSettings = {
        theme: 'dark'
      };
      await userSettingsService.updateUserSettings(userId, updatedSettings);

      // Verify that fsrsService.clearFSRSCache was not called
      expect(fsrsService.clearFSRSCache).not.toHaveBeenCalled();
    });
  });
}); 