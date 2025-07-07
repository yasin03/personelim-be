<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Personelim API - Copilot Instructions

This is a Node.js backend API project for user authentication using Express.js, Firebase Firestore, JWT tokens, and bcrypt password hashing.

## Project Context

- **Framework**: Express.js
- **Database**: Firebase Firestore
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: express-validator
- **Security**: CORS, Helmet middleware
- **Development**: Nodemon for auto-reload

## Code Style Guidelines

### Error Handling

- Always use try-catch blocks in async functions
- Return proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Include descriptive error messages
- Log errors with console.error for debugging

### API Response Format

- Success responses should include message, data, and token (if applicable)
- Error responses should include error type and message
- Use consistent JSON structure across all endpoints

### Security Best Practices

- Never return passwords in API responses
- Hash passwords using bcrypt with 12 salt rounds
- Validate all input using express-validator
- Use JWT tokens for authentication
- Include role-based access control

### Firebase/Firestore

- Use the configured Firebase Admin SDK
- Store users in the 'users' collection
- Include timestamps (createdAt, updatedAt)
- Use proper Firestore queries and error handling

### Authentication

- JWT tokens should include uid, email, and role
- Tokens expire in 24h by default
- Use Bearer token format in Authorization header
- Implement proper token verification middleware

## File Structure

- `/config/firebase.js` - Firebase Admin SDK configuration
- `/middleware/auth.js` - Authentication middleware
- `/routes/auth.js` - Authentication routes (register, login, me)
- `server.js` - Main application server
- `.env` - Environment variables (not committed)

## Environment Variables

- JWT_SECRET - Secret key for JWT signing
- FIREBASE_PROJECT_ID - Firebase project identifier
- FIREBASE_SERVICE_ACCOUNT_KEY - Firebase service account JSON
- PORT - Server port (default: 3000)

When generating code, ensure it follows these patterns and integrates well with the existing codebase.
