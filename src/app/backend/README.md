# IQAC Backend API

Backend API for Christ University Internal Quality Assurance Cell (IQAC) Platform.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE iqac_db;
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=iqac_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRE=7d

CLIENT_URL=http://localhost:3000
```

### 4. Initialize Database

Run the database initialization script to create tables and seed initial data:

```bash
npm run init-db
```

This will:
- Create all database tables
- Create default admin user
- Create sample faculty and coordinator users
- Populate sample data (achievements, patents, placements, etc.)

### 5. Start Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start at `http://localhost:5000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/password` | Update password | Private |

### Users

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get single user | Admin |
| POST | `/api/users` | Create user | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Achievements

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/achievements` | Get all achievements | Private |
| GET | `/api/achievements/:id` | Get single achievement | Private |
| POST | `/api/achievements` | Create achievement | Admin/Coordinator/Faculty |
| PUT | `/api/achievements/:id` | Update achievement | Admin/Coordinator/Faculty |
| DELETE | `/api/achievements/:id` | Delete achievement | Admin/Coordinator |
| GET | `/api/achievements/stats` | Get statistics | Private |

### Additional Endpoints

Similar CRUD endpoints are available for:
- Documents (`/api/documents`)
- Patents (`/api/patents`)
- Placements (`/api/placements`)
- Strategic Plans (`/api/strategic-plans`)

## Default Credentials

After running `npm run init-db`, use these credentials:

**Admin:**
- Email: `admin@christuniversity.in`
- Password: `Admin@123`

**Faculty:**
- Email: `rajesh.kumar@christuniversity.in`
- Password: `Faculty@123`

**Coordinator:**
- Email: `suresh.menon@christuniversity.in`
- Password: `Coordinator@123`

**⚠️ Change these passwords in production!**

## Role-Based Access Control

### Admin
- Full access to all resources
- User management
- System configuration

### Coordinator
- Department-level access
- Approve/reject content
- Manage department data

### Faculty
- Create and view content
- Upload documents
- Generate reports

## API Request Examples

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@christuniversity.in",
    "password": "Admin@123"
  }'
```

### Get Achievements (with token)

```bash
curl -X GET http://localhost:5000/api/achievements \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Achievement

```bash
curl -X POST http://localhost:5000/api/achievements \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Achievement",
    "category": "research",
    "department": "Computer Science",
    "date": "2024-03-16",
    "year": "2024",
    "description": "Achievement description"
  }'
```

## Database Schema

### Users Table
- id (UUID, Primary Key)
- name, email, password
- role (admin/faculty/coordinator)
- department, employeeId, phone
- isActive, lastLogin
- timestamps

### Achievements Table
- id (UUID, Primary Key)
- title, description, category, subcategory
- department, date, year
- rank, score, organization
- impact, status
- createdBy (Foreign Key → Users)
- timestamps

### Similar schemas for:
- Documents
- Patents
- Placements
- Strategic Plans

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message"
}
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Helmet.js for security headers
- CORS protection
- Rate limiting
- Input validation
- Role-based access control

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
DB_HOST=your-production-db-host
DB_NAME=your-production-db-name
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
JWT_SECRET=your-very-secure-secret-key
CLIENT_URL=https://your-frontend-domain.com
```

### Deployment Platforms

This backend can be deployed on:
- **Heroku** - Easy deployment with PostgreSQL add-on
- **AWS EC2** - Full control with RDS for PostgreSQL
- **DigitalOcean** - App Platform with managed databases
- **Railway** - Simple deployment with PostgreSQL
- **Render** - Free tier available with PostgreSQL

### Production Considerations

1. **Database Migrations**: Use Sequelize migrations instead of `sync()`
2. **Environment Variables**: Never commit `.env` file
3. **Logging**: Implement proper logging (Winston, Bunyan)
4. **Monitoring**: Add application monitoring (Sentry, New Relic)
5. **Backup**: Regular database backups
6. **SSL/TLS**: Use HTTPS in production
7. **Scaling**: Consider load balancing and caching (Redis)

## Testing

```bash
# Run tests (to be implemented)
npm test
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

© 2024 Christ University. All rights reserved.

## Support

For issues or questions, contact: iqac@christuniversity.in
