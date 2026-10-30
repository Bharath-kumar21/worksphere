import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from app.config import Config
from app.models import db

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='../frontend_dist', static_url_path='')
    app.config.from_object(config_class)

    # Enable CORS for API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.organizations import organizations_bp
    from app.routes.users import users_bp
    from app.routes.teams import teams_bp
    from app.routes.projects import projects_bp
    from app.routes.tasks import tasks_bp
    from app.routes.comments import comments_bp
    from app.routes.attachments import attachments_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.reports import reports_bp
    from app.routes.activity import activity_bp
    from app.routes.notifications import notifications_bp
    from app.routes.chat import chat_bp
    from app.routes.calendar import calendar_bp
    from app.routes.search import search_bp
    from app.routes.profile import profile_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(organizations_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(attachments_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(activity_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(profile_bp)

    # Health Check
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'WorkSphere SaaS API',
            'version': '1.0.0'
        }), 200

    # Static file serving for uploads
    @app.route('/uploads/<path:filename>')
    def serve_uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Serve Built Frontend SPA
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist'))

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path.startswith('api/') or path.startswith('uploads/'):
            return jsonify({'success': False, 'message': 'Resource not found'}), 404

        target_file = os.path.join(frontend_dist, path)
        if path and os.path.exists(target_file):
            return send_from_directory(frontend_dist, path)

        index_file = os.path.join(frontend_dist, 'index.html')
        if os.path.exists(index_file):
            return send_from_directory(frontend_dist, 'index.html')

        return jsonify({
            'status': 'online',
            'service': 'WorkSphere SaaS API',
            'api_docs': 'Import Team_Collab_SaaS.postman_collection.json or visit /api/health'
        }), 200

    # Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        if os.path.exists(os.path.join(frontend_dist, 'index.html')):
            return send_from_directory(frontend_dist, 'index.html')
        return jsonify({'success': False, 'message': 'Resource not found'}), 404

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({'success': False, 'message': 'File size exceeds maximum limit of 16MB'}), 413

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

    return app
