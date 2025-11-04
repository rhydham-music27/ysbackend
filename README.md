## Your Shikshak Management System - Backend API

### Description
Your Shikshak is an EdTech platform designed to support five user roles: Admin, Manager, Teacher, Class Coordinator, and Student. This repository contains the backend API built with Node.js, TypeScript, Express, and MongoDB.

### Tech Stack
- Node.js with TypeScript
- Express.js framework
- MongoDB with Mongoose
- JWT & OAuth authentication (Passport.js with Google OAuth 2.0)
- Cloudinary for file storage

### Project Structure (MVC)
```
src/
  config/        # configuration: db, passport, cloudinary, logger, permissions (future)
  controllers/   # controllers (future)
  middlewares/   # middlewares: auth, rbac, validation, error handlers, upload (future)
  models/        # mongoose models (future)
  routes/        # routes (future)
  services/      # business logic (future)
  types/         # shared types & enums
  utils/         # helpers & utilities (future)
  app.ts         # express app setup
  server.ts      # server bootstrap
```

### Setup Instructions
#### Prerequisites
- Node.js (LTS recommended)
- MongoDB instance (local or cloud)

#### Install Dependencies
```bash
npm install
```

#### Environment Setup
1. Copy the example environment file and fill values:
```bash
cp .env.example .env
```
2. Update the variables as needed.

#### Run the Application
- Development: auto-reload with TypeScript transpile-only
```bash
npm run dev
```

- Production build and start
```bash
npm run build
npm start
```

### Development
- Linting
```bash
npm run lint
```

- Code formatting
```bash
npm run format
```

### API Documentation
Swagger/OpenAPI documentation will be added in a future phase.

## Authentication

This project uses JWT-based authentication:
- Users register or log in to receive an access token (short-lived) and a refresh token (long-lived).
- The access token is used in the Authorization header for protected APIs: `Authorization: Bearer <accessToken>`.
- When the access token expires, the refresh token can be exchanged for a new token pair.
- Logging out invalidates the stored refresh token to prevent reuse.

### Local Authentication (Email/Password)
- Standard register/login flow using email and password
- Returns a token pair: `{ accessToken, refreshToken }`
- Access token is used for protected endpoints; refresh token obtains a new pair

### Google OAuth 2.0 Authentication
1. User clicks "Login with Google" → redirects to `/api/v1/auth/google`
2. User grants permission on Google's consent screen
3. Google redirects to `/api/v1/auth/google/callback` with an authorization code
4. Backend exchanges the code for profile/email, finds or creates user, and generates JWT tokens
5. Returns the same `{ accessToken, refreshToken }` pair as local auth

Notes:
- If a user exists with the same email (LOCAL provider), the Google account is linked automatically
- OAuth users have `isEmailVerified = true`
- Deactivated accounts cannot log in

## API Endpoints

- POST `/api/v1/auth/register` — Register new user
- POST `/api/v1/auth/login` — User login
- POST `/api/v1/auth/logout` — User logout (protected)
- POST `/api/v1/auth/refresh` — Refresh access token
- GET `/api/v1/auth/me` — Get current user (protected)

#### OAuth Endpoints
- GET `/api/v1/auth/google` — Initiate Google OAuth flow
- GET `/api/v1/auth/google/callback` — OAuth callback handler
- GET `/api/v1/auth/google/failure` — OAuth failure handler

### Leads
- POST `/api/v1/leads` — Create a lead (protected)
- GET `/api/v1/leads` — List leads (protected)
- GET `/api/v1/leads/:id` — Get a lead by id (protected)

Notes:
- Lead responses include both `_id` and `leadId` (virtual alias of `_id`). Use either when calling related endpoints.

### Classes
- POST `/api/v1/classes/convert` — Convert an approved + paid lead into a final class (protected)
  - Body: `{ leadId, cityCode, tutorAssigned?, tutorTier?, firstMonthStartDate?, monthStartDate? }`

## Environment Variables

Add these variables to your `.env` file (see `.env.example`):
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Google OAuth (add these):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (e.g. `http://localhost:5000/api/v1/auth/google/callback`)
- `FRONTEND_URL` (optional redirect target for OAuth web flows)

Note: Use strong, unique secrets for JWT; you can generate with `openssl rand -base64 32`.

## Testing Authentication (dev examples)

Login:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

Get current user (replace ACCESS_TOKEN):
```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Lead and Class Examples

Create a lead:
```bash
curl -X POST http://localhost:5000/api/v1/leads \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentsName":"Parent A",
    "studentName":"Student A",
    "contactNumber":"9999999999",
    "classAndBoard":{"classLevel":"10","board":"CBSE"},
    "subjectsRequired":["maths","science"],
    "preferredTuitionMode":"online",
    "preferredTutor":"no_preference",
    "leadSource":"WhatsApp",
    "leadStatus":"DEMO SCHEDULE",
    "paymentReceived":{"received":false}
  }'
```

Convert to final class (after status is "DEMO APPROVED BY PARENT" and payment received):
```bash
curl -X POST http://localhost:5000/api/v1/classes/convert \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId":"<LEAD_ID_OR_leadId>",
    "cityCode":"BPL",
    "tutorAssigned":"<USER_ID_OPTIONAL>",
    "tutorTier":"A",
    "firstMonthStartDate":"2025-07-01",
    "monthStartDate":"2025-07-01"
  }'
```

### License
This project is licensed under the MIT License.

## Google OAuth Setup
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable Google People API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure the OAuth consent screen (app name, support email, scopes)
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/v1/auth/google/callback`
   - Production: `https://yourdomain.com/api/v1/auth/google/callback`
7. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
8. Test the flow in your browser


