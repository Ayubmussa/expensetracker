# 📋 ExpenseTracker API Documentation

## Overview

The ExpenseTracker application uses **Supabase** as its backend-as-a-service, providing a RESTful API interface with automatic authentication and Row Level Security (RLS). The application supports dual-mode operation with both online (Supabase) and offline (localStorage) capabilities.

## Base URL

```
https://azspcwkyrbhinewreupu.supabase.co
```

## Authentication

The API uses **JWT Bearer Token** authentication for all protected endpoints. Users must authenticate via Supabase Auth to access user-specific data.

### Headers Required

```http
Authorization: Bearer {access_token}
apikey: {supabase_anon_key}
Content-Type: application/json
```

---

## 🔐 Authentication Endpoints

### 1. User Registration

**POST** `/auth/v1/signup`

Register a new user account with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.M8KJCq7X9Y...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "created_at": "2025-06-24T10:00:00Z"
  }
}
```

### 2. User Login

**POST** `/auth/v1/token?grant_type=password`

Authenticate existing user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.M8KJCq7X9Y...",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com"
  }
}
```

### 3. Password Reset Request

**POST** `/auth/v1/recover`

Send password reset email to user.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Check your email for the login link"
}
```

### 4. Password Update

**PUT** `/auth/v1/user`

Update user password (requires authentication).

**Request Body:**
```json
{
  "password": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "updated_at": "2025-06-24T10:30:00Z"
  }
}
```

### 5. Get Current User

**GET** `/auth/v1/user`

Retrieve current authenticated user information.

**Response (200):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "created_at": "2025-06-24T10:00:00Z",
    "updated_at": "2025-06-24T10:30:00Z"
  }
}
```

### 6. Logout

**POST** `/auth/v1/logout`

Invalidate current session and access token.

**Response (204):** Empty response

---

## 💰 Expense Management Endpoints

### 1. Get All Expenses

**GET** `/rest/v1/expenses`

Retrieve all expenses for the authenticated user (RLS automatically filters by user).

**Query Parameters:**
- `select` (optional): Specify fields to return
- `order` (optional): Sort order (e.g., `date.desc`)
- `limit` (optional): Limit number of results

**Example:**
```
GET /rest/v1/expenses?select=*&order=date.desc&limit=50
```

**Response (200):**
```json
[
  {
    "id": "exp_123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 25.50,
    "description": "Coffee shop",
    "category": "Food & Dining",
    "date": "2025-06-24",
    "created_at": "2025-06-24T10:00:00Z",
    "updated_at": "2025-06-24T10:00:00Z"
  }
]
```

### 2. Create Single Expense

**POST** `/rest/v1/expenses`

Add a new expense for the authenticated user.

**Request Body:**
```json
{
  "amount": 25.50,
  "description": "Coffee shop",
  "category": "Food & Dining",
  "date": "2025-06-24"
}
```

**Response (201):**
```json
{
  "id": "exp_123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 25.50,
  "description": "Coffee shop",
  "category": "Food & Dining",
  "date": "2025-06-24",
  "created_at": "2025-06-24T10:00:00Z",
  "updated_at": "2025-06-24T10:00:00Z"
}
```

### 3. Create Multiple Expenses (Bulk)

**POST** `/rest/v1/expenses`

Add multiple expenses in a single request.

**Request Body:**
```json
[
  {
    "amount": 25.50,
    "description": "Coffee shop",
    "category": "Food & Dining",
    "date": "2025-06-24"
  },
  {
    "amount": 15.00,
    "description": "Lunch",
    "category": "Food & Dining",
    "date": "2025-06-24"
  }
]
```

**Response (201):**
```json
[
  {
    "id": "exp_123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 25.50,
    "description": "Coffee shop",
    "category": "Food & Dining",
    "date": "2025-06-24",
    "created_at": "2025-06-24T10:00:00Z",
    "updated_at": "2025-06-24T10:00:00Z"
  },
  {
    "id": "exp_456e7890-e12b-34c5-d678-901234567890",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 15.00,
    "description": "Lunch",
    "category": "Food & Dining",
    "date": "2025-06-24",
    "created_at": "2025-06-24T10:01:00Z",
    "updated_at": "2025-06-24T10:01:00Z"
  }
]
```

