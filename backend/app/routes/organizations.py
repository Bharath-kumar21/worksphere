from flask import Blueprint, request, jsonify, g
from app.models import db, Organization, User, Team, Project, Task
from app.utils.auth_middleware import token_required, role_required
from app.utils.activity_logger import log_activity

organizations_bp = Blueprint('organizations', __name__, url_prefix='/api/organizations')

@organizations_bp.route('/current', methods=['GET'])
@token_required
def get_current_organization():
    user = g.current_user
    if not user.organization_id:
        return jsonify({'success': False, 'message': 'User is not associated with an organization'}), 404

    org = Organization.query.get(user.organization_id)
    if not org:
        return jsonify({'success': False, 'message': 'Organization not found'}), 404

    # Calculate live organization stats
    user_count = User.query.filter_by(organization_id=org.id).count()
    team_count = Team.query.filter_by(organization_id=org.id).count()
    project_count = Project.query.filter_by(organization_id=org.id).count()
    task_count = Task.query.join(Project).filter(Project.organization_id == org.id).count()

    org_data = org.to_dict()
    org_data.update({
        'user_count': user_count,
        'team_count': team_count,
        'project_count': project_count,
        'task_count': task_count,
    })

    return jsonify({
        'success': True,
        'organization': org_data
    }), 200


@organizations_bp.route('/current', methods=['PUT'])
@token_required
@role_required('admin')
def update_current_organization():
    user = g.current_user
    org = Organization.query.get(user.organization_id)
    if not org:
        return jsonify({'success': False, 'message': 'Organization not found'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        new_name = data['name'].strip()
        existing = Organization.query.filter(Organization.name == new_name, Organization.id != org.id).first()
        if existing:
            return jsonify({'success': False, 'message': 'Organization name already taken'}), 409
        org.name = new_name

    if 'status' in data and data['status'] in ['active', 'inactive', 'suspended']:
        org.status = data['status']

    try:
        db.session.commit()
        log_activity(
            organization_id=org.id,
            user_id=user.id,
            action='updated_organization',
            details=f"Updated organization profile/status to '{org.status}'"
        )
        return jsonify({
            'success': True,
            'message': 'Organization updated successfully',
            'organization': org.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Update failed: {str(e)}'}), 500
