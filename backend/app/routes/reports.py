import io
import csv
from datetime import datetime
from flask import Blueprint, request, jsonify, g, Response
from app.models import db, Project, Task, User, Team
from app.utils.auth_middleware import token_required

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('/projects', methods=['GET'])
@token_required
def get_projects_report():
    user = g.current_user
    projects = Project.query.filter_by(organization_id=user.organization_id).all()

    report_data = []
    today = datetime.utcnow().date()

    for p in projects:
        tasks = p.tasks
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == 'completed')
        in_progress = sum(1 for t in tasks if t.status == 'in_progress')
        to_do = sum(1 for t in tasks if t.status == 'to_do')
        review = sum(1 for t in tasks if t.status == 'review')
        overdue = sum(1 for t in tasks if t.due_date and t.due_date < today and t.status != 'completed')
        progress = round(completed / total * 100, 1) if total > 0 else 0

        report_data.append({
            'id': p.id,
            'name': p.name,
            'status': p.status,
            'manager_name': p.manager.name if p.manager else 'Unassigned',
            'team_name': p.team.name if p.team else 'General',
            'start_date': p.start_date.isoformat() if p.start_date else None,
            'end_date': p.end_date.isoformat() if p.end_date else None,
            'total_tasks': total,
            'completed_tasks': completed,
            'in_progress_tasks': in_progress,
            'to_do_tasks': to_do,
            'review_tasks': review,
            'overdue_tasks': overdue,
            'progress_percentage': progress
        })

    return jsonify({
        'success': True,
        'projects_report': report_data
    }), 200


@reports_bp.route('/team-workload', methods=['GET'])
@token_required
def get_team_workload_report():
    user = g.current_user
    users = User.query.filter_by(organization_id=user.organization_id).all()
    today = datetime.utcnow().date()

    workload = []
    for u in users:
        tasks = Task.query.filter_by(assignee_id=u.id).all()
        total = len(tasks)
        completed = sum(1 for t in tasks if t.status == 'completed')
        in_progress = sum(1 for t in tasks if t.status == 'in_progress')
        to_do = sum(1 for t in tasks if t.status == 'to_do')
        overdue = sum(1 for t in tasks if t.due_date and t.due_date < today and t.status != 'completed')

        workload.append({
            'user_id': u.id,
            'name': u.name,
            'email': u.email,
            'role': u.role,
            'avatar_url': u.avatar_url,
            'total_tasks': total,
            'completed_tasks': completed,
            'in_progress_tasks': in_progress,
            'to_do_tasks': to_do,
            'overdue_tasks': overdue,
            'completion_rate': round(completed / total * 100, 1) if total > 0 else 0
        })

    workload.sort(key=lambda x: x['total_tasks'], reverse=True)

    return jsonify({
        'success': True,
        'workload_report': workload
    }), 200


@reports_bp.route('/export/csv', methods=['GET'])
@token_required
def export_tasks_csv():
    user = g.current_user
    project_id = request.args.get('project_id')

    query = Task.query.join(Project).filter(Project.organization_id == user.organization_id)
    if project_id:
        query = query.filter(Task.project_id == project_id)

    tasks = query.order_by(Task.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Task ID', 'Project', 'Title', 'Assignee', 'Priority', 'Status', 'Due Date', 'Created At'])

    for t in tasks:
        writer.writerow([
            t.id,
            t.project.name if t.project else '',
            t.title,
            t.assignee.name if t.assignee else 'Unassigned',
            t.priority.upper(),
            t.status.replace('_', ' ').upper(),
            t.due_date.isoformat() if t.due_date else '',
            t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else ''
        ])

    csv_data = output.getvalue()
    filename = f"tasks_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        csv_data,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )
