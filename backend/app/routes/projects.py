from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.models import db, Project, Task, User, Team
from app.utils.auth_middleware import token_required, role_required
from app.utils.activity_logger import log_activity, create_notification

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')

@projects_bp.route('', methods=['GET'])
@token_required
def list_projects():
    user = g.current_user
    team_id = request.args.get('team_id')
    status = request.args.get('status')
    manager_id = request.args.get('manager_id')

    query = Project.query.filter_by(organization_id=user.organization_id)

    if team_id:
        query = query.filter_by(team_id=team_id)
    if status:
        query = query.filter_by(status=status)
    if manager_id:
        query = query.filter_by(manager_id=manager_id)

    projects = query.order_by(Project.created_at.desc()).all()
    return jsonify({
        'success': True,
        'projects': [p.to_dict(include_tasks=False) for p in projects]
    }), 200


@projects_bp.route('/my-projects', methods=['GET'])
@projects_bp.route('/my-projects/', methods=['GET'])
@token_required
def list_my_projects():
    user = g.current_user
    user_team_ids = [m.team_id for m in user.team_memberships]

    if user.role in ['admin', 'project_manager']:
        projects = Project.query.filter_by(organization_id=user.organization_id).order_by(Project.created_at.desc()).all()
    else:
        # Projects where team_id in user_team_ids or project has tasks assigned to user
        proj_ids_with_tasks = [t.project_id for t in Task.query.filter_by(assignee_id=user.id).all()]
        filters = []
        if user_team_ids:
            filters.append(Project.team_id.in_(user_team_ids))
        if proj_ids_with_tasks:
            filters.append(Project.id.in_(proj_ids_with_tasks))

        if filters:
            from app.models import or_
            projects = Project.query.filter(
                Project.organization_id == user.organization_id,
                or_(*filters)
            ).order_by(Project.created_at.desc()).all()

        else:
            projects = Project.query.filter_by(organization_id=user.organization_id).order_by(Project.created_at.desc()).all()

    result = []
    for p in projects:
        p_dict = p.to_dict(include_tasks=False)
        p_tasks = Task.query.filter_by(project_id=p.id).all()
        my_p_tasks = [t for t in p_tasks if t.assignee_id == user.id]
        total_p_tasks = len(p_tasks)
        completed_p_tasks = sum(1 for t in p_tasks if t.status == 'completed')
        my_total = len(my_p_tasks)
        my_completed = sum(1 for t in my_p_tasks if t.status == 'completed')

        p_dict['total_tasks'] = total_p_tasks
        p_dict['completed_tasks'] = completed_p_tasks
        p_dict['my_tasks_count'] = my_total
        p_dict['my_completed_tasks_count'] = my_completed
        p_dict['progress_percentage'] = round((completed_p_tasks / total_p_tasks * 100), 1) if total_p_tasks > 0 else 0
        result.append(p_dict)

    return jsonify({
        'success': True,
        'projects': result
    }), 200


