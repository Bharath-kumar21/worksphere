from datetime import datetime
from flask import Blueprint, jsonify, request, g
from app.models import db, Task, Project
from app.utils.auth_middleware import token_required

calendar_bp = Blueprint('calendar', __name__, url_prefix='/api/calendar')

@calendar_bp.route('/my-deadlines', methods=['GET'])
@calendar_bp.route('/my-deadlines/', methods=['GET'])
@token_required
def get_my_deadlines():
    user = g.current_user
    today = datetime.utcnow().date()

    # Query all tasks assigned to user that have due_date
    tasks = (
        Task.query.join(Project)
        .filter(
            Project.organization_id == user.organization_id,
            Task.assignee_id == user.id,
            Task.due_date.isnot(None)
        )
        .order_by(Task.due_date.asc())
        .all()
    )

    deadlines = []
    for t in tasks:
        delta = (t.due_date - today).days
        if delta < 0:
            rel = f"{abs(delta)}d overdue"
        elif delta == 0:
            rel = "Today"
        elif delta == 1:
            rel = "Tomorrow"
        else:
            rel = f"In {delta}d"

        deadlines.append({
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'due_date': t.due_date.isoformat(),
            'priority': t.priority,
            'status': t.status,
            'project_id': t.project_id,
            'project_name': t.project.name if t.project else '',
            'is_overdue': t.due_date < today and t.status != 'completed',
            'relative_label': rel
        })

    return jsonify({
        'success': True,
        'count': len(deadlines),
        'deadlines': deadlines
    }), 200
