# Backend Folder Structure

Complete overview of the IQAC backend architecture.

```
backend/
├── config/
│   └── database.js                 # PostgreSQL database configuration
│
├── controllers/
│   ├── authController.js           # Authentication logic (login, password)
│   ├── userController.js           # User CRUD operations
│   ├── achievementController.js    # Achievement management
│   ├── documentController.js       # Document management
│   ├── patentController.js         # Patent tracking
│   ├── placementController.js      # Placement & internship data
│   └── strategicPlanController.js  # Strategic planning
│
├── middleware/
│   └── auth.js                     # JWT authentication & authorization
│
├── models/
│   ├── index.js                    # Model associations
│   ├── User.js                     # User model with roles
│   ├── Achievement.js              # Achievements & awards
│   ├── Document.js                 # Document storage metadata
│   ├── Patent.js                   # Patent information
│   ├── Placement.js                # Placement records
│   └── StrategicPlan.js           # Strategic plans
│
├── routes/
│   ├── auth.js                     # Auth routes (/api/auth)
│   ├── users.js                    # User routes (/api/users)
│   ├── achievements.js             # Achievement routes
│   ├── documents.js                # Document routes
│   ├── patents.js                  # Patent routes
│   ├── placements.js               # Placement routes
│   └── strategicPlans.js          # Strategic plan routes
│
├── scripts/
│   └── initDatabase.js             # Database initialization script
│
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── package.json                    # Dependencies & scripts
├── server.js                       # Main application entry point
├── README.md                       # Detailed documentation
├── QUICKSTART.md                   # Quick setup guide
├── DEPLOYMENT.md                   # Production deployment guide
└── STRUCTURE.md                    # This file
```

## Architecture Overview

### Layer Architecture

```
┌─────────────────────────────────────────┐
│         Client (React Frontend)         │
└─────────────────┬───────────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────────┐
│           Express Server                │
│  ┌──────────────────────────────────┐  │
│  │      Security Middleware         │  │
│  │  (Helmet, CORS, Rate Limiting)   │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │         Routes Layer             │  │
│  │   (API Endpoint Definitions)     │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │      Auth Middleware             │  │
│  │  (JWT Verification & RBAC)       │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │      Controllers Layer           │  │
│  │    (Business Logic)              │  │
│  └──────────────┬───────────────────┘  │
│  ┌──────────────▼───────────────────┐  │
│  │       Models Layer               │  │
│  │  (Sequelize ORM & Validation)    │  │
│  └──────────────┬───────────────────┘  │
└─────────────────┼───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      PostgreSQL Database                │
└─────────────────────────────────────────┘
```

## Database Schema

### Users Table
```sql
users (
  id              UUID PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password        VARCHAR(255) NOT NULL,
  role            ENUM('admin', 'faculty', 'coordinator'),
  department      VARCHAR(255),
  employeeId      VARCHAR(255) UNIQUE,
  phone           VARCHAR(255),
  isActive        BOOLEAN DEFAULT true,
  lastLogin       TIMESTAMP,
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)
```

### Achievements Table
```sql
achievements (
  id              UUID PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  category        ENUM(...) NOT NULL,
  subcategory     VARCHAR(255),
  department      VARCHAR(255),
  date            DATE NOT NULL,
  year            VARCHAR(255) NOT NULL,
  rank            VARCHAR(255),
  score           DECIMAL(10,2),
  organization    VARCHAR(255),
  location        VARCHAR(255),
  participants    TEXT,
  impact          VARCHAR(255),
  status          ENUM('draft', 'published', 'archived'),
  createdBy       UUID FOREIGN KEY → users(id),
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)
```

### Documents Table
```sql
documents (
  id              UUID PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  category        ENUM(...) NOT NULL,
  subcategory     VARCHAR(255),
  department      VARCHAR(255),
  academicYear    VARCHAR(255),
  semester        VARCHAR(255),
  courseCode      VARCHAR(255),
  courseName      VARCHAR(255),
  fileName        VARCHAR(255) NOT NULL,
  filePath        VARCHAR(255) NOT NULL,
  fileSize        INTEGER NOT NULL,
  fileType        VARCHAR(255) NOT NULL,
  uploadedBy      UUID FOREIGN KEY → users(id),
  status          ENUM('pending', 'approved', 'rejected'),
  tags            TEXT[],
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)
```

### Patents Table
```sql
patents (
  id              UUID PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  inventors       TEXT[] NOT NULL,
  department      VARCHAR(255) NOT NULL,
  status          ENUM('published', 'granted', 'commercialized'),
  applicationNo   VARCHAR(255),
  patentNo        VARCHAR(255),
  filedDate       DATE NOT NULL,
  grantedDate     DATE,
  partner         VARCHAR(255),
  licenseDate     DATE,
  revenue         DECIMAL(12,2),
  createdBy       UUID FOREIGN KEY → users(id),
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)
```

### Placements Table
```sql
placements (
  id              UUID PRIMARY KEY,
  studentName     VARCHAR(255) NOT NULL,
  studentId       VARCHAR(255) NOT NULL,
  department      VARCHAR(255) NOT NULL,
  batch           VARCHAR(255) NOT NULL,
  company         VARCHAR(255) NOT NULL,
  role            VARCHAR(255) NOT NULL,
  package         DECIMAL(10,2) NOT NULL,
  placementType   ENUM('placement', 'internship'),
  placementDate   DATE NOT NULL,
  location        VARCHAR(255),
  createdBy       UUID FOREIGN KEY → users(id),
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)
```

