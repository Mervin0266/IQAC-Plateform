# Quick Start Guide

Get your IQAC backend up and running in 5 minutes!

## Step 1: Prerequisites

Make sure you have installed:
- **Node.js** (v16+): Download from [nodejs.org](https://nodejs.org/)
- **PostgreSQL** (v12+): Download from [postgresql.org](https://www.postgresql.org/download/)

## Step 2: Install PostgreSQL & Create Database

### Windows:
1. Download and install PostgreSQL
2. Open pgAdmin or command line
3. Create database:
```sql
CREATE DATABASE iqac_db;
```

### Mac (using Homebrew):
```bash
brew install postgresql
brew services start postgresql
createdb iqac_db
```

### Linux (Ubuntu/Debian):
```bash
sudo apt-get install postgresql
sudo -u postgres createdb iqac_db
```

## Step 3: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

## Step 4: Configure Environment

Edit the `.env` file with your database credentials:

```env
PORT=5000
NODE_ENV=development

# Update these with your PostgreSQL credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iqac_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=change_this_to_a_random_secret_key
JWT_EXPIRE=7d

CLIENT_URL=http://localhost:3000
```

## Step 5: Initialize Database

```bash
npm run init-db
```

This will:
✓ Create all database tables
✓ Create default admin account
✓ Create sample users
✓ Add sample data

## Step 6: Start Server

```bash
npm run dev
```

You should see:
```
✓ Database connection established successfully.
✓ Database synchronized
✓ Server running in development mode on port 5000
✓ Health check: http://localhost:5000/health
```

## Step 7: Test the API

Open browser or Postman and go to:
```
http://localhost:5000/health
```

You should see:
```json
{
  "success": true,
  "message": "IQAC Backend API is running",
  "timestamp": "2024-03-16T..."
}
```

## Step 8: Login & Get Token

### Using Postman or cURL:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@christuniversity.in",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "name": "System Administrator",
      "email": "admin@christuniversity.in",
      "role": "admin"
    }
  }
}
```

**Save the token!** You'll need it for all subsequent API calls.

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@christuniversity.in | Admin@123 |
| Faculty | rajesh.kumar@christuniversity.in | Faculty@123 |
| Coordinator | suresh.menon@christuniversity.in | Coordinator@123 |

**⚠️ IMPORTANT: Change these passwords in production!**

## API Testing Examples

### Get All Achievements (Authenticated)

```bash
curl -X GET http://localhost:5000/api/achievements \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create New Achievement

```bash
curl -X POST http://localhost:5000/api/achievements \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Achievement",
    "category": "research",
    "department": "Computer Science and Engineering",
    "date": "2024-03-16",
    "year": "2024",
    "description": "Description of the achievement"
  }'
```

## Common Issues & Solutions

### Issue: "Unable to connect to the database"
**Solution:** 
- Check if PostgreSQL is running: `pg_isready`
- Verify credentials in `.env` file
- Ensure database `iqac_db` exists

### Issue: "Port 5000 already in use"
**Solution:** 
- Change PORT in `.env` to another port (e.g., 5001)
- Or kill the process using port 5000

### Issue: "Module not found"
**Solution:** 
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

### Issue: "JWT must be provided"
**Solution:** 
- Make sure you're including the Authorization header
- Format: `Authorization: Bearer YOUR_TOKEN`

## Next Steps

1. **Connect Frontend:** Update your React app to use `http://localhost:5000/api`
2. **Explore API:** Check `README.md` for all available endpoints
3. **Add Data:** Use the admin panel to add more users, achievements, etc.
4. **Customize:** Modify models, controllers, and routes as needed

## Production Deployment

For production deployment:
1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Change all default passwords
4. Use environment variables (don't commit `.env`)
5. Set up database backups
6. Use HTTPS/SSL
7. Consider using database migrations instead of `sync()`

## Support

For issues or questions:
- Check `README.md` for detailed documentation
- Review error logs in console
- Contact: iqac@christuniversity.in

---

🎉 **Congratulations!** Your IQAC backend is now running!
