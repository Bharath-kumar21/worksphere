# Production Deployment Guide: Gunicorn + Nginx + MySQL + HTTPS

This guide walks through deploying the Team Collaboration SaaS platform in a production Linux (Ubuntu/Debian) environment.

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Client Web Browser / SPA   |
                      +--------------+--------------+
                                     |  HTTPS (Port 443)
                                     v
                      +-----------------------------+
                      |     Nginx Reverse Proxy     |
                      |   SSL Termination (TLS 1.3) |
                      |   Static Files /uploads     |
                      +--------------+--------------+
                                     |
                       HTTP / Socket (127.0.0.1:5000)
                                     v
                      +-----------------------------+
                      |     Gunicorn WSGI Server    |
                      |   Flask Application Factory |
                      +--------------+--------------+
                                     |
                                 SQLAlchemy
                                     v
                      +-----------------------------+
                      |    MySQL 8.0 Database       |
                      +-----------------------------+
```

---

## 1. System Prerequisites

On Ubuntu 22.04 / 24.04:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx mysql-server certbot python3-certbot-nginx
```

---

## 2. MySQL Database Setup

1. Secure your MySQL installation:
```bash
sudo mysql_secure_installation
```

2. Create production database & user:
```sql
CREATE DATABASE team_collab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'team_user'@'localhost' IDENTIFIED BY 'Strong_Production_Password_99$';
GRANT ALL PRIVILEGES ON team_collab_db.* TO 'team_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Clone and Setup Backend Environment

1. Deploy project to `/var/www/team_collab`:
```bash
sudo mkdir -p /var/www/team_collab
sudo chown -R www-data:www-data /var/www/team_collab
```

2. Create virtual environment and install dependencies:
```bash
cd /var/www/team_collab/backend
python3 -m venv /var/www/team_collab/venv
source /var/www/team_collab/venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

3. Configure `/var/www/team_collab/backend/.env`:
```ini
FLASK_APP=run.py
FLASK_ENV=production
SECRET_KEY=9f48a17b8f2d5e16c90b84a21764df19ab3e88d0
JWT_SECRET_KEY=7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b
JWT_EXPIRATION_HOURS=24

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=team_user
MYSQL_PASSWORD=Strong_Production_Password_99$
MYSQL_DB=team_collab_db

UPLOAD_FOLDER=/var/www/team_collab/uploads
MAX_CONTENT_LENGTH=16777216
```

4. Initialize database schema & seed initial data:
```bash
python seed_data.py
```

---

## 4. Setup Gunicorn Systemd Service

1. Copy systemd service file:
```bash
sudo cp backend/team_collab.service /etc/systemd/system/team_collab.service
sudo mkdir -p /var/log/team_collab
sudo chown -R www-data:www-data /var/log/team_collab
```

2. Enable and start backend service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable team_collab
sudo systemctl start team_collab
sudo systemctl status team_collab
```

---

## 5. Build and Deploy Modern React Frontend

On your build machine or server:
```bash
cd /var/www/team_collab/frontend
npm install
npm run build
```

This creates `/var/www/team_collab/frontend/dist` which contains the optimized static bundle.

---

## 6. Configure Nginx Reverse Proxy

1. Copy `nginx.conf` to `/etc/nginx/sites-available/team_collab`:
```bash
sudo cp backend/nginx.conf /etc/nginx/sites-available/team_collab
sudo ln -s /etc/nginx/sites-available/team_collab /etc/nginx/sites-enabled/
```

2. Validate configuration:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. HTTPS / SSL Setup with Let's Encrypt

Obtain a free automated SSL certificate via Certbot:

```bash
sudo certbot --nginx -d collab.yourdomain.com
```

Certbot automatically configures TLS 1.2/1.3, sets up auto-renewal cron tasks, and reloads Nginx.

To verify certificate auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## 8. Security Hardening Checklist

- [x] **Password Hashing**: Passwords are saved with bcrypt / pbkdf2 SHA256 hashes via Werkzeug (`generate_password_hash`).
- [x] **JWT Authentication**: 24-hour expiration token with HS256 algorithm.
- [x] **File Upload Sanitization**: Secure filenames via `werkzeug.utils.secure_filename` and unique UUID prefixes.
- [x] **File Size Enforcement**: 16MB maximum request body limit enforced at both Nginx (`client_max_body_size 16M`) and Flask (`MAX_CONTENT_LENGTH`).
- [x] **HTTP Security Headers**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`.
- [x] **Role-Based Access Control**: Route decorators `@role_required('admin')` and `@role_required('admin', 'project_manager')` prevent privilege escalation.
