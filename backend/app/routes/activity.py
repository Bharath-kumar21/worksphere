from flask import Blueprint, request, jsonify, g
from app.models import ActivityLog
from app.utils.auth_middleware import token_required

activity_bp = Blueprint('activity', __name__, url_prefix='/api/activity')

@activity_bp.route('', methods=['GET'])
@token_required
def get_activity_log():
    user = g.current_user
    project_id = request.args.get('project_id')
    user_id = request.args.get('user_id')
    limit = min(int(request.args.get('limit', 50)), 100)
    page = int(request.args.get('page', 1))

    query = ActivityLog.query.filter_by(organization_id=user.organization_id)

    if project_id:
        query = query.filter_by(project_id=project_id)
    if user_id:
        query = query.filter_by(user_id=user_id)

    total = query.count()
    activities = (
        query.order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return jsonify({
        'success': True,
        'total': total,
        'page': page,
        'limit': limit,
        'activities': [a.to_dict() for a in activities]
    }), 200
