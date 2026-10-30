from flask import Blueprint, request, jsonify, g
from app.models import db, User, Organization
from app.utils.auth_middleware import generate_token, token_required, generate_reset_token, verify_reset_token
from app.utils.activity_logger import log_activity

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    org_name = data.get('organization_name', '').strip()
    role = data.get('role', 'admin')  # default registrant creates org and is admin

    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Name, email, and password are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'User with this email already exists'}), 409

    try:
        # If organization_name is provided, create the organization
        organization = None
        if org_name:
            existing_org = Organization.query.filter_by(name=org_name).first()
            if existing_org:
                return jsonify({'success': False, 'message': f'Organization "{org_name}" already exists'}), 409

            organization = Organization(name=org_name, status='active')
            db.session.add(organization)
            db.session.flush() # get organization.id

        user = User(
            name=name,
            email=email,
            role=role if role in ['admin', 'project_manager', 'team_member'] else 'admin',
            organization_id=organization.id if organization else None,
            status='active'
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        if organization:
            organization.owner_id = user.id

        db.session.commit()

        if organization:
            log_activity(
                organization_id=organization.id,
                user_id=user.id,
                action='registered_organization',
                details=f"Created organization '{organization.name}' and registered owner account"
            )

        token = generate_token(user)
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'token': token,
            'user': user.to_dict(),
            'organization': organization.to_dict() if organization else None
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

    if user.status != 'active':
        return jsonify({'success': False, 'message': 'Account is suspended or deactivated. Contact your admin.'}), 403

    token = generate_token(user)
    org = user.organization

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict(),
        'organization': org.to_dict() if org else None
    }), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'success': False, 'message': 'Email address is required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            'success': False,
            'message': 'No registered account found with this email address'
        }), 404

    if user.status != 'active':
        return jsonify({
            'success': False,
            'message': 'This account is currently deactivated. Please contact your organization administrator.'
        }), 403

    reset_token = generate_reset_token(user)

    return jsonify({
        'success': True,
        'message': 'Password reset verification approved.',
        'reset_token': reset_token,
        'user_name': user.name,
        'email': user.email
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    reset_token = data.get('reset_token', '').strip()
    new_password = data.get('new_password', '')

    if not email or not reset_token or not new_password:
        return jsonify({'success': False, 'message': 'Email, verification token, and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'New password must be at least 6 characters long'}), 400

    payload = verify_reset_token(reset_token)
    if not payload or payload.get('email') != email:
        return jsonify({'success': False, 'message': 'Invalid or expired password reset token'}), 400

    user = User.query.get(payload['user_id'])
    if not user or user.email != email:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    try:
        user.set_password(new_password)
        db.session.add(user)
        db.session.commit()

        if user.organization_id:
            log_activity(
                organization_id=user.organization_id,
                user_id=user.id,
                action='password_reset',
                details=f"User {user.name} ({user.email}) successfully reset their password"
            )

        return jsonify({
            'success': True,
            'message': 'Password has been successfully reset! You can now log in.'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to reset password: {str(e)}'}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user():
    user = g.current_user
    org = user.organization
    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'organization': org.to_dict() if org else None
    }), 200


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    user = g.current_user
    data = request.get_json() or {}

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']
    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        user.set_password(data['password'])

    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update profile: {str(e)}'}), 500
