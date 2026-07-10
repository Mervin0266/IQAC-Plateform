# Deployment Guide

Deploy your IQAC backend to production environments.

## Table of Contents
1. [Heroku Deployment](#heroku-deployment)
2. [Railway Deployment](#railway-deployment)
3. [DigitalOcean App Platform](#digitalocean-deployment)
4. [AWS EC2 Deployment](#aws-ec2-deployment)
5. [General Production Checklist](#production-checklist)

---

## Heroku Deployment

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps

1. **Login to Heroku**
```bash
heroku login
```

2. **Create Heroku App**
```bash
cd backend
heroku create iqac-backend-prod
```

3. **Add PostgreSQL Database**
```bash
heroku addons:create heroku-postgresql:mini
```

4. **Set Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_super_secure_secret_key
heroku config:set JWT_EXPIRE=7d
heroku config:set CLIENT_URL=https://your-frontend-domain.com
```

5. **Create Procfile** (in backend folder)
```
web: node server.js
```

6. **Deploy**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

7. **Initialize Database**
```bash
heroku run npm run init-db
```

8. **Check Logs**
```bash
heroku logs --tail
```

Your API will be available at: `https://iqac-backend-prod.herokuapp.com`

---

## Railway Deployment

### Steps

1. **Go to [Railway.app](https://railway.app/)**

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database**
   - Click "New"
   - Select "Database"
   - Choose "PostgreSQL"

4. **Configure Environment Variables**
   - Go to your service settings
   - Add variables:
```
NODE_ENV=production
JWT_SECRET=your_super_secure_secret_key
JWT_EXPIRE=7d
CLIENT_URL=https://your-frontend-domain.com
```

5. **Database Connection**
   Railway automatically provides these variables:
   - `DATABASE_URL` - Use this for connection
   
   Update `config/database.js` to support DATABASE_URL:
```javascript
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      { /* existing config */ }
    );
```

6. **Deploy**
   - Railway auto-deploys on git push
   - Get your deployment URL from Railway dashboard

7. **Initialize Database**
   - Go to Railway dashboard
   - Open your service
   - Click on "Deployments"
   - Run command: `npm run init-db`

---

## DigitalOcean Deployment

### Using App Platform

1. **Go to [DigitalOcean](https://cloud.digitalocean.com/)**

2. **Create App**
   - Click "Create" → "Apps"
   - Connect to GitHub
   - Select repository and branch

3. **Configure App**
   - Select backend folder as source
   - Build Command: `npm install`
   - Run Command: `npm start`

4. **Add Database**
   - Click "Add Resource"
   - Select "Database"
   - Choose "PostgreSQL"
   - Select plan (Dev or Production)

5. **Environment Variables**
```
NODE_ENV=production
JWT_SECRET=your_super_secure_secret_key
JWT_EXPIRE=7d
CLIENT_URL=${APP_URL}
DATABASE_URL=${db.DATABASE_URL}
```

6. **Deploy**
   - Click "Create Resources"
   - Wait for deployment

7. **Run Init Script**
   - Go to Console tab
   - Run: `npm run init-db`

---

## AWS EC2 Deployment

### Steps

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.small or larger
   - Configure security group (ports 22, 80, 443, 5000)

2. **Connect to Instance**
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

3. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 (process manager)
sudo npm install -g pm2
```

4. **Setup PostgreSQL**
```bash
sudo -u postgres psql
CREATE DATABASE iqac_db;
CREATE USER iqac_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE iqac_db TO iqac_user;
\q
```

5. **Clone Repository**
```bash
cd /home/ubuntu
git clone https://github.com/your-repo/iqac-platform.git
cd iqac-platform/backend
npm install
```

6. **Configure Environment**
```bash
cp .env.example .env
nano .env
```

Update with:
```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iqac_db
DB_USER=iqac_user
DB_PASSWORD=secure_password
JWT_SECRET=your_super_secure_secret_key
CLIENT_URL=http://your-domain.com
```

7. **Initialize Database**
```bash
npm run init-db
```

8. **Start with PM2**
```bash
pm2 start server.js --name iqac-backend
pm2 save
pm2 startup
```

9. **Setup Nginx (Optional)**
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/iqac
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/iqac /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

10. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Use strong JWT secret (min 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS origin
- [ ] Enable rate limiting
- [ ] Use environment variables (never commit .env)
- [ ] Regular security updates
- [ ] Database backup strategy

### Database

- [ ] Use database migrations (not sync)
- [ ] Regular automated backups
- [ ] Connection pooling configured
- [ ] Indexes on frequently queried fields
- [ ] Monitor query performance

### Environment Variables

```env
NODE_ENV=production
PORT=5000

# Database - Use connection pool for production
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=iqac_db
DB_USER=iqac_user
DB_PASSWORD=very_secure_password

# JWT - Use strong secret
JWT_SECRET=minimum_32_character_random_string_here
JWT_EXPIRE=7d

# CORS - Set to your frontend domain
CLIENT_URL=https://your-frontend-domain.com

# File uploads
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/uploads
```

### Monitoring

- [ ] Setup error tracking (Sentry, Rollbar)
- [ ] Application monitoring (New Relic, DataDog)
- [ ] Log aggregation (Loggly, Papertrail)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Performance monitoring

### Performance

- [ ] Enable gzip compression
- [ ] Implement caching (Redis)
- [ ] Database query optimization
- [ ] CDN for static files
- [ ] Load balancing (for high traffic)

### Code Quality

- [ ] Remove console.logs in production
- [ ] Error handling on all routes
- [ ] Input validation
- [ ] API documentation (Swagger)
- [ ] Unit and integration tests

### Maintenance

- [ ] Automated deployment (CI/CD)
- [ ] Database migration strategy
- [ ] Backup and restore procedures
- [ ] Rollback plan
- [ ] Documentation updated

---

## Post-Deployment

### Test Your API

```bash
# Health check
curl https://your-api-domain.com/health

# Test login
curl -X POST https://your-api-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@christuniversity.in","password":"YOUR_NEW_PASSWORD"}'
```

### Monitor Logs

**Heroku:**
```bash
heroku logs --tail
```

**Railway:**
- View logs in Railway dashboard

**PM2 (EC2):**
```bash
pm2 logs iqac-backend
```

### Update Application

**Heroku:**
```bash
git push heroku main
```

**Railway:**
- Auto-deploys on git push

**EC2:**
```bash
git pull
npm install
pm2 restart iqac-backend
```

---

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL or connection parameters
- Check firewall rules
- Ensure database is running

### 502 Bad Gateway
- Check if application is running
- Verify port configuration
- Check application logs

### CORS Errors
- Update CLIENT_URL in environment variables
- Restart application

---

## Support & Resources

- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Heroku Docs:** https://devcenter.heroku.com/
- **Railway Docs:** https://docs.railway.app/
- **AWS Docs:** https://docs.aws.amazon.com/

For production support: iqac@christuniversity.in
