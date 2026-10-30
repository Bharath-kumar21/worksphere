import os
from app import create_app
from app.models import db

app = create_app()

def clean_database():
    with app.app_context():
        print("Clearing database tables...")

        # Re-create fresh tables in SQLite
        db.drop_all()
        db.create_all()

        print("All records have been completely removed.")

        # Clean demo uploaded files in uploads folder
        uploads_dir = app.config['UPLOAD_FOLDER']
        if os.path.exists(uploads_dir):
            for fname in os.listdir(uploads_dir):
                fpath = os.path.join(uploads_dir, fname)
                if os.path.isfile(fpath):
                    try:
                        os.remove(fpath)
                        print(f"Removed uploaded file: {fname}")
                    except Exception as e:
                        print(f"Could not remove {fname}: {e}")

        print("Database is now 100% clean and ready.")

if __name__ == '__main__':
    clean_database()
