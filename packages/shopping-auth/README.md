# Shopping Backend Service (`packages/shopping`)

This is the core REST API backend for the shopping application, built using the [LoopBack 4](https://loopback.io/) Node.js framework. It is responsible for user accounts, product management, shopping carts, and order checkout flows.

---

## 1. Project Structure

The project conforms to the standard LoopBack 4 directory design:

```
src/
├── controllers/      # Handles incoming REST requests and defines API specs
├── models/           # Defines database schemas and entity representations
├── repositories/     # Bridges controllers to database datasources
├── datasources/      # Connection configurations for MongoDB and Redis
├── services/         # Encapsulates business and authentication logic
├── keys.ts           # Token/Service injection binding keys
└── application.ts    # Application bootstrap configuration
```

---

## 2. Startup Instructions

### Prerequisites

- Node.js >= 20.0.0
- Running instances of MongoDB and Redis.

### Standalone Local Development

1. Change into this package directory:
   ```bash
   cd packages/shopping
   ```
2. Build the project code:
   ```bash
   npm run build
   ```
3. Run the backend service:
   ```bash
   npm start
   ```
   _The server starts on `http://localhost:3000`._

---

## 3. Environment Variables Guide

Configure these environment variables in your environment or via a local `.env` file inside this directory:

| Environment Variable                 | Default Value                                 | Purpose                                                     |
| ------------------------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| `HOST`                               | `127.0.0.1`                                   | The host the LoopBack server binds to.                      |
| `PORT`                               | `3000`                                        | The port the LoopBack server binds to.                      |
| `MONGODB_URL`                        | `mongodb://127.0.0.1:27017/shopping`          | MongoDB datasource URL connection string.                   |
| `REDIS_HOST`                         | `127.0.0.1`                                   | Redis cart database host.                                   |
| `REDIS_PORT`                         | `6379`                                        | Redis cart database port.                                   |

| `ALLOWED_ORIGINS`                    | `http://localhost:8080,http://localhost:5173` | Allowed CORS domains for frontend clients.                  |

---

## 4. Test Accounts

The following test users are preloaded into the MongoDB database upon boot (using fixtures located in `fixtures/users`):

- **Admin User**:
  - Email: `admin@example.com`
  - Password: `admin12345678`
  - Role: `admin` (Can execute product editing and configuration)
- **Support User**:
  - Email: `support@example.com`
  - Password: `support12345678`
  - Role: `support`
- **Standard Customer User 1**:
  - Email: `john@example.com`
  - Password: `john12345678`
  - Role: `customer` (General cart and order placement)
- **Standard Customer User 2**:
  - Email: `jane@example.com`
  - Password: `jane12345678`
  - Role: `customer`

---

## 5. API Documentation Location

- **Interactive API Explorer (Swagger)**:
  - Access Path: `http://localhost:3000/explorer`
  - This provides a GUI to experiment with all endpoints, including authentication (`/users/login`) and cart CRUD actions.
- **OpenAPI Schema Document**:
  - Access Path: `http://localhost:3000/openapi.json`

---

## 6. Completed & Pending Items

### Completed Items

- [x] Implemented core model entities (User, Product, Order, Shopping Cart).
- [x] Integrated MongoDB connector for persistent storage (users & orders).
- [x] Integrated Redis connector for volatile shopping cart records.
- [x] Secured routes using custom JWT Authentication and basic role authorization voters.
- [x] Configured dynamic CORS mapping matching multiple web client origins.

### Pending Items (Backlog)

- [ ] Add rate limiting middleware to prevent brute force requests.
- [ ] Transition mock checkout flow to secure Stripe payment gateway interfaces.
- [ ] Write integration test cases covering end-to-end user checkout.

---

## 7. Design Trade-offs & Decisions

### LoopBack 4 Framework

- **Decision**: Adopted the LoopBack 4 framework for API generation.
- **Trade-off**: Provides comprehensive out-of-the-box abstractions (repository pattern, OpenAPI generation, dependency injection). However, it adds boilerplates (numerous decorator files) and introduces a steeper learning curve for developers unfamiliar with TypeScript OOP-heavy frameworks.

### Hybrid Database Architecture (MongoDB + Redis)

- **Decision**: Storing orders and accounts persistently in MongoDB, while cart items reside in Redis.
- **Trade-off**: High speed for cart read/write updates and automatic data expiration capability. However, it increases the complexity of service deployments since both MongoDB and Redis clusters must be running in the target infrastructure.
