import os
from app import create_app
from app.models import db

app = create_app()

with app.app_context():
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        db.create_all()
    except Exception as e:
        print(f"Notice: Database auto-init error: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting WorkSphere SaaS API on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
