import { Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { authController } from '../../controllers/auth.controller';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the auth service
jest.mock('../../services/auth.service');

// Mock the asyncHandler to directly call the handler function
jest.mock('../../utils', () => ({
  asyncHandler: (fn: Function) => fn
}));

describe('Auth Controller', () => {
  let mockRequest: Partial<Request | AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let responseObject = {};
  let mockNext = jest.fn();

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request and response
    mockRequest = {
      body: {},
      headers: {},
      user: undefined
    };
    
    responseObject = {};
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation(result => {
        responseObject = result;
        return mockResponse;
      })
    } as Partial<Response>;

    mockNext = jest.fn();
  });

  describe('register', () => {
    test('should register a new user successfully', async () => {
      // Setup request with registration data
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };
      
      // Mock the service to return a successful registration
      const mockUser = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User'
          }
        }
      };
      
      (authService.signUp as jest.Mock).mockResolvedValue(mockUser);

      // Call the controller method
      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(authService.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toEqual({
        status: 'success',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            fullName: 'Test User'
          }
        }
      });
    });

    test('should return 400 if email or password is missing', async () => {
      // Setup request with missing data
      mockRequest.body = {
        email: 'test@example.com'
        // password is missing
      };

      // Call the controller method
      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'Email and password are required'
      });
      
      // Verify service was not called
      expect(authService.signUp).not.toHaveBeenCalled();
    });

    test('should return 409 if user already exists', async () => {
      // Setup request with registration data
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123'
      };
      
      // Mock the service to throw a user already exists error
      const error = new Error('User with email existing@example.com has already been registered');
      (authService.signUp as jest.Mock).mockRejectedValue(error);

      // Call the controller method
      await authController.register(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'A user with this email address already exists'
      });
    });

    test('should throw other errors to be handled by middleware', async () => {
      // Setup request with registration data
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Mock the service to throw a generic error
      const error = new Error('Database connection error');
      (authService.signUp as jest.Mock).mockRejectedValue(error);

      // Call the controller method and expect it to throw
      await expect(authController.register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Database connection error');
    });
  });

  describe('login', () => {
    test('should login a user successfully', async () => {
      // Setup request with login data
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Mock the service to return a successful login
      const mockAuthData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User'
          }
        },
        session: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123'
        }
      };
      
      (authService.signIn as jest.Mock).mockResolvedValue(mockAuthData);

      // Call the controller method
      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(authService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            fullName: 'Test User'
          },
          token: 'access-token-123',
          refreshToken: 'refresh-token-123'
        }
      });
    });

    test('should return 400 if email or password is missing', async () => {
      // Setup request with missing data
      mockRequest.body = {
        email: 'test@example.com'
        // password is missing
      };

      // Call the controller method
      await authController.login(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'Email and password are required'
      });
      
      // Verify service was not called
      expect(authService.signIn).not.toHaveBeenCalled();
    });

    test('should throw authentication errors to be handled by middleware', async () => {
      // Setup request with login data
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrong-password'
      };
      
      // Mock the service to throw an authentication error
      const error = new Error('Invalid login credentials');
      (authService.signIn as jest.Mock).mockRejectedValue(error);

      // Call the controller method and expect it to throw
      await expect(authController.login(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid login credentials');
    });
  });

  describe('logout', () => {
    test('should logout a user successfully', async () => {
      // Setup request with authorization header
      mockRequest.headers = {
        authorization: 'Bearer token-123'
      };
      
      // Mock the service to return a successful logout
      (authService.signOut as jest.Mock).mockResolvedValue({ success: true });

      // Call the controller method
      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(authService.signOut).toHaveBeenCalledWith('token-123');
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        message: 'Logged out successfully'
      });
    });

    test('should handle missing authorization header', async () => {
      // Setup request with no authorization header
      mockRequest.headers = {};
      
      // Mock the service to return a successful logout
      (authService.signOut as jest.Mock).mockResolvedValue({ success: true });

      // Call the controller method
      await authController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      // Assertions
      expect(authService.signOut).toHaveBeenCalledWith('');
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        message: 'Logged out successfully'
      });
    });

    test('should throw logout errors to be handled by middleware', async () => {
      // Setup request with authorization header
      mockRequest.headers = {
        authorization: 'Bearer token-123'
      };
      
      // Mock the service to throw an error
      const error = new Error('Session not found');
      (authService.signOut as jest.Mock).mockRejectedValue(error);

      // Call the controller method and expect it to throw
      await expect(authController.logout(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Session not found');
    });
  });

  describe('getMe', () => {
    test('should return the current user', async () => {
      // Setup request with authenticated user
      (mockRequest as AuthenticatedRequest).user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User'
        }
      };

      // Call the controller method
      await authController.getMe(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toEqual({
        status: 'success',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            fullName: 'Test User'
          }
        }
      });
    });

    test('should return 401 if user is not authenticated', async () => {
      // Setup request with no user (not authenticated)
      (mockRequest as AuthenticatedRequest).user = undefined;

      // Call the controller method
      await authController.getMe(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(responseObject).toEqual({
        status: 'error',
        message: 'Not authenticated'
      });
    });
  });
}); 