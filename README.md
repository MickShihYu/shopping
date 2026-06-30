# Shopping Application Monorepo

This repository is a Lerna-based monorepo containing a multi-service online shopping application. It features a modern web interface, a LoopBack 4 REST API backend, and an Express-based recommendation engine communicating via REST.

---

## 1. Project Structure & Architecture

The application is split into four main packages under the `packages/` directory:

- **[shopping-frontend](packages/shopping-frontend)**: A React-based Single Page Application built with TypeScript and Vite. It is served using an Nginx container in production/Docker modes.
- **[shopping-auth](packages/shopping-auth)**: User authentication, JWT issuance, and Role-Based Access Control service.
- **[shopping-product](packages/shopping-product)**: Product catalog and inventory management service.
- **[shopping-order](packages/shopping-order)**: Shopping cart and order placement service.

---

## 2. Startup Instructions

### Prerequisites

- Node.js 18.x
- Docker and Docker Compose

### Option A: Complete Docker Compose Startup (Recommended)

This starts all services in background containers, simulating the production microservices architecture. It will spin up MongoDB, Redis, three independent backend services (Product, Order, Auth), and a Frontend Nginx container configured with an API reverse proxy:

```bash
docker compose up --build -d
```

Once started, the services are available at:

- **Frontend URL**: `http://localhost:8080` (React SPA served by Nginx, which also reverse proxies `/users`, `/products`, `/orders`, etc., to the backend microservices)
- **Product API (Direct)**: `http://localhost:3001`
- **Order API (Direct)**: `http://localhost:3002`
- **Auth API (Direct)**: `http://localhost:3003`

### Option B: Local Development Startup

1. Install dependencies from the monorepo root:
   ```bash
   npm install
   ```
2. Start MongoDB and Redis databases via Docker:
   ```bash
   docker compose up -d mongodb redis
   ```
3. Start all services concurrently:
   ```bash
   npm start
   ```
   *This uses `concurrently` to start the frontend Vite dev server at `http://localhost:5173/`, and the three backend services at `http://localhost:3001/`, `http://localhost:3002/`, and `http://localhost:3003/`.*

### Database Initialization

If you are running the project for the first time or need to reset the database schemas, you can run the migration script from the monorepo root:

```bash
npm run migrate
```
*This command will execute the LoopBack 4 migration scripts for the Product and Order services, initializing the MongoDB collections and schemas.*

---

## 3. Environment Variables Guide

The following core environment variables can be customized in your environment configurations:

### Database & Cache
| Variable Name | Default Value | Description |
| --- | --- | --- |
| `MONGODB_URL` | `mongodb://127.0.0.1:27017/shopping-auth`<br>`mongodb://127.0.0.1:27017/shopping-order`<br>`mongodb://127.0.0.1:27017/shopping-product` | Base MongoDB connection URL. Each service uses a specific DB by default. |
| `TEST_MONGODB_URL` | `mongodb://127.0.0.1:27017/..._test` | MongoDB connection URL used for testing. |
| `REDIS_HOST` | `127.0.0.1` | Host address of the Redis server. |
| `REDIS_PORT` | `6379` | Port number of the Redis server. |
| `REDIS_DB` | `0` | Redis database index. |

### Microservices & Network
| Variable Name | Default Value | Description |
| --- | --- | --- |
| `PORT` / `HOST` | `3001`, `3002`, `3003` | Port and host bindings for individual LoopBack 4 microservices. |
| `ALLOWED_ORIGINS` | `http://localhost...` | Allowed CORS origins (comma-separated). |
| `VITE_API_URL` | `http://localhost:3000` | Frontend build-time variable pointing to the API gateway. |
| `PRODUCT_SERVICE_URL`| `http://127.0.0.1:3001` | URL of the product service (used internally). |
| `AUTH_SERVICE_URL` | `http://127.0.0.1:3003` | URL of the auth service (used internally). |

### Authentication & Security
| Variable Name | Default Value | Description |
| --- | --- | --- |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | *(None)* | Asymmetric keys for JWT signing and verification. |
| `JWT_ISSUER` | `shopping-service` | Issuer (`iss`) claim for JWT tokens. |
| `JWT_EXPIRES_IN` | `86400` | Expiration time for JWT tokens (in seconds). |

