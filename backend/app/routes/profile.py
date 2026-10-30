from flask import Blueprint, jsonify, request, g
from app.models import db, User, TeamMember, Project, Task
from app.utils.auth_middleware import token_required

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

@profile_bp.route('', methods=['GET'])
@profile_bp.route('/', methods=['GET'])
@token_required
def get_profile():
    user = g.current_user
    # Primary team
    membership = TeamMember.query.filter_by(user_id=user.id).first()
    team_data = None
    if membership and membership.team:
        team_data = {
            'id': membership.team.id,
            'name': membership.team.name,
            'role_in_team': membership.role_in_team,
            'joined_at': membership.joined_at.isoformat() if membership.joined_at else None
        }

    # Count of active projects
    user_team_ids = [m.team_id for m in user.team_memberships]
    proj_ids_with_tasks = [t.project_id for t in Task.query.filter_by(assignee_id=user.id).all()]
    all_proj_ids = set(proj_ids_with_tasks)
    if user_team_ids:
        team_projects = Project.query.filter(Project.team_id.in_(user_team_ids)).all()
        for tp in team_projects:
            all_proj_ids.add(tp.id)

    # Assigned tasks stats
    my_tasks = Task.query.filter_by(assignee_id=user.id).all()
    completed_tasks = sum(1 for t in my_tasks if t.status == 'completed')

    return jsonify({
        'success': True,
        'profile': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role,
            'avatar_url': user.avatar_url,
            'status': user.status,
            'organization_id': user.organization_id,
            'organization_name': user.organization.name if user.organization else '',
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'team': team_data,
            'active_projects_count': len(all_proj_ids),
            'assigned_tasks_count': len(my_tasks),
            'completed_tasks_count': completed_tasks,
        }
    }), 200


@profile_bp.route('', methods=['PUT', 'PATCH'])
@profile_bp.route('/', methods=['PUT', 'PATCH'])
@token_required
def update_profile():
    user = g.current_user
    data = request.get_json() or {}

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']

    # Password change
    if 'new_password' in data and data['new_password']:
        current_password = data.get('current_password', '')
        if current_password and not user.check_password(current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400
        if len(data['new_password']) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        user.set_password(data['new_password'])
    elif 'password' in data and data['password']:
        if len(data['password']) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        user.set_password(data['password'])

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update profile: {str(e)}'}), 500
