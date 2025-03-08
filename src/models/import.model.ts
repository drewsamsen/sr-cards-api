// Database model (matches PostgreSQL snake_case)
export interface ImportDB {
  id: string;
  user_id: string;
  deck_id: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  csv_data: string;
  parsed_data: any;
  summary: ImportSummary;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// API model (uses JavaScript camelCase convention)
export interface Import {
  id: string;
  userId: string;
  deckId: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  csvData: string;
  parsedData: any;
  summary: ImportSummary;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

// Import summary interface
export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  skippedHeaderRows?: number[];
  errors?: ImportError[];
}

// Import error interface
export interface ImportError {
  row: number;
  message: string;
}

// Request DTOs
export interface CreateImportPreviewDTO {
  deckId: string;
  csvData: string;
  debug?: boolean;
}

export interface ConfirmImportDTO {
  importId: string;
}

// Response DTOs
export interface ImportPreviewResponse {
  import: {
    id: string;
    deckId: string;
    status: string;
    summary: ImportSummary;
    expiresAt: string;
    message?: string;
  };
  preview: CardPreview[];
}

export interface CardPreview {
  front: string;
  back: string;
  tags?: string[];
  status: 'valid' | 'invalid';
  error?: string;
}

export interface ImportResultResponse {
  importId: string;
  status: string;
  summary: ImportSummary;
} 