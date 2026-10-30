from flask import Blueprint, request, jsonify, g
from app.models import db, User, Task, TeamMember
from app.utils.auth_middleware import token_required, role_required
from app.utils.activity_logger import log_activity, create_notification

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

@users_bp.route('', methods=['GET'])
@token_required
def list_users():
    user = g.current_user
    role = request.args.get('role')
    search = request.args.get('search', '').strip().lower()

    query = User.query.filter_by(organization_id=user.organization_id)

    if role:
        query = query.filter_by(role=role)
    if search:
        query = query.filter(User.name.ilike(f'%{search}%') | User.email.ilike(f'%{search}%'))

    users = query.order_by(User.name.asc()).all()
    user_list = []
    for u in users:
        u_dict = u.to_dict()
        # Include task stats for user
        assigned_count = Task.query.filter_by(assignee_id=u.id).count()
        completed_count = Task.query.filter_by(assignee_id=u.id, status='completed').count()
        u_dict['assigned_tasks_count'] = assigned_count
        u_dict['completed_tasks_count'] = completed_count
        user_list.append(u_dict)

    return jsonify({
        'success': True,
        'users': user_list
    }), 200


@users_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_user():
    admin = g.current_user
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'team_member')

    if not name or not email or not password:
        return jsonify({'success': False, 'message': 'Name, email, and password are required'}), 400

    if role not in ['admin', 'project_manager', 'team_member']:
        return jsonify({'success': False, 'message': 'Invalid role. Must be admin, project_manager, or team_member'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'User with this email already exists'}), 409

    try:
        new_user = User(
            organization_id=admin.organization_id,
            name=name,
            email=email,
            role=role,
            status='active'
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()

        log_activity(
            organization_id=admin.organization_id,
            user_id=admin.id,
            action='created_user',
            details=f"Created user {new_user.name} ({new_user.email}) as {role}"
        )

        create_notification(
            user_id=new_user.id,
            title="Welcome to the Team!",
            message=f"You have been added to the organization as {role.replace('_', ' ').title()}.",
            notif_type='welcome'
        )

        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to create user: {str(e)}'}), 500


@users_bp.route('/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    current = g.current_user
    target_user = User.query.filter_by(id=user_id, organization_id=current.organization_id).first()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    data = target_user.to_dict()
    data['teams'] = [tm.team.to_dict(include_members=False) for tm in target_user.team_memberships]
    data['assigned_tasks'] = [t.to_dict(include_details=False) for t in target_user.assigned_tasks]
    return jsonify({
        'success': True,
        'user': data
    }), 200


@users_bp.route('/<int:user_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_user(user_id):
    admin = g.current_user
    target_user = User.query.filter_by(id=user_id, organization_id=admin.organization_id).first()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found in this organization'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        target_user.name = data['name'].strip()
    if 'role' in data and data['role'] in ['admin', 'project_manager', 'team_member']:
        target_user.role = data['role']
    if 'status' in data and data['status'] in ['active', 'inactive']:
        target_user.status = data['status']
    if 'password' in data and data['password']:
        target_user.set_password(data['password'])

    try:
        db.session.commit()
        log_activity(
            organization_id=admin.organization_id,
            user_id=admin.id,
            action='updated_user',
            details=f"Updated details/role for user {target_user.name}"
        )
        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': target_user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update user: {str(e)}'}), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_user(user_id):
    admin = g.current_user
    if admin.id == user_id:
        return jsonify({'success': False, 'message': 'You cannot delete your own admin account'}), 400

    target_user = User.query.filter_by(id=user_id, organization_id=admin.organization_id).first()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    try:
        user_name = target_user.name
        db.session.delete(target_user)
        db.session.commit()

        log_activity(
            organization_id=admin.organization_id,
            user_id=admin.id,
            action='deleted_user',
            details=f"Removed user {user_name} from organization"
        )
        return jsonify({
            'success': True,
            'message': f'User {user_name} removed successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete user: {str(e)}'}), 500
