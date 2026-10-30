from flask import Blueprint, request, jsonify, g
from app.models import db, Team, TeamMember, User, Project, Task
from app.utils.auth_middleware import token_required, role_required
from app.utils.activity_logger import log_activity, create_notification

teams_bp = Blueprint('teams', __name__, url_prefix='/api/teams')

@teams_bp.route('', methods=['GET'])
@token_required
def list_teams():
    user = g.current_user
    teams = Team.query.filter_by(organization_id=user.organization_id).all()
    return jsonify({
        'success': True,
        'teams': [t.to_dict(include_members=True) for t in teams]
    }), 200


@teams_bp.route('', methods=['POST'])
@token_required
@role_required('admin')
def create_team():
    user = g.current_user
    data = request.get_json() or {}

    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    member_ids = data.get('member_ids', [])

    if not name:
        return jsonify({'success': False, 'message': 'Team name is required'}), 400

    try:
        team = Team(
            organization_id=user.organization_id,
            name=name,
            description=description
        )
        db.session.add(team)
        db.session.flush()

        # Add initial members if provided
        for uid in member_ids:
            target_user = User.query.filter_by(id=uid, organization_id=user.organization_id).first()
            if target_user:
                membership = TeamMember(team_id=team.id, user_id=target_user.id, role_in_team='member')
                db.session.add(membership)
                create_notification(
                    user_id=target_user.id,
                    title="Added to Team",
                    message=f"You have been added to team '{team.name}'.",
                    notif_type='team',
                    link=f"/teams/{team.id}"
                )

        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='created_team',
            details=f"Created team '{team.name}' with {len(member_ids)} members"
        )

        return jsonify({
            'success': True,
            'message': 'Team created successfully',
            'team': team.to_dict(include_members=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to create team: {str(e)}'}), 500


@teams_bp.route('/<int:team_id>', methods=['GET'])
@token_required
def get_team(team_id):
    user = g.current_user
    team = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404

    data = team.to_dict(include_members=True)
    data['projects'] = [p.to_dict(include_tasks=False) for p in team.projects]

    return jsonify({
        'success': True,
        'team': data
    }), 200


@teams_bp.route('/<int:team_id>', methods=['PUT'])
@token_required
@role_required('admin')
def update_team(team_id):
    user = g.current_user
    team = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404

    data = request.get_json() or {}
    if 'name' in data and data['name'].strip():
        team.name = data['name'].strip()
    if 'description' in data:
        team.description = data['description']

    try:
        db.session.commit()
        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='updated_team',
            details=f"Updated team details for '{team.name}'"
        )
        return jsonify({
            'success': True,
            'message': 'Team updated successfully',
            'team': team.to_dict(include_members=True)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to update team: {str(e)}'}), 500


@teams_bp.route('/<int:team_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_team(team_id):
    user = g.current_user
    team = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404

    try:
        name = team.name
        db.session.delete(team)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='deleted_team',
            details=f"Deleted team '{name}'"
        )
        return jsonify({'success': True, 'message': f'Team {name} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete team: {str(e)}'}), 500


@teams_bp.route('/<int:team_id>/members', methods=['POST'])
@token_required
@role_required('admin', 'project_manager')
def add_team_member(team_id):
    user = g.current_user
    team = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404

    data = request.get_json() or {}
    target_user_id = data.get('user_id')
    role_in_team = data.get('role_in_team', 'member')

    if not target_user_id:
        return jsonify({'success': False, 'message': 'User ID is required'}), 400

    target_user = User.query.filter_by(id=target_user_id, organization_id=user.organization_id).first()
    if not target_user:
        return jsonify({'success': False, 'message': 'User not found in organization'}), 404

    existing = TeamMember.query.filter_by(team_id=team.id, user_id=target_user.id).first()
    if existing:
        return jsonify({'success': False, 'message': 'User is already a member of this team'}), 409

    try:
        membership = TeamMember(team_id=team.id, user_id=target_user.id, role_in_team=role_in_team)
        db.session.add(membership)
        db.session.commit()

        create_notification(
            user_id=target_user.id,
            title="Team Assignment",
            message=f"You were added to team '{team.name}'.",
            notif_type='team',
            link=f"/teams/{team.id}"
        )

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='added_team_member',
            details=f"Added {target_user.name} to team '{team.name}'"
        )

        return jsonify({
            'success': True,
            'message': f'{target_user.name} added to team',
            'member': membership.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to add member: {str(e)}'}), 500


@teams_bp.route('/<int:team_id>/members/<int:target_user_id>', methods=['DELETE'])
@token_required
@role_required('admin', 'project_manager')
def remove_team_member(team_id, target_user_id):
    user = g.current_user
    team = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404

    membership = TeamMember.query.filter_by(team_id=team.id, user_id=target_user_id).first()
    if not membership:
        return jsonify({'success': False, 'message': 'Member not in this team'}), 404

    try:
        member_name = membership.user.name if membership.user else 'User'
        db.session.delete(membership)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='removed_team_member',
            details=f"Removed {member_name} from team '{team.name}'"
        )

        return jsonify({
            'success': True,
            'message': f'Removed {member_name} from team'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to remove member: {str(e)}'}), 500


@teams_bp.route('/<int:team_id>/dashboard', methods=['GET'])
@token_required
def get_team_dashboard(team_id):
    """
    Team dashboard providing member workload, active projects, and completion statistics.
    """
    user = g.current_user
    team = Team.query.filter_by(id=team_id, organization_id=user.organization_id).first()
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404

    members = team.members
    member_stats = []
    total_assigned = 0
    total_completed = 0

    for m in members:
        u = m.user
        if not u:
            continue
        assigned = Task.query.filter_by(assignee_id=u.id).count()
        completed = Task.query.filter_by(assignee_id=u.id, status='completed').count()
        in_progress = Task.query.filter_by(assignee_id=u.id, status='in_progress').count()
        to_do = Task.query.filter_by(assignee_id=u.id, status='to_do').count()

        total_assigned += assigned
        total_completed += completed

        member_stats.append({
            'user_id': u.id,
            'name': u.name,
            'email': u.email,
            'avatar_url': u.avatar_url,
            'role_in_team': m.role_in_team,
            'assigned_tasks': assigned,
            'completed_tasks': completed,
            'in_progress_tasks': in_progress,
            'to_do_tasks': to_do,
            'completion_rate': round(completed / assigned * 100, 1) if assigned > 0 else 0
        })

    overall_progress = round(total_completed / total_assigned * 100, 1) if total_assigned > 0 else 0

    return jsonify({
        'success': True,
        'team': team.to_dict(include_members=False),
        'total_members': len(members),
        'total_projects': len(team.projects),
        'total_tasks': total_assigned,
        'total_completed': total_completed,
        'overall_progress': overall_progress,
        'member_workload': member_stats,
        'projects': [p.to_dict(include_tasks=False) for p in team.projects]
    }), 200
