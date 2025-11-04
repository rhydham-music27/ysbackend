## API Testing Guide (Postman)

This guide helps you validate the backend API end-to-end using Postman. It covers environment setup, running the server, testing authentication (local + Google OAuth), protected endpoints, leads, and class conversion.

### Prerequisites
- Node.js and npm installed
- MongoDB running (local or Atlas)
- `.env` configured (you mentioned this is already filled)

Required env variables currently used by the code:
- `API_VERSION`, `ALLOWED_ORIGINS`, `NODE_ENV`
- `MONGODB_URI` (and optionally `DB_NAME` if used)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL` (optional; used only for Google OAuth redirect)

### Start the Server
```bash
npm install
npm run dev
# Server default: http://localhost:5000
```

### Postman Environment
Create a Postman Environment with the following variables:
- `baseUrl`: `http://localhost:5000`
- `apiVersion`: `v1`
- `accessToken`: will be set after login
- `refreshToken`: will be set after login

Use the URL pattern: `{{baseUrl}}/api/{{apiVersion}}/...`

---

## Authentication Tests (Local Email/Password)

### 1) Register
POST `{{baseUrl}}/api/{{apiVersion}}/auth/register`
Body (JSON):
```json
{
  "email": "user1@example.com",
  "password": "Passw0rd!",
  "profile": {"firstName": "User", "lastName": "One", "phone": "9999999999"},
  "role": "student"
}
```
Expected: `201 Created`, response contains `{ user, accessToken, refreshToken }`.

Actions:
- Save `data.accessToken` as `accessToken` env var
- Save `data.refreshToken` as `refreshToken` env var

### 2) Login
POST `{{baseUrl}}/api/{{apiVersion}}/auth/login`
Body (JSON):
```json
{ "email": "user1@example.com", "password": "Passw0rd!" }
```
Expected: `200 OK`, returns token pair. Update `accessToken` and `refreshToken` in Postman.

### 3) Get Current User (Protected)
GET `{{baseUrl}}/api/{{apiVersion}}/auth/me`
Headers:
- `Authorization: Bearer {{accessToken}}`

Expected: `200 OK`, returns `{ user }`.

### 4) Refresh Token
POST `{{baseUrl}}/api/{{apiVersion}}/auth/refresh`
Body (JSON):
```json
{ "refreshToken": "{{refreshToken}}" }
```
Expected: `200 OK`, new `{ accessToken, refreshToken }`. Update both Postman env vars.

### 5) Logout (Protected)
POST `{{baseUrl}}/api/{{apiVersion}}/auth/logout`
Headers:
- `Authorization: Bearer {{accessToken}}`

Expected: `200 OK`, refresh token cleared.

---

## Google OAuth Tests

Pre-setup:
- Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` are correct.
- In Google Cloud Console, add redirect URI: `http://localhost:5000/api/v1/auth/google/callback`.

### 1) Initiate
Open in browser (not Postman):
```
{{baseUrl}}/api/{{apiVersion}}/auth/google
```
Approve Google consent → it redirects to callback.

### 2) Callback
- If `FRONTEND_URL` is set in `.env`, you will be redirected there with `accessToken` and `refreshToken` query params. Copy tokens to Postman env.
- If `FRONTEND_URL` is not set, the API returns JSON with `{ user, accessToken, refreshToken }`. Copy tokens to Postman env.

### 3) Verify Protected Access
GET `{{baseUrl}}/api/{{apiVersion}}/auth/me` with `Authorization: Bearer {{accessToken}}`
Expected: `200 OK` with `{ user }`.

Notes:
- If an existing LOCAL user with same email logs in via Google, their account is linked (provider changes to google, `googleId` set).
- Deactivated users cannot log in.

---

## Leads API

All endpoints below require a valid `Authorization: Bearer {{accessToken}}`.

### 1) Create Lead
POST `{{baseUrl}}/api/{{apiVersion}}/leads`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON) example:
```json
{
  "parentsName": "Parent A",
  "studentName": "Student A",
  "contactNumber": "9999999999",
  "classAndBoard": {"classLevel": "10", "board": "CBSE"},
  "subjectsRequired": ["maths", "science"],
  "preferredTuitionMode": "online",
  "preferredTutor": "no_preference",
  "leadSource": "WhatsApp",
  "leadStatus": "DEMO SCHEDULE",
  "paymentReceived": {"received": false}
}
```
Expected: `201/200`, returns created lead (note: responses include both `_id` and `leadId`).

### 2) List Leads
GET `{{baseUrl}}/api/{{apiVersion}}/leads`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, array of leads.

### 3) Get Lead by ID
GET `{{baseUrl}}/api/{{apiVersion}}/leads/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, a lead document.

---

## Final Class Conversion

Preconditions:
- Lead status should be “DEMO APPROVED BY PARENT” and payment received (per your business rules).

### Convert Lead → Final Class
POST `{{baseUrl}}/api/{{apiVersion}}/classes/convert`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{
  "leadId": "<LEAD_ID_OR_leadId>",
  "cityCode": "BPL",
  "tutorAssigned": "<OPTIONAL_USER_ID>",
  "tutorTier": "A",
  "firstMonthStartDate": "2025-07-01",
  "monthStartDate": "2025-07-01"
}
```
Expected: `200 OK`, created final class details.

---

## Common Issues & Tips
- 401 on protected routes: ensure `Authorization` header is present and `accessToken` is not expired.
- 401 on refresh: ensure `refreshToken` matches the one stored for the user; if not, log in again.
- Google OAuth error: check `GOOGLE_*` envs and redirect URI setup in Google Console.
- CORS errors during frontend testing: update `ALLOWED_ORIGINS` in `.env`.

---

## Quick Smoke Test Sequence (Minimal)
1. Register → store tokens
2. GET `/auth/me` with `accessToken`
3. Refresh token → store new tokens
4. Create a lead → capture leadId
5. Try list leads → see your lead
6. (Optional) Convert lead to final class
7. Logout → ensure `refreshToken` no longer works


