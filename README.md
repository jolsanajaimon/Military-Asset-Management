# ⚔️ KristalBall — Military Asset Management System

A full-stack web application for managing military assets across multiple bases. Built with React, Node.js, and PostgreSQL.

## 🚀 Live Demo
- **Frontend:** https://endearing-pixie-d2c4a0.netlify.app
- **Backend API:** https://military-asset-management-deqc.onrender.com
- **GitHub:** https://github.com/jolsanajaimon/Military-Asset-Management

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 | Component-based SPA |
| Backend | Node.js + Express | RESTful API server |
| Database | PostgreSQL (Render) | Cloud database |
| Auth | JWT | Stateless authentication |
| Password | bcryptjs | Secure password hashing |
| Frontend Deploy | Netlify | Static site hosting |
| Backend Deploy | Render | Node.js + DB hosting |

## ✨ Features

- 📊 **Dashboard** — Real-time asset stats and charts across all bases
- 🗄️ **Asset Inventory** — Track vehicles, weapons, ammunition, equipment
- 🛒 **Purchases** — Record asset acquisitions with audit trail
- 🔄 **Transfers** — Move assets between bases with quantity validation
- 📋 **Assignments & Expenditures** — Track asset deployment and consumption
- 🔐 **RBAC** — Role-based access control with 3 permission levels

## 👥 Role-Based Access Control

| Role | View Assets | Purchases | Transfers | Assignments |
|---|---|---|---|---|
| Administrator | All bases | ✅ | ✅ | ✅ |
| Base Commander | Own base only | ❌ | ✅ | ✅ |
| Logistics Officer | Own base only | ✅ | ❌ | ✅ |

## 🗂️ Project Structure

```
military-asset-management/
├── backend/
│   ├── index.js
│   ├── routes/
│   │   ├── purchases.js
│   │   ├── transfers.js
│   │   └── assignments.js
│   ├── models/
│   │   ├── asset.js
│   │   └── user.js
│   └── middleware/
│       └── auth.js
├── src/
│   ├── components/
│   │   ├── Dashboard.js
│   │   ├── Purchases.js
│   │   ├── Transfers.js
│   │   └── Assignments.js
│   ├── App.js
│   └── index.js
├── public/
├── .env
├── netlify.toml
└── package.json
```

## ⚙️ Setup Instructions

### Prerequisites
- Node.js 18+
- npm 9+
- PostgreSQL database

### Backend
```bash
cd backend
npm install
node index.js
# Server runs on http://localhost:5000
```

### Frontend
```bash
npm install
npm start
# App runs on http://localhost:3000
```

### Environment Variables

**Backend (.env)**
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=military_secret_key_2024

**Frontend (.env)**
REACT_APP_API_URL=https://military-asset-management-deqc.onrender.com/api
CI=false

## 🔑 Login Credentials

| Username | Password | Role | Base |
|---|---|---|---|
| admin | admin123 | Administrator | All bases |
| commander_alpha | pass123 | Base Commander | Alpha Base |
| commander_bravo | pass123 | Base Commander | Bravo Base |
| logistics1 | pass123 | Logistics Officer | Alpha Base |

## 📡 API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /api/auth/login | Public | Login and get JWT token |
| GET | /api/dashboard | All roles | Aggregate stats |
| GET | /api/assets | All roles | List assets |
| GET | /api/bases | All roles | List all bases |
| GET | /api/purchases | All roles | List purchases |
| POST | /api/purchases | Admin, Logistics | Record purchase |
| GET | /api/transfers | All roles | List transfers |
| POST | /api/transfers | Admin, Commander | Initiate transfer |
| GET | /api/assignments | All roles | List assignments |
| POST | /api/assignments | All roles | Record assignment |
| GET | /api/users | Admin only | List all users |

## 🗄️ Database Schema

| Table | Description |
|---|---|
| users | Stores user accounts with roles and base assignments |
| assets | Tracks all military assets with quantities per base |
| purchases | Records all asset purchase transactions |
| transfers | Logs inter-base asset movements |
| assignments | Tracks asset assignments and expenditures |

## 🔐 RBAC Implementation

JWT tokens are issued on login containing the user's role and base. Every API request is validated by the `auth` middleware which verifies the token. The `requireRole` middleware checks if the user's role is permitted to access the endpoint. Base filtering is also applied at the database query level — non-admin users can only see data from their assigned base.

## 📄 Documentation

See `KristalBall_Documentation.pdf` for full technical documentation including data models, RBAC explanation, API logging details, and setup instructions.

## 🎥 Screen Recording
[Add your Loom recording link here]

## 👤 Author
Jolsana Jaimon — [jolsanajaimon](https://github.com/jolsanajaimon)
