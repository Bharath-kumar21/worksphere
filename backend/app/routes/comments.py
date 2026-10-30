from flask import Blueprint, request, jsonify, g
from app.models import db, Task, Comment, Project
from app.utils.auth_middleware import token_required
from app.utils.activity_logger import log_activity, create_notification

comments_bp = Blueprint('comments', __name__, url_prefix='/api')

@comments_bp.route('/tasks/<int:task_id>/comments', methods=['GET'])
@token_required
def list_task_comments(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    comments = Comment.query.filter_by(task_id=task.id).order_by(Comment.created_at.asc()).all()
    return jsonify({
        'success': True,
        'comments': [c.to_dict() for c in comments]
    }), 200


@comments_bp.route('/tasks/<int:task_id>/comments', methods=['POST'])
@token_required
def add_task_comment(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    data = request.get_json() or {}
    comment_text = data.get('comment', '').strip()

    if not comment_text:
        return jsonify({'success': False, 'message': 'Comment text cannot be empty'}), 400

    try:
        new_comment = Comment(
            task_id=task.id,
            user_id=user.id,
            comment=comment_text
        )
        db.session.add(new_comment)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='added_comment',
            project_id=task.project_id,
            task_id=task.id,
            details=f"Commented on '{task.title}': {comment_text[:60]}"
        )

        # Notify assignee if not the commenter
        if task.assignee_id and task.assignee_id != user.id:
            create_notification(
                user_id=task.assignee_id,
                title="New Comment on Task",
                message=f"{user.name} commented on '{task.title}'",
                notif_type='comment_added',
                link=f"/projects/{task.project_id}?task={task.id}"
            )

        # Notify creator if not commenter and not assignee
        if task.created_by_id and task.created_by_id != user.id and task.created_by_id != task.assignee_id:
            create_notification(
                user_id=task.created_by_id,
                title="New Comment on Task",
                message=f"{user.name} commented on '{task.title}'",
                notif_type='comment_added',
                link=f"/projects/{task.project_id}?task={task.id}"
            )

        return jsonify({
            'success': True,
            'message': 'Comment added successfully',
            'comment': new_comment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to add comment: {str(e)}'}), 500


@comments_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@token_required
def delete_comment(comment_id):
    user = g.current_user
    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'success': False, 'message': 'Comment not found'}), 404

    # Allow author or admin
    if comment.user_id != user.id and user.role != 'admin':
        return jsonify({'success': False, 'message': 'Permission denied'}), 403

    try:
        db.session.delete(comment)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Comment deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete comment: {str(e)}'}), 500