### 4. Update Expense

**PATCH** `/rest/v1/expenses?id=eq.{expense_id}`

Update an existing expense.

**Request Body:**
```json
{
  "amount": 30.00,
  "description": "Updated coffee shop",
  "category": "Food & Dining"
}
```

**Response (200):**
```json
{
  "id": "exp_123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "amount": 30.00,
  "description": "Updated coffee shop",
  "category": "Food & Dining",
  "date": "2025-06-24",
  "created_at": "2025-06-24T10:00:00Z",
  "updated_at": "2025-06-24T10:30:00Z"
}
```

### 5. Delete Expense

**DELETE** `/rest/v1/expenses?id=eq.{expense_id}`

Delete an existing expense.

**Response (204):** Empty response

### 6. Get Expense by ID

**GET** `/rest/v1/expenses?id=eq.{expense_id}`

Retrieve a specific expense by ID.

**Response (200):**
```json
[
  {
    "id": "exp_123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "amount": 25.50,
    "description": "Coffee shop",
    "category": "Food & Dining",
    "date": "2025-06-24",
    "created_at": "2025-06-24T10:00:00Z",
    "updated_at": "2025-06-24T10:00:00Z"
  }
]
```

---

## 🏷️ Category Management Endpoints

### 1. Get All Categories

**GET** `/rest/v1/categories`

Retrieve all available expense categories.

**Response (200):**
```json
[
  {
    "id": "cat_001",
    "name": "Food & Dining",
    "color": "#FF6B6B",
    "icon": "🍽️",
    "created_at": "2025-06-24T09:00:00Z"
  },
  {
    "id": "cat_002",
    "name": "Transportation",
    "color": "#4ECDC4",
    "icon": "🚗",
    "created_at": "2025-06-24T09:00:00Z"
  }
]
```

---

## 📊 Summary & Analytics Endpoints

### 1. Get Expense Summary

**GET** `/rest/v1/rpc/get_expense_summary`

Get summarized expense data including totals by category.

**Query Parameters:**
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date

**Example:**
```
**GET** '/rest/v1/rpc/get_expense_summary?start_date=2025-06-01&end_date=2025-06-30'
```

**Response (200):**
```json
{
  "total_expenses": 150.75,
  "expense_count": 8,
  "categories": [
    {
      "category": "Food & Dining",
      "total": 85.50,
      "count": 5,
      "percentage": 56.7
    },
    {
      "category": "Transportation",
      "total": 65.25,
      "count": 3,
      "percentage": 43.3
    }
  ]
}
```

---

## 🛡️ Security Features

### Row Level Security (RLS)
- **User Isolation**: Each user can only access their own expense data
- **Automatic Filtering**: Database-level security prevents data leaks
- **Policy-Based Access**: Granular control over data operations

### Authentication Security
- **JWT Tokens**: Secure session management with automatic expiration
- **Password Hashing**: Secure password storage using bcrypt
- **Email Verification**: Optional email confirmation for new accounts
- **Refresh Tokens**: Automatic token renewal for extended sessions

### API Security
- **HTTPS Only**: All communications encrypted in transit
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Server-side validation of all inputs
- **CSRF Protection**: Cross-site request forgery prevention

---

## 🔄 Offline Mode & LocalStorage

### Offline Operation
The application automatically falls back to localStorage when:
- User is not authenticated (Offline Mode)
- Network connection is unavailable
- Supabase backend is unreachable

### LocalStorage Schema
```typescript
// Stored in localStorage with key: 'expenseTracker_expenses'
interface StoredExpense {
  id: string;
  user_id: string; // Generated offline user ID
  amount: number;
  description: string;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
}
```

### Sync Strategy
- **Online Mode**: Primary storage in Supabase, backup in localStorage
- **Offline Mode**: Primary storage in localStorage only
- **Automatic Sync**: When connection is restored, local data can be synced

---

## 📝 Error Handling

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate data) |
| 500 | Internal Server Error |


### Environment Variables
```json
{
  "BASE_URL": "https://azspcwkyrbhinewreupu.supabase.co",
  "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "ACCESS_TOKEN": "{{ACCESS_TOKEN}}",
  "USER_ID": "{{USER_ID}}",
  "EXPENSE_ID": "{{EXPENSE_ID}}"
}
