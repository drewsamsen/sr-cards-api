/**
 * Utility functions for converting between snake_case and camelCase
 */

/**
 * Converts a string from snake_case to camelCase
 */
export const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Converts a string from camelCase to snake_case
 */
export const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Converts an object's keys from snake_case to camelCase
 */
export const snakeToCamelObject = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamelObject(item)) as any;
  }

  return Object.keys(obj).reduce((result, key) => {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    
    result[camelKey] = typeof value === 'object' && value !== null
      ? snakeToCamelObject(value)
      : value;
      
    return result;
  }, {} as Record<string, any>);
};

/**
 * Converts an object's keys from camelCase to snake_case
 */
export const camelToSnakeObject = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnakeObject(item)) as any;
  }

  return Object.keys(obj).reduce((result, key) => {
    const snakeKey = camelToSnake(key);
    const value = obj[key];
    
    result[snakeKey] = typeof value === 'object' && value !== null
      ? camelToSnakeObject(value)
      : value;
      
    return result;
  }, {} as Record<string, any>);
}; 