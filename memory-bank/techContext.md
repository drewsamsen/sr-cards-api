# Technical Context

## Technologies Used

### Core Technologies
- **TypeScript**: For type safety and improved developer experience
- **Node.js**: JavaScript runtime for server-side code
- **Express.js**: Web framework for building the REST API
- **PostgreSQL**: Relational database for data storage
- **Supabase**: For authentication and database management

### Development Tools
- **ESLint**: For code linting
- **Jest**: For unit and integration testing
- **Docker**: For containerized local development
- **Supabase CLI**: For local Supabase development

### Libraries & Dependencies
- **OpenAI API**: For AI-powered content explanation
- **dotenv**: For environment variable management
- **cors**: For cross-origin resource sharing
- **helmet**: For securing HTTP headers

## Development Setup

### Local Environment
1. **Node.js** (v16 or higher)
2. **Docker Desktop** (for local Supabase)
3. **NPM** (for package management)
4. **Supabase CLI** (for local Supabase instance)

### Environment Configuration
- `.env.development`: For local development
- `.env.production`: For production deployment
- Key variables:
  - Database connection details
  - Supabase credentials
  - OpenAI API key
  - Port and node environment

### Running Locally
- **Development Mode**: `npm run dev`
- **Production Mode**: `npm run start:prod`
- **Supabase Management**:
  - Start: `npm run supabase:start`
  - Stop: `npm run supabase:stop`
  - Studio: `npm run supabase:studio`

## Technical Constraints

### Performance Constraints
- Must handle concurrent API requests efficiently
- Should optimize database queries for large card collections
- Must implement efficient batch operations for CSV imports

### Security Constraints
- All user data must be protected
- Authentication required for all non-public endpoints
- Database credentials must be securely stored
- Input validation for all API endpoints

### Scalability Constraints
- Architecture must support growing user bases
- Database design must accommodate large card collections
- API must maintain performance with increasing load

## Dependencies

### External Services
- **Supabase**: For authentication and database
- **OpenAI API**: For AI-powered content explanation

### Critical Dependencies
- PostgreSQL compatibility
- Supabase authentication mechanism
- FSRS algorithm implementation

## Deployment

### Production Environment
- Node.js hosting environment
- PostgreSQL database service
- Supabase cloud instance
- Environment variables configuration

### Deployment Process
1. Build TypeScript code: `npm run build:prod`
2. Set up production environment variables
3. Deploy to hosting platform
4. Verify API functionality

## Monitoring & Maintenance
- API logging for troubleshooting
- Error tracking for identifying issues
- Performance monitoring for optimizations
- Regular database backups
- Dependency updates and security patches 