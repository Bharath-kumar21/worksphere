from flask import Blueprint, jsonify, request, g
from app.models import db, Task, Project, User, TeamMember
from app.utils.auth_middleware import token_required

search_bp = Blueprint('search', __name__, url_prefix='/api/search')

@search_bp.route('', methods=['GET'])
@search_bp.route('/', methods=['GET'])
@token_required
def global_search():
    user = g.current_user
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({
            'success': True,
            'results': {'tasks': [], 'projects': [], 'people': []}
        }), 200

    pattern = f"%{q}%"

    # Tasks: strictly isolated to organization
    task_query = Task.query.join(Project).filter(
        Project.organization_id == user.organization_id,
        (Task.title.ilike(pattern) | Task.description.ilike(pattern))
    )
    if user.role == 'team_member':
        # Prioritize tasks assigned to user or in accessible projects
        user_team_ids = [m.team_id for m in user.team_memberships]
        from app.models import or_
        task_query = task_query.filter(
            or_(
                Task.assignee_id == user.id,
                Project.team_id.in_(user_team_ids) if user_team_ids else False
            )
        )
    tasks = task_query.limit(8).all()

    # Projects
    proj_query = Project.query.filter(
        Project.organization_id == user.organization_id,
        (Project.name.ilike(pattern) | Project.description.ilike(pattern))
    )
    if user.role == 'team_member':
        user_team_ids = [m.team_id for m in user.team_memberships]
        proj_ids_with_tasks = [t.project_id for t in Task.query.filter_by(assignee_id=user.id).all()]
        from app.models import or_
        filters = []
        if user_team_ids:
            filters.append(Project.team_id.in_(user_team_ids))
        if proj_ids_with_tasks:
            filters.append(Project.id.in_(proj_ids_with_tasks))
        if filters:
            proj_query = proj_query.filter(or_(*filters))
    projects = proj_query.limit(5).all()

    # People in organization
    people = User.query.filter(
        User.organization_id == user.organization_id,
        (User.name.ilike(pattern) | User.email.ilike(pattern))
    ).limit(5).all()

    return jsonify({
        'success': True,
        'results': {
            'tasks': [{
                'id': t.id,
                'title': t.title,
                'project_id': t.project_id,
                'project_name': t.project.name if t.project else '',
                'status': t.status,
                'priority': t.priority,
                'due_date': t.due_date.isoformat() if t.due_date else None
            } for t in tasks],
            'projects': [{
                'id': p.id,
                'name': p.name,
                'status': p.status,
                'description': p.description
            } for p in projects],
            'people': [{
                'id': u.id,
                'name': u.name,
                'email': u.email,
                'role': u.role,
                'avatar_url': u.avatar_url
            } for u in people]
        }
    }), 200