@projects_bp.route('', methods=['POST'])
@token_required
@role_required('admin', 'project_manager')
def create_project():
    user = g.current_user
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    team_id = data.get('team_id')
    manager_id = data.get('manager_id', user.id)  # Default manager is creator
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    status = data.get('status', 'active')

    if not name:
        return jsonify({'success': False, 'message': 'Project name is required'}), 400

    # Parse dates if provided
    start_d = None
    end_d = None
    try:
        if start_date:
            start_d = datetime.strptime(start_date, '%Y-%m-%d').date()
        if end_date:
            end_d = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Validate manager belongs to org
    if manager_id:
        mgr = User.query.filter_by(id=manager_id, organization_id=user.organization_id).first()
        if not mgr:
            return jsonify({'success': False, 'message': 'Selected manager not found in organization'}), 404

    # Validate team belongs to org
    if team_id:
        tm = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
        if not tm:
            return jsonify({'success': False, 'message': 'Selected team not found in organization'}), 404

    try:
        project = Project(
            organization_id=user.organization_id,
            name=name,
            description=description,
            team_id=team_id,
            manager_id=manager_id,
            start_date=start_d,
            end_date=end_d,
            status=status
        )
        db.session.add(project)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='created_project',
            project_id=project.id,
            details=f"Created project '{project.name}'"
        )

        if manager_id and manager_id != user.id:
            create_notification(
                user_id=manager_id,
                title="Project Assignment",
                message=f"You have been assigned as manager for project '{project.name}'.",
                notif_type='project',
                link=f"/projects/{project.id}"
            )

        return jsonify({
            'success': True,
            'message': 'Project created successfully',
            'project': project.to_dict(include_tasks=False)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to create project: {str(e)}'}), 500


@projects_bp.route('/<int:project_id>', methods=['GET'])
@token_required
def get_project(project_id):
    user = g.current_user
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    return jsonify({
        'success': True,
        'project': project.to_dict(include_tasks=True)
    }), 200


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@token_required
@role_required('admin', 'project_manager')
def update_project(project_id):
    user = g.current_user
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    data = request.get_json() or {}

    if 'name' in data and data['name'].strip():
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']
    if 'team_id' in data:
        project.team_id = data['team_id']
    if 'manager_id' in data and data['manager_id']:
        old_mgr_id = project.manager_id
        project.manager_id = data['manager_id']
        if old_mgr_id != data['manager_id'] and data['manager_id'] != user.id:
            create_notification(
                user_id=data['manager_id'],
                title="Assigned as Project Manager",
                message=f"You have been assigned to manage '{project.name}'.",
                notif_type='project',
                link=f"/projects/{project.id}"
            )
    if 'status' in data and data['status'] in ['planning', 'active', 'on_hold', 'completed', 'archived']:
        project.status = data['status']
    if 'start_date' in data and data['start_date']:
        try:
            project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            pass
    if 'end_date' in data and data['end_date']:
        try:
            project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    try:
        db.session.commit()
        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='updated_project',
            project_id=project.id,
            details=f"Updated details for project '{project.name}'"
        )
        return jsonify({
            'success': True,
            'message': 'Project updated successfully',
            'project': project.to_dict(include_tasks=False)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update project: {str(e)}'}), 500


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_project(project_id):
    user = g.current_user
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    try:
        pname = project.name
        db.session.delete(project)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='deleted_project',
            details=f"Deleted project '{pname}'"
        )
        return jsonify({'success': True, 'message': f'Project {pname} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete project: {str(e)}'}), 500


@projects_bp.route('/<int:project_id>/dashboard', methods=['GET'])
@token_required
def get_project_dashboard(project_id):
    """
    Project Dashboard: Metrics, status breakdowns, priority distributions, and deadlines.
    """
    user = g.current_user
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    tasks = project.tasks
    total_tasks = len(tasks)
    to_do_count = sum(1 for t in tasks if t.status == 'to_do')
    in_progress_count = sum(1 for t in tasks if t.status == 'in_progress')
    review_count = sum(1 for t in tasks if t.status == 'review')
    completed_count = sum(1 for t in tasks if t.status == 'completed')

    # Priority counts
    priority_counts = {
        'low': sum(1 for t in tasks if t.priority == 'low'),
        'medium': sum(1 for t in tasks if t.priority == 'medium'),
        'high': sum(1 for t in tasks if t.priority == 'high'),
        'urgent': sum(1 for t in tasks if t.priority == 'urgent'),
    }

    # Overdue tasks
    today = datetime.utcnow().date()
    overdue_tasks = [
        t.to_dict(include_details=False) for t in tasks
        if t.due_date and t.due_date < today and t.status != 'completed'
    ]

    # Assignee task workload in this project
    assignee_workload = {}
    for t in tasks:
        assignee_name = t.assignee.name if t.assignee else 'Unassigned'
        assignee_id = t.assignee_id or 0
        if assignee_id not in assignee_workload:
            assignee_workload[assignee_id] = {
                'name': assignee_name,
                'avatar_url': t.assignee.avatar_url if t.assignee else None,
                'total': 0,
                'completed': 0
            }
        assignee_workload[assignee_id]['total'] += 1
        if t.status == 'completed':
            assignee_workload[assignee_id]['completed'] += 1

    progress = round((completed_count / total_tasks * 100), 1) if total_tasks > 0 else 0

    return jsonify({
        'success': True,
        'project': project.to_dict(include_tasks=False),
        'metrics': {
            'total_tasks': total_tasks,
            'to_do': to_do_count,
            'in_progress': in_progress_count,
            'review': review_count,
            'completed': completed_count,
            'progress_percentage': progress,
            'overdue_count': len(overdue_tasks),
            'priority_distribution': priority_counts,
        },
        'overdue_tasks': overdue_tasks,
        'member_workloads': list(assignee_workload.values()),
    }), 200
