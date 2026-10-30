from flask import Blueprint, jsonify, g
from app.models import db, Notification
from app.utils.auth_middleware import token_required

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('', methods=['GET'])
@token_required
def list_notifications():
    user = g.current_user
    notifications = (
        Notification.query.filter_by(user_id=user.id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()

    return jsonify({
        'success': True,
        'unread_count': unread_count,
        'notifications': [n.to_dict() for n in notifications]
    }), 200


@notifications_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count():
    user = g.current_user
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({
        'success': True,
        'unread_count': unread_count
    }), 200


@notifications_bp.route('/<int:notif_id>/read', methods=['PUT', 'PATCH'])
@notifications_bp.route('/<int:notif_id>/read/', methods=['PUT', 'PATCH'])
@token_required
def mark_read(notif_id):
    user = g.current_user
    notification = Notification.query.filter_by(id=notif_id, user_id=user.id).first()
    if not notification:
        return jsonify({'success': False, 'message': 'Notification not found'}), 404

    notification.is_read = True
    try:
        db.session.commit()
        return jsonify({'success': True, 'notification': notification.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@notifications_bp.route('/read-all', methods=['PUT'])
@token_required
def mark_all_read():
    user = g.current_user
    try:
        Notification.query.filter_by(user_id=user.id, is_read=False).update({'is_read': True})
        db.session.commit()
        return jsonify({'success': True, 'message': 'All notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500