### Email Configuration (SMTP)
| Variable Name | Default Value | Description |
| --- | --- | --- |
| `SMTP_SERVER` / `SMTP_PORT` | *(None)* | SMTP server address and port for sending emails. |
| `SMTP_USERNAME` / `SMTP_PASSWORD`| *(None)* | Credentials for the SMTP server. |
| `APPLICATION_URL` | *(None)* | Base URL used for generating email links (e.g., password resets). |
| `PASSWORD_RESET_EMAIL_LIMIT` | `2` | Maximum password reset requests allowed per user. |

---

## 4. Test Accounts

Pre-seeded test credentials available for testing:

| Email                 | Password          | Role       | Usage                                                              |
| --------------------- | ----------------- | ---------- | ------------------------------------------------------------------ |
| `admin@example.com`   | `admin12345678`   | `admin`    | Full administrative dashboard and product catalog CRUD operations. |
| `support@example.com` | `support12345678` | `support`  | Support staff helper account.                                      |
| `john@example.com`    | `john12345678`    | `customer` | General e-commerce browsing, shopping cart, and checking out.      |
| `jane@example.com`    | `jane12345678`    | `customer` | General e-commerce browsing, shopping cart, and checking out.      |

---

## 5. API Documentation Locations

- **Product API Explorer**:
  - Live Interactive Swagger Page: `http://localhost:3001/explorer`
  - OpenAPI Specification JSON: `http://localhost:3001/openapi.json`
- **Order API Explorer**:
  - Live Interactive Swagger Page: `http://localhost:3002/explorer`
  - OpenAPI Specification JSON: `http://localhost:3002/openapi.json`
- **Auth API Explorer**:
  - Live Interactive Swagger Page: `http://localhost:3003/explorer`
  - OpenAPI Specification JSON: `http://localhost:3003/openapi.json`

---

## 6. Pending Items

- [ ] Optimize `/decrease-stock`: Migrate from MongoDB Atomic Update (Document-level Locking) to an asynchronous architecture (Redis → RabbitMQ → Worker).

---

## 7. Design Trade-offs & Decisions

### Microservices vs Monolith Architecture

- **Decision**: Adopted a microservices architecture (Auth, Product, Order) managed within a Lerna monorepo.
- **Trade-off**: Increases system scalability and allows independent deployment of services. However, it introduces operational complexity, such as cross-service communication overhead and the need to manage distributed data consistency.

### Frontend Decoupling (React + Vite SPA)

- **Decision**: Separated frontend assets out of the LoopBack 4 backend process into an independent package (`shopping-frontend`) built via Vite.
- **Trade-off**: Improved development iteration speed and enabled standard SPA build steps. However, it requires configuring CORS headers on the backend and deploying an additional Nginx proxy for frontend static files.

### Concurrency Control for Inventory (`/decrease-stock`)

- **Decision**: Initially utilized MongoDB Atomic Updates (Document-level Locking) for inventory management, with a planned migration to an asynchronous Message Queue architecture (Redis → RabbitMQ → Worker).
- **Trade-off**: The MongoDB locking approach is simpler to implement initially but may become a performance bottleneck under high concurrent load (e.g., flash sales). The asynchronous MQ approach provides much higher throughput and service decoupling, but adds system complexity and introduces eventual consistency challenges.

### Docker Multi-Stage Build Optimization

- **Decision**: The backend monorepo builder (`Dockerfile.monorepo`) filters out `shopping-frontend` compilation (`--ignore shopping-frontend`).
- **Trade-off**: Resolves native compilation issues with Vite/Rolldown under Alpine Linux and minimizes container image sizes. The downside is the need to maintain multiple Dockerfiles and build pipelines.

---

## 8. Testing

The monorepo includes various tests (Unit, Integration, and UI) across different packages.

To run all tests across all packages, execute the following from the root directory:
```bash
npm test
```
*This uses Lerna to run `npm test` within each package and streams the output.*

If you want to run tests for a specific backend service, you can use:
- `npm run test_auth`
- `npm run test_product`
- `npm run test_order`
