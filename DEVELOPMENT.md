# 🚀 Development Guide

This guide describes how to run the **StepQuest Server** in a local development environment using the recommended "Half & Half" approach (Docker for infrastructure, Local for the API).

---

## 📋 Prerequisites

- **Node.js** (v20+ recommended)
- **Docker & Docker Compose**
- **npm** (comes with Node.js)

---

## 🛠️ Initial Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Copy the example environment file and ensure `DATABASE_URL` and `REDIS_HOST` point to `localhost`.
   ```bash
   cp .env.example .env
   ```
   *Note: In `.env`, ensure `DATABASE_URL` looks like: `postgresql://stepquest:stepquest_dev_password@localhost:5432/stepquest_db`*

---

## 🏃 Running the Project (Half & Half)

### 1. Start Infrastructure (Docker)
Run the database and cache in the background:
```bash
docker compose up -d postgres redis
```

### 2. Prepare the Database (Prisma)
Sync the schema and generate the client:
```bash
npx prisma db push
npx prisma generate
```

### 3. Start the API (Local)
Run the server with hot-reload enabled:
```bash
npm run start:dev
```
The API will be available at: **http://localhost:3000/api/v1**

---

## 📂 Useful Commands

### Prisma (Database)
- **Open Database UI:** `npx prisma studio` (View and edit data in your browser)
- **Sync Schema:** `npx prisma db push` (Use after changing `prisma/schema.prisma`)
- **Format Schema:** `npx prisma format`

### Docker (Infrastructure)
- **Stop Services:** `docker compose stop`
- **View Logs:** `docker compose logs -f`
- **Reset Database:** `docker compose down -v` (⚠️ This deletes all data)

---

## 🐳 Running Everything in Docker
If you want to run the entire stack (including the API) inside Docker:
```bash
docker compose up --build
```
*Note: In this mode, the API runs the production build (`start:prod`) and does not auto-reload on code changes.*
