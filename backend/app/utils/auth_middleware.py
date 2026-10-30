import functools
from datetime import datetime, timedelta
import jwt
from flask import request, jsonify, g, current_app
from app.models.user import User

def generate_token(user):
    payload = {
        'user_id': user.id,
        'organization_id': user.organization_id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=current_app.config.get('JWT_EXPIRATION_HOURS', 24)),
        'iat': datetime.utcnow()
    }
    secret = current_app.config.get('JWT_SECRET_KEY', 'default_secret')
    return jwt.encode(payload, secret, algorithm='HS256')


def generate_reset_token(user):
    payload = {
        'user_id': user.id,
        'email': user.email,
        'purpose': 'password_reset',
        'exp': datetime.utcnow() + timedelta(minutes=30),
        'iat': datetime.utcnow()
    }
    secret = current_app.config.get('JWT_SECRET_KEY', 'default_secret')
    return jwt.encode(payload, secret, algorithm='HS256')


def verify_reset_token(token):
    secret = current_app.config.get('JWT_SECRET_KEY', 'default_secret')
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        if payload.get('purpose') != 'password_reset':
            return None
        return payload
    except Exception:
        return None


def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'success': False, 'message': 'Authorization token is missing'}), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'success': False, 'message': 'Invalid token header format. Use Bearer <token>'}), 401

        token = parts[1]
        try:
            secret = current_app.config.get('JWT_SECRET_KEY', 'default_secret')
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            user = User.query.get(payload['user_id'])
            if not user or user.status != 'active':
                return jsonify({'success': False, 'message': 'User not found or account inactive'}), 401
            g.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired. Please log in again'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid authentication token'}), 401
        except Exception as e:
            return jsonify({'success': False, 'message': f'Authentication error: {str(e)}'}), 401

        return f(*args, **kwargs)
    return decorated


def role_required(*allowed_roles):
    """
    Decorator to restrict access to users with specified roles.
    Example: @role_required('admin') or @role_required('admin', 'project_manager')
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({'success': False, 'message': 'Authentication required'}), 401

            if g.current_user.role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f'Access denied. Requires one of roles: {", ".join(allowed_roles)}'
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator
