# 📦 Inventory & Order Management System

A production-ready, containerized full-stack application for managing products, customers, and orders with real-time inventory tracking.

## 🛠 Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy |
| **Frontend** | React 18, Vite, React Router v6 |
| **Database** | PostgreSQL 15 |
| **Containerization** | Docker, Docker Compose |
| **Deployment** | Render (backend), Vercel (frontend) |

## 🚀 Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/inventory-system.git
cd inventory-system

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
docker compose up --build

# 4. Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## 🐳 Run Pre-built Docker Hub Images (Standalone)

If you want to run the pre-built images from Docker Hub directly without needing the source files or Docker Compose, execute these commands:

```bash
# Create Docker Network
docker network create inventory-network

# Run PostgreSQL Database
docker run -d --name postgres-db --network inventory-network -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=inventory_db -p 5432:5432 postgres:15

# Run Backend
docker run -d --name inventory-backend --network inventory-network -p 8000:8000 -e DATABASE_URL="postgresql://postgres:postgres@postgres-db:5432/inventory_db" daiyyaayush/inventory-order-management:backend

# Run Frontend
docker run -d --name inventory-frontend -p 3000:80 daiyyaayush/inventory-order-management:frontend

# Check Running Containers
docker ps
```

## 🔧 Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_db
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
set VITE_API_URL=http://localhost:8000
npm run dev
```

## 📋 Environment Variables

| Variable | Description | Default |
|:---------|:-----------|:--------|
| `POSTGRES_DB` | Database name | `inventory_db` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `DATABASE_URL` | Full connection string | `postgresql://postgres:postgres@db:5432/inventory_db` |
| `VITE_API_URL` | Backend API URL for frontend | `http://localhost:8000` |

## 📡 API Endpoints

### Products
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| POST | `/products/` | Create product |
| GET | `/products/` | List all products |
| GET | `/products/{id}` | Get product |
| PUT | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Delete product |

### Customers
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| POST | `/customers/` | Create customer |
| GET | `/customers/` | List all customers |
| GET | `/customers/{id}` | Get customer |
| DELETE | `/customers/{id}` | Delete customer |

### Orders
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| POST | `/orders/` | Create order (auto-deducts stock) |
| GET | `/orders/` | List all orders |
| GET | `/orders/{id}` | Get order details |
| DELETE | `/orders/{id}` | Cancel order (restores stock) |

### Dashboard
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/dashboard/stats` | Get summary statistics |

### Health
| Method | Endpoint | Description |
|:-------|:---------|:------------|
| GET | `/health` | Health check |

## ✅ Business Rules

- Product **SKU must be unique** → `409 Conflict`
- Customer **email must be unique** → `409 Conflict`
- Product **quantity cannot be negative** → `400 Bad Request`
- Orders check **stock availability** → `422 Insufficient stock for {product}`
- Order creation **atomically deducts stock** via DB transaction
- **Total amount auto-calculated** by backend: `sum(qty × price)`
- Cancelling an order **restores stock** to all products

## 🌐 Deployment
This project is configured for easy deployment on **Render** (backend) and **Vercel** (frontend).

### Backend (Render)
1. Push your project to **GitHub**.
2. Go to [Render Dashboard](https://dashboard.render.com/) and create a new **Blueprint** service, connecting your GitHub repository.
3. Render will auto-detect the `render.yaml` file, set up the Python environment, and expose your API.
4. Input your `DATABASE_URL` (e.g. Supabase connection string) when prompted.

### Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/) and import your GitHub repository.
2. Select **`frontend`** as the root directory.
3. Add the environment variable `VITE_API_URL` pointing to your deployed Render backend (e.g. `https://inventory-order-backend.onrender.com`).
4. Click **Deploy**.

## 🌐 Live URLs

| Service | URL |
|:--------|:----|
| **Frontend** | https://your-app.vercel.app |
| **Backend API** | https://your-api.onrender.com |
| **API Docs** | https://your-api.onrender.com/docs |