### Strategic Plans Table
```sql
strategic_plans (
  id              UUID PRIMARY KEY,
  department      VARCHAR(255) NOT NULL,
  academicYear    VARCHAR(255) NOT NULL,
  category        ENUM(...) NOT NULL,
  objective       VARCHAR(255) NOT NULL,
  description     TEXT,
  targetDate      DATE NOT NULL,
  status          ENUM('planned', 'in-progress', 'completed', 'delayed', 'cancelled'),
  progress        INTEGER (0-100),
  budget          DECIMAL(12,2),
  responsible     VARCHAR(255),
  notes           TEXT,
  createdBy       UUID FOREIGN KEY → users(id),
  createdAt       TIMESTAMP,
  updatedAt       TIMESTAMP
)
```

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/login` | User login | Public |
| GET | `/me` | Get current user | Private |
| PUT | `/password` | Update password | Private |

### Users (`/api/users`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all users | Admin |
| GET | `/:id` | Get single user | Admin |
| POST | `/` | Create user | Admin |
| PUT | `/:id` | Update user | Admin |
| DELETE | `/:id` | Delete user | Admin |

### Achievements (`/api/achievements`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all achievements | Private |
| GET | `/stats` | Get statistics | Private |
| GET | `/:id` | Get single achievement | Private |
| POST | `/` | Create achievement | Admin/Coord/Faculty |
| PUT | `/:id` | Update achievement | Admin/Coord/Faculty |
| DELETE | `/:id` | Delete achievement | Admin/Coordinator |

### Documents (`/api/documents`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all documents | Private |
| GET | `/:id` | Get single document | Private |
| POST | `/` | Upload document | Admin/Coord/Faculty |
| PUT | `/:id` | Update document | Admin/Coord/Owner |
| DELETE | `/:id` | Delete document | Admin/Coordinator |

### Patents (`/api/patents`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all patents | Private |
| GET | `/:id` | Get single patent | Private |
| POST | `/` | Create patent | Admin/Coord/Faculty |
| PUT | `/:id` | Update patent | Admin/Coord/Owner |
| DELETE | `/:id` | Delete patent | Admin/Coordinator |

### Placements (`/api/placements`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all placements | Private |
| GET | `/stats` | Get statistics | Private |
| POST | `/` | Create placement | Admin/Coordinator |
| PUT | `/:id` | Update placement | Admin/Coordinator |
| DELETE | `/:id` | Delete placement | Admin/Coordinator |

### Strategic Plans (`/api/strategic-plans`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Get all plans | Private |
| GET | `/stats` | Get statistics | Private |
| GET | `/:id` | Get single plan | Private |
| POST | `/` | Create plan | Admin/Coord/Faculty |
| PUT | `/:id` | Update plan | Admin/Coord/Owner |
| DELETE | `/:id` | Delete plan | Admin/Coordinator |

## Role-Based Access Control (RBAC)

### Admin
- Full access to all resources
- User management (CRUD)
- System configuration
- View all departments

### Coordinator
- Department-level access
- Approve/reject content
- Manage department data
- Cannot manage users

### Faculty
- Create and view content
- Upload documents
- Generate reports
- Limited to own department

## Security Features

1. **Authentication**
   - JWT-based tokens
   - Secure password hashing (bcrypt)
   - Token expiration

2. **Authorization**
   - Role-based access control
   - Resource ownership validation
   - Department-level filtering

3. **Security Middleware**
   - Helmet.js (security headers)
   - CORS protection
   - Rate limiting
   - Input validation

4. **Database Security**
   - Parameterized queries (SQL injection prevention)
   - Password hashing hooks
   - Soft deletes option

## Technology Stack

- **Runtime:** Node.js (v16+)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **Security:** helmet, cors, express-rate-limit
- **Logging:** morgan

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment mode | production |
| PORT | Server port | 5000 |
| DB_HOST | Database host | localhost |
| DB_PORT | Database port | 5432 |
| DB_NAME | Database name | iqac_db |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | password |
| JWT_SECRET | JWT signing secret | random_32_char_string |
| JWT_EXPIRE | Token expiration | 7d |
| CLIENT_URL | Frontend URL | http://localhost:3000 |

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run init-db` | Initialize database with seed data |

## Development Workflow

1. **Setup**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your config
   npm run init-db
   ```

2. **Development**
   ```bash
   npm run dev
   # Server runs on http://localhost:5000
   ```

3. **Testing API**
   - Use Postman, Insomnia, or cURL
   - Login to get JWT token
   - Include token in Authorization header

4. **Making Changes**
   - Edit controllers for business logic
   - Edit models for database schema
   - Edit routes for endpoints
   - Restart server to apply changes

## Best Practices

1. **Code Organization**
   - Controllers: Business logic only
   - Models: Database schema & validation
   - Routes: Endpoint definitions
   - Middleware: Reusable functions

2. **Error Handling**
   - Always use try-catch in async functions
   - Return proper HTTP status codes
   - Provide meaningful error messages

3. **Security**
   - Never commit .env file
   - Use environment variables
   - Validate all inputs
   - Implement rate limiting

4. **Database**
   - Use migrations in production
   - Index frequently queried fields
   - Regular backups
   - Monitor query performance

## Future Enhancements

- [ ] File upload functionality (multer)
- [ ] Email notifications (nodemailer)
- [ ] PDF report generation
- [ ] Advanced search & filtering
- [ ] Caching layer (Redis)
- [ ] WebSocket for real-time updates
- [ ] API documentation (Swagger)
- [ ] Automated testing
- [ ] CI/CD pipeline
- [ ] Database migrations

---

For detailed documentation, see README.md
For quick setup, see QUICKSTART.md
For deployment, see DEPLOYMENT.md
