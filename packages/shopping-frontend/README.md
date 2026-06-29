# Shopping Frontend App (`packages/shopping-frontend`)

This is the decoupled frontend web interface for the shopping application. It is a React Single Page Application (SPA) utilizing TypeScript and built with [Vite](https://vite.dev/).

---

## 1. Project Structure

This React application uses a multi-entry HTML design to maintain compatibility with the original layout structure:

```
├── public/                 # Static assets (images, icons)
├── src/                    # React components, styles, and logic
│   ├── css/                # Custom CSS styling files
│   ├── js/                 # Logic handlers (authorization, services)
│   └── main.tsx            # Application bootstrapping scripts
├── index.html              # Login Page / Main Entrance
├── shoppy.html             # Customer dashboard
├── product.html            # Product details view
├── profile.html            # Customer profile page
├── product-management.html # Admin dashboard for catalog items
├── reset-password-init.html# Password reset flow start
├── reset-password-finish.html # Password reset flow completion
└── vite.config.ts          # Vite build multi-page inputs configuration
```

---

## 2. Startup Instructions

### Prerequisites

- Node.js >= 20.0.0

### Local Development Startup

1. Change into this package directory:
   ```bash
   cd packages/shopping-frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   _The hot-reloading dev page runs at `http://localhost:5173/`._

### Production Build & Nginx Execution

To compile optimized static assets:

```bash
npm run build
```

In docker environments, static production files inside the `dist/` directory are deployed inside an lightweight Nginx container running on port `80`.

---

## 3. Environment Variables Guide

Variables prefixed with `VITE_` are statically embedded by Vite during compilation:

| Environment Variable | Default Value           | Purpose                                        |
| -------------------- | ----------------------- | ---------------------------------------------- |
| `VITE_API_URL`       | `http://localhost:3000` | Points to the backend LoopBack 4 API host url. |

---

## 4. Test Accounts

Use the following test credentials to sign in and evaluate different UI access roles:

- **Administrator Profile** (Access to Admin Dashboard at `product-management.html`):
  - Email: `admin@example.com`
  - Password: `admin12345678`
- **Customer Profile** (Access to Cart & Catalog Shopping at `shoppy.html`):
  - Email: `john@example.com` / `jane@example.com`
  - Password: `john12345678` / `jane12345678`
- **Support Staff Profile**:
  - Email: `support@example.com`
  - Password: `support12345678`

---

## 5. API Documentation Location

- **Backend Swagger Explorer Link**: `http://localhost:3000/explorer`
  - Use this swagger page to inspect request payloads and return schemas for authorization, cart operations, products, and checkout actions.

---

## 6. Completed & Pending Items

### Completed Items

- [x] Extracted React application logic from monolithic backend files.
- [x] Configured Vite multi-page routing bundle build mapping.
- [x] Established state syncing matching local cookies / tokens.
- [x] Set up Nginx serving config exposing statically optimized web pages.

### Pending Items (Backlog)

- [ ] Migrate multi-page HTML architecture into a single `react-router` configuration.
- [ ] Introduce state container managers (e.g. Zustand or Redux Toolkit).
- [ ] Enhance validation feedback inside input fields on the login interface.

---

## 7. Design Trade-offs & Decisions

### Multi-page Entry-point Compilation

- **Decision**: Configured Vite build inputs to compile multiple HTML entry files (`shoppy.html`, `product.html`, etc.) instead of a unified single-index Router router setup.
- **Trade-off**: This allowed swift separation of backend and frontend without majorly rewriting old page transition logic. The downside is that client-side states cannot be shared effortlessly via React context, requiring persistent browser cookie tracking.

### Static Nginx Container Deployments

- **Decision**: Used an Nginx image to serve static assets (`/app/dist`) in production.
- **Trade-off**: Lightweight, fast static asset delivery, and easy containerization. However, custom backend routing configurations or API proxy integrations now require tweaking Nginx config maps.
