# Flash Deal Reservation API

A robust backend API for flash deal product reservations with Redis-based stock management and MongoDB persistence.

## Features

- **Stock Management**: Real-time stock tracking with Redis for high-performance reservations
- **Concurrent Safety**: Prevents overselling with atomic operations and proper locking
- **Auto-Expiry**: Reservations automatically expire after 10 minutes (configurable)
- **Batch Operations**: Reserve multiple products in a single transaction
- **User Management**: JWT-based authentication with role-based access control
- **Order Processing**: Complete order lifecycle from reservation to fulfillment
- **Rate Limiting**: Built-in protection against abuse
- **Comprehensive Validation**: Input validation on all endpoints
- **Professional Architecture**: Clean separation of concerns with service layer pattern

## Tech Stack

- **Node.js** with Express.js
- **MongoDB** for persistent data storage
- **Redis** for real-time stock management and caching
- **JWT** for authentication
- **Joi** for input validation
- **Winston** for logging

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Ensure MongoDB and Redis are running:
   - MongoDB: `mongodb://localhost:27017`
   - Redis: `localhost:6379`

5. Start the server:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Products
- `POST /api/products` - Create product (Admin only)
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `GET /api/products/sku/:sku` - Get product by SKU
- `GET /api/products/:id/stock-status` - Get detailed stock status
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Deactivate product (Admin only)

### Reservations
- `POST /api/products/reserve` - Reserve single product
- `POST /api/products/reserve-batch` - Reserve multiple products
- `DELETE /api/products/reservations/:reservationId` - Cancel reservation
- `GET /api/products/reservations/my` - Get user reservations

### Orders
- `POST /api/orders` - Create order from reservation
- `POST /api/orders/batch` - Create batch order
- `GET /api/orders/my` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status (Admin only)
- `DELETE /api/orders/:id` - Cancel order
- `GET /api/orders/stats` - Get order statistics (Admin only)

### Users (Admin only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user

## Usage Examples

### 1. Create a Product
```bash
POST /api/products
Authorization: Bearer <admin-token>

{
  "name": "Flash Deal Smartphone",
  "description": "Latest smartphone with amazing features",
  "sku": "PHONE001",
  "price": 299.99,
  "totalStock": 200,
  "category": "Electronics",
  "flashDealSettings": {
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-01T23:59:59Z",
    "maxReservationTime": 600
  }
}
```

### 2. Reserve a Product
```bash
POST /api/products/reserve
Authorization: Bearer <user-token>

{
  "productId": "product_id_here",
  "quantity": 2
}
```

### 3. Create Order from Reservation
```bash
POST /api/orders
Authorization: Bearer <user-token>

{
  "reservationId": "reservation_id_here",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

## Architecture

### Project Structure
```
src/
├── config/          # Database and Redis configuration
├── controllers/     # Request handlers
├── middleware/      # Authentication, validation, error handling
├── models/          # MongoDB schemas
├── routes/          # API routes
├── services/        # Business logic layer
├── utils/           # Utilities (logger, etc.)
├── validators/      # Input validation schemas
└── server.js        # Main application entry point
```

### Key Components

1. **Redis Service**: Handles all stock reservations with atomic operations
2. **Product Service**: Business logic for product operations
3. **Order Service**: Order processing and management
4. **User Service**: Authentication and user management
5. **Controllers**: Thin layer that handles HTTP requests/responses
6. **Validators**: Comprehensive input validation using Joi

## Concurrency Handling

The system uses Redis atomic operations and transactions to ensure:
- No overselling even under high concurrency
- Consistent stock counts across multiple requests
- Automatic cleanup of expired reservations
- Transaction rollback for batch operations

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/flash_deal_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Reservation Configuration
RESERVATION_TTL_SECONDS=600
```

## Error Handling

The API provides comprehensive error handling with:
- Detailed error messages
- Proper HTTP status codes
- Structured error responses
- Logging for debugging and monitoring

## Rate Limiting

Built-in rate limiting to prevent abuse:
- General API: 100 requests per 15 minutes
- Authentication: 5 requests per 15 minutes
- Reservations: 10 requests per minute

## Logging

Structured logging with Winston:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

MIT License
