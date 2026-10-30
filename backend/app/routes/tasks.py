from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.models import db, Task, Project, User
from app.utils.auth_middleware import token_required, role_required
from app.utils.activity_logger import log_activity, create_notification

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')

@tasks_bp.route('', methods=['GET'])
@token_required
def list_tasks():
    user = g.current_user
    project_id = request.args.get('project_id')
    assignee_id = request.args.get('assignee_id')
    status = request.args.get('status')
    priority = request.args.get('priority')
    search = request.args.get('search', '').strip().lower()

    # Base query: all tasks belonging to projects in this user's organization
    query = Task.query.join(Project).filter(Project.organization_id == user.organization_id)

    if project_id:
        query = query.filter(Task.project_id == project_id)
    if assignee_id:
        if assignee_id == 'me':
            query = query.filter(Task.assignee_id == user.id)
        elif assignee_id == 'unassigned':
            query = query.filter(Task.assignee_id.is_(None))
        else:
            query = query.filter(Task.assignee_id == assignee_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.ilike(f'%{search}%') | Task.description.ilike(f'%{search}%'))

    tasks = query.order_by(Task.due_date.is_(None), Task.due_date.asc(), Task.created_at.desc()).all()

    return jsonify({
        'success': True,
        'count': len(tasks),
        'tasks': [t.to_dict(include_details=True) for t in tasks]
    }), 200


