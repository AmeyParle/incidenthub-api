# IncidentHub API

IncidentHub API is a production-style incident management backend built using Node.js, Express, PostgreSQL, and Prisma. It supports authentication, role-based access control, project and ticket workflows, comments, filtering, pagination, and interactive API documentation using Swagger.

---

## 🚀 Live Demo

- **API Base URL**: [https://incidenthub-api.onrender.com/api](https://incidenthub-api.onrender.com/api)  
- **Swagger Docs**: [https://incidenthub-api.onrender.com/docs](https://incidenthub-api.onrender.com/docs)

> ⚠️ Note: The service may take a few seconds to wake up due to free-tier hosting.

---

## 📌 Features

* 🔐 JWT Authentication
* 👥 Role-Based Access Control (ADMIN, AGENT, VIEWER)
* 📁 Project Management
* 🎫 Ticket Management (Create, Update, Assign, Status, Priority)
* 💬 Comments on Tickets
* 🔍 Filtering, Search, Sorting, Pagination
* ⚠️ Centralized Error Handling
* 📄 Swagger / OpenAPI Documentation
* ❤️ Health & Readiness Endpoints

---

## 🛠️ Tech Stack

* Node.js
* Express.js
* PostgreSQL
* Prisma ORM
* JWT (jsonwebtoken)
* bcrypt
* Swagger UI / OpenAPI
* NeonDB

---

## 📂 Project Structure

```
src/
  config/
  controllers/
  middleware/
  routes/
  utils/
  app.js
  server.js

prisma/
  schema.prisma

docs/
  openapi.yaml

```

---

## 📚 API Documentation

Access interactive API docs:

```
/docs
```

Test endpoints directly from the browser using Swagger UI.

---

## 🔑 Key Endpoints

### Auth

* `POST /api/auth/register`
* `POST /api/auth/login`
* `GET /api/auth/me`

### Projects

* `POST /api/projects`
* `GET /api/projects`
* `GET /api/projects/:id`

### Tickets

* `POST /api/tickets`
* `GET /api/tickets`
* `GET /api/tickets/:id`
* `PATCH /api/tickets/:id`
* `PATCH /api/tickets/:id/assign`
* `PATCH /api/tickets/:id/status`
* `PATCH /api/tickets/:id/priority`

### Comments

* `POST /api/tickets/:id/comments`
* `GET /api/tickets/:id/comments`

---

## ⚙️ Getting Started (Local Setup)

### 1. Clone the repository

```
git clone https://github.com/AmeyParle/incidenthub-api/
cd incidenthub-api
```

### 2. Install dependencies

```
npm install
```

### 3. Setup environment variables

Create `.env` file:

```
PORT=5000
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME?sslmode=require"
JWT_SECRET="your-super-secret-key"
```

### 4. Run database migrations

```
npx prisma migrate dev --name init_schema
npx prisma generate
```

### 5. Start the server

```
npm run dev
```

---

## 🧪 Health Check

* `/health` → API status
* `/ready` → readiness check

---

## 📈 Future Improvements

* Notification microservice integration
* Input validation using Zod
* Rate limiting & security enhancements
* API testing (Jest / Supertest)
* Logging & observability

---

## 👨‍💻 Author

Amey Parle

---
