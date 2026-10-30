from datetime import datetime, timedelta
from flask import Blueprint, jsonify, g
from app.models import db, Organization, Project, Task, Team, User, ActivityLog, TeamMember, Notification
from app.utils.auth_middleware import token_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

def get_relative_date_label(due_date, today):
    if not due_date:
        return 'No deadline'
    delta = (due_date - today).days
    if delta < 0:
        days_ago = abs(delta)
        return f"{days_ago} day{'s' if days_ago > 1 else ''} overdue"
    elif delta == 0:
        return 'Today'
    elif delta == 1:
        return 'Tomorrow'
    else:
        return f"In {delta} days"


@dashboard_bp.route('/overview', methods=['GET'])
@token_required
def get_dashboard_overview():
    user = g.current_user
    org_id = user.organization_id
    today = datetime.utcnow().date()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    # Organization metrics
    total_users = User.query.filter_by(organization_id=org_id).count()
    total_teams = Team.query.filter_by(organization_id=org_id).count()

    projects = Project.query.filter_by(organization_id=org_id).all()
    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status == 'active')
    completed_projects = sum(1 for p in projects if p.status == 'completed')

    # Tasks metrics across entire organization
    all_tasks = Task.query.join(Project).filter(Project.organization_id == org_id).all()
    total_tasks = len(all_tasks)
    to_do = sum(1 for t in all_tasks if t.status == 'to_do')
    in_progress = sum(1 for t in all_tasks if t.status == 'in_progress')
    review = sum(1 for t in all_tasks if t.status == 'review')
    completed = sum(1 for t in all_tasks if t.status == 'completed')

    # Priority counts
    priorities = {
        'low': sum(1 for t in all_tasks if t.priority == 'low'),
        'medium': sum(1 for t in all_tasks if t.priority == 'medium'),
        'high': sum(1 for t in all_tasks if t.priority == 'high'),
        'urgent': sum(1 for t in all_tasks if t.priority == 'urgent'),
    }

    # Org-level overdue tasks
    overdue_tasks = [
        t.to_dict(include_details=False) for t in all_tasks
        if t.due_date and t.due_date < today and t.status != 'completed'
    ]

    # Upcoming deadlines (next 7 days)
    upcoming_tasks = [
        t.to_dict(include_details=False) for t in all_tasks
        if t.due_date and t.due_date >= today and t.status != 'completed'
    ]
    upcoming_tasks.sort(key=lambda x: x['due_date'])

    # Specific member tasks calculation (strictly for logged-in user)
    my_all_tasks = [t for t in all_tasks if t.assignee_id == user.id]
    my_total_tasks = len(my_all_tasks)
    my_in_progress_tasks = sum(1 for t in my_all_tasks if t.status == 'in_progress')
    my_due_this_week_tasks = sum(
        1 for t in my_all_tasks
        if t.due_date and start_of_week <= t.due_date <= end_of_week and t.status != 'completed'
    )
    my_overdue_tasks = [
        t for t in my_all_tasks
        if t.due_date and t.due_date < today and t.status != 'completed'
    ]
    my_status_counts = {
        'all': my_total_tasks,
        'to_do': sum(1 for t in my_all_tasks if t.status == 'to_do'),
        'in_progress': my_in_progress_tasks,
        'review': sum(1 for t in my_all_tasks if t.status == 'review'),
        'completed': sum(1 for t in my_all_tasks if t.status == 'completed'),
    }

    # Upcoming deadlines for user with relative label
    my_upcoming_tasks = [
        t for t in my_all_tasks
        if t.status != 'completed' and t.due_date
    ]
    my_upcoming_tasks.sort(key=lambda t: t.due_date)
    my_deadlines_formatted = []
    for t in my_upcoming_tasks[:8]:
        d = t.to_dict(include_details=False)
        d['relative_deadline'] = get_relative_date_label(t.due_date, today)
        d['is_overdue'] = t.due_date < today
        my_deadlines_formatted.append(d)

    # User's primary team name
    team_membership = TeamMember.query.filter_by(user_id=user.id).first()
    team_name = team_membership.team.name if team_membership and team_membership.team else None

    # User's project progress
    user_team_ids = [m.team_id for m in user.team_memberships]
    user_projects = []
    for p in projects:
        p_tasks = [t for t in all_tasks if t.project_id == p.id]
        my_p_tasks = [t for t in p_tasks if t.assignee_id == user.id]
        if user.role in ['admin', 'project_manager'] or p.team_id in user_team_ids or len(my_p_tasks) > 0:
            total_p = len(p_tasks)
            completed_p = sum(1 for t in p_tasks if t.status == 'completed')
            user_projects.append({
                'id': p.id,
                'name': p.name,
                'status': p.status,
                'total_tasks': total_p,
                'completed_tasks': completed_p,
                'my_tasks_count': len(my_p_tasks),
                'my_completed_tasks_count': sum(1 for t in my_p_tasks if t.status == 'completed'),
                'progress_percentage': round((completed_p / total_p * 100), 1) if total_p > 0 else 0
            })

    # Recent activities (latest 8)
    recent_activities = (
        ActivityLog.query.filter_by(organization_id=org_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(8)
        .all()
    )

    overall_progress = round((completed / total_tasks * 100), 1) if total_tasks > 0 else 0

    return jsonify({
        'success': True,
        'summary': {
            'total_projects': total_projects,
            'active_projects': active_projects,
            'completed_projects': completed_projects,
            'total_tasks': total_tasks,
            'to_do_tasks': to_do,
            'in_progress_tasks': in_progress,
            'review_tasks': review,
            'completed_tasks': completed,
            'completion_rate': overall_progress,
            'total_users': total_users,
            'total_teams': total_teams,
            'overdue_count': len(overdue_tasks),
        },
        'member_stats': {
            'my_tasks_count': my_total_tasks,
            'in_progress_count': my_in_progress_tasks,
            'due_this_week_count': my_due_this_week_tasks,
            'overdue_count': len(my_overdue_tasks),
            'status_counts': my_status_counts,
            'team_name': team_name,
            'projects': user_projects[:6],
            'upcoming_deadlines': my_deadlines_formatted,
        },
        'priority_distribution': priorities,
        'status_distribution': {
            'to_do': to_do,
            'in_progress': in_progress,
            'review': review,
            'completed': completed,
        },
        'my_pending_tasks': [t.to_dict(include_details=False) for t in my_all_tasks if t.status != 'completed'][:5],
        'upcoming_deadlines': upcoming_tasks[:6],
        'overdue_tasks': overdue_tasks[:6],
        'recent_activity': [a.to_dict() for a in recent_activities],
        'recent_projects': [p.to_dict(include_tasks=False) for p in projects[:5]]
    }), 200


@dashboard_bp.route('/member-overview', methods=['GET'])
@token_required
def get_member_overview():
    user = g.current_user
    org_id = user.organization_id
    today = datetime.utcnow().date()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    # Member's assigned tasks
    my_tasks = Task.query.join(Project).filter(
        Project.organization_id == org_id,
        Task.assignee_id == user.id
    ).order_by(Task.due_date.is_(None), Task.due_date.asc()).all()

    total_tasks = len(my_tasks)
    in_progress = sum(1 for t in my_tasks if t.status == 'in_progress')
    due_this_week = sum(
        1 for t in my_tasks
        if t.due_date and start_of_week <= t.due_date <= end_of_week and t.status != 'completed'
    )
    overdue_tasks = [t for t in my_tasks if t.due_date and t.due_date < today and t.status != 'completed']

    status_counts = {
        'all': total_tasks,
        'to_do': sum(1 for t in my_tasks if t.status == 'to_do'),
        'in_progress': in_progress,
        'review': sum(1 for t in my_tasks if t.status == 'review'),
        'completed': sum(1 for t in my_tasks if t.status == 'completed'),
    }

    # Upcoming deadlines with relative dates
    upcoming = []
    for t in my_tasks:
        if t.status != 'completed' and t.due_date:
            item = t.to_dict(include_details=True)
            item['relative_deadline'] = get_relative_date_label(t.due_date, today)
            item['is_overdue'] = t.due_date < today
            upcoming.append(item)

    # Primary team name
    team_membership = TeamMember.query.filter_by(user_id=user.id).first()
    team_name = team_membership.team.name if team_membership and team_membership.team else None

    # Projects
    user_team_ids = [m.team_id for m in user.team_memberships]
    all_projects = Project.query.filter_by(organization_id=org_id).all()
    my_projects = []
    for p in all_projects:
        p_tasks = Task.query.filter_by(project_id=p.id).all()
        user_p_tasks = [t for t in p_tasks if t.assignee_id == user.id]
        if p.team_id in user_team_ids or len(user_p_tasks) > 0:
            total_p = len(p_tasks)
            completed_p = sum(1 for t in p_tasks if t.status == 'completed')
            my_projects.append({
                'id': p.id,
                'name': p.name,
                'description': p.description,
                'status': p.status,
                'total_tasks': total_p,
                'completed_tasks': completed_p,
                'my_tasks_count': len(user_p_tasks),
                'my_completed_tasks_count': sum(1 for t in user_p_tasks if t.status == 'completed'),
                'progress_percentage': round((completed_p / total_p * 100), 1) if total_p > 0 else 0
            })

    # Recent notifications (latest 5)
    notifications = (
        Notification.query.filter_by(user_id=user.id)
        .order_by(Notification.created_at.desc())
        .limit(5)
        .all()
    )

    return jsonify({
        'success': True,
        'stats': {
            'my_tasks': total_tasks,
            'in_progress': in_progress,
            'due_this_week': due_this_week,
            'overdue': len(overdue_tasks),
        },
        'status_counts': status_counts,
        'team_name': team_name,
        'upcoming_deadlines': upcoming[:8],
        'my_projects': my_projects,
        'notifications': [n.to_dict() for n in notifications],
        'tasks': [t.to_dict(include_details=True) for t in my_tasks]
    }), 200