@tasks_bp.route('', methods=['POST'])
@token_required
@role_required('admin', 'project_manager')
def create_task():
    user = g.current_user
    data = request.get_json() or {}

    project_id = data.get('project_id')
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    assignee_id = data.get('assignee_id')
    priority = data.get('priority', 'medium')
    status = data.get('status', 'to_do')
    due_date_str = data.get('due_date')

    if not project_id or not title:
        return jsonify({'success': False, 'message': 'project_id and title are required'}), 400

    # Verify project belongs to organization
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found in organization'}), 404

    due_date = None
    if due_date_str:
        try:
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid due_date format. Use YYYY-MM-DD'}), 400

    if assignee_id:
        assignee = User.query.filter_by(id=assignee_id, organization_id=user.organization_id).first()
        if not assignee:
            return jsonify({'success': False, 'message': 'Assignee not found in organization'}), 404

    try:
        task = Task(
            project_id=project.id,
            title=title,
            description=description,
            assignee_id=assignee_id,
            created_by_id=user.id,
            priority=priority if priority in ['low', 'medium', 'high', 'urgent'] else 'medium',
            status=status if status in ['to_do', 'in_progress', 'review', 'completed'] else 'to_do',
            due_date=due_date
        )
        db.session.add(task)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='created_task',
            project_id=project.id,
            task_id=task.id,
            details=f"Created task '{task.title}' in '{project.name}'"
        )

        if assignee_id and assignee_id != user.id:
            create_notification(
                user_id=assignee_id,
                title="New Task Assigned",
                message=f"You were assigned to task '{task.title}' in {project.name}.",
                notif_type='task_assigned',
                link=f"/projects/{project.id}?task={task.id}"
            )

        return jsonify({
            'success': True,
            'message': 'Task created successfully',
            'task': task.to_dict(include_details=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to create task: {str(e)}'}), 500


@tasks_bp.route('/<int:task_id>', methods=['GET'])
@token_required
def get_task(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    return jsonify({
        'success': True,
        'task': task.to_dict(include_details=True)
    }), 200


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@token_required
def update_task(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    data = request.get_json() or {}

    # Team member permission check
    if user.role == 'team_member':
        # Disallow reassigning, changing priority, changing title/description or deadlines
        has_forbidden_change = (
            ('title' in data and data['title'].strip() != task.title) or
            ('priority' in data and data['priority'] != task.priority) or
            ('assignee_id' in data and data['assignee_id'] != task.assignee_id) or
            ('due_date' in data and (data['due_date'] or '') != (task.due_date.isoformat() if task.due_date else ''))
        )
        if has_forbidden_change:
            return jsonify({
                'success': False,
                'message': 'Team members can only update task status. Assignment, priorities, and deadlines are managed by Project Managers and Admins.'
            }), 403

    changes = []

    if 'title' in data and data['title'].strip():
        task.title = data['title'].strip()
    if 'description' in data:
        task.description = data['description']

    if 'priority' in data and data['priority'] in ['low', 'medium', 'high', 'urgent']:
        if task.priority != data['priority']:
            changes.append(f"priority changed from {task.priority} to {data['priority']}")
            task.priority = data['priority']

    if 'status' in data and data['status'] in ['to_do', 'in_progress', 'review', 'completed']:
        if task.status != data['status']:
            changes.append(f"status changed from {task.status} to {data['status']}")
            task.status = data['status']

    if 'assignee_id' in data:
        new_assignee_id = data['assignee_id']
        if new_assignee_id != task.assignee_id:
            old_name = task.assignee.name if task.assignee else 'None'
            if new_assignee_id:
                assignee = User.query.filter_by(id=new_assignee_id, organization_id=user.organization_id).first()
                if assignee:
                    changes.append(f"reassigned from {old_name} to {assignee.name}")
                    task.assignee_id = assignee.id
                    if assignee.id != user.id:
                        create_notification(
                            user_id=assignee.id,
                            title="Task Assigned to You",
                            message=f"You were assigned to task '{task.title}'.",
                            notif_type='task_assigned',
                            link=f"/projects/{task.project_id}?task={task.id}"
                        )
            else:
                changes.append(f"unassigned from {old_name}")
                task.assignee_id = None

    if 'due_date' in data:
        if data['due_date']:
            try:
                task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except ValueError:
                pass
        else:
            task.due_date = None

    try:
        db.session.commit()
        if changes:
            log_activity(
                organization_id=user.organization_id,
                user_id=user.id,
                action='updated_task',
                project_id=task.project_id,
                task_id=task.id,
                details=f"Task '{task.title}': {', '.join(changes)}"
            )
            # Notify assignee if someone else modified it
            if task.assignee_id and task.assignee_id != user.id:
                create_notification(
                    user_id=task.assignee_id,
                    title="Task Updated",
                    message=f"Task '{task.title}' was updated: {', '.join(changes)}",
                    notif_type='status_changed',
                    link=f"/projects/{task.project_id}?task={task.id}"
                )

        return jsonify({
            'success': True,
            'message': 'Task updated successfully',
            'task': task.to_dict(include_details=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update task: {str(e)}'}), 500


@tasks_bp.route('/<int:task_id>/status', methods=['PATCH'])
@token_required
def update_task_status(task_id):
    """
    Optimized quick status transition for Kanban drag-and-drop.
    """
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ['to_do', 'in_progress', 'review', 'completed']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    old_status = task.status
    task.status = new_status

    try:
        db.session.commit()
        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='updated_task_status',
            project_id=task.project_id,
            task_id=task.id,
            details=f"Moved task '{task.title}' from {old_status.replace('_', ' ').title()} to {new_status.replace('_', ' ').title()}"
        )

        if task.assignee_id and task.assignee_id != user.id:
            create_notification(
                user_id=task.assignee_id,
                title="Task Status Updated",
                message=f"Status of '{task.title}' moved to {new_status.replace('_', ' ').title()}.",
                notif_type='status_changed',
                link=f"/projects/{task.project_id}?task={task.id}"
            )

        return jsonify({
            'success': True,
            'message': 'Status updated',
            'task': task.to_dict(include_details=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update status: {str(e)}'}), 500


@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    # Allow creator, manager, or admin to delete task
    is_admin = user.role == 'admin'
    is_manager = task.project.manager_id == user.id or user.role == 'project_manager'
    is_creator = task.created_by_id == user.id

    if not (is_admin or is_manager or is_creator):
        return jsonify({'success': False, 'message': 'Not authorized to delete this task'}), 403

    try:
        title = task.title
        proj_id = task.project_id
        db.session.delete(task)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='deleted_task',
            project_id=proj_id,
            details=f"Deleted task '{title}'"
        )
        return jsonify({'success': True, 'message': f"Task '{title}' deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete task: {str(e)}'}), 500
