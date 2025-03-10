import { Request, Response } from 'express';
import { corsMiddleware } from '../../middleware/cors';

describe('CORS Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext = jest.fn();

  beforeEach(() => {
    mockRequest = {
      method: 'GET'
    };
    
    mockResponse = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
    
    mockNext = jest.fn();
  });

  test('should add CORS headers to the response', () => {
    corsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    expect(mockResponse.header).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Request-Method, Access-Control-Request-Headers'
    );
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    
    expect(mockNext).toHaveBeenCalled();
  });

  test('should handle OPTIONS preflight requests', () => {
    mockRequest.method = 'OPTIONS';
    
    corsMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    expect(mockResponse.status).toHaveBeenCalledWith(204);
    expect(mockResponse.end).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
}); 