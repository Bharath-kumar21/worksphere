import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file from backend root or parent
basedir = os.path.abspath(os.path.dirname(__file__))
rootdir = os.path.abspath(os.path.join(basedir, '..'))
load_dotenv(os.path.join(rootdir, '.env'))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'team_collab_super_secret_jwt_key_2026_x89a$')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'team_collab_super_secret_jwt_key_2026_x89a$')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', 24))

    # SQLite Database Configuration
    DATABASE = os.getenv('SQLITE_DB_PATH', os.path.join(rootdir, 'team_collab.db'))


    # Uploads
    UPLOAD_FOLDER = os.path.join(rootdir, 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip', 'csv'}
