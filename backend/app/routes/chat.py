from flask import Blueprint, request, jsonify, g
from app.models import db, Project, ChatMessage
from app.utils.auth_middleware import token_required

chat_bp = Blueprint('chat', __name__, url_prefix='/api/projects')

@chat_bp.route('/<int:project_id>/messages', methods=['GET'])
@token_required
def get_project_messages(project_id):
    user = g.current_user
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    messages = ChatMessage.query.filter_by(project_id=project_id).order_by(ChatMessage.created_at.asc()).all()
    return jsonify({
        'success': True,
        'project_id': project_id,
        'messages': [m.to_dict() for m in messages]
    }), 200

@chat_bp.route('/<int:project_id>/messages', methods=['POST'])
@token_required
def send_project_message(project_id):
    user = g.current_user
    project = Project.query.filter_by(id=project_id, organization_id=user.organization_id).first()
    if not project:
        return jsonify({'success': False, 'message': 'Project not found'}), 404

    data = request.get_json() or {}
    message_text = (data.get('message') or '').strip()
    if not message_text:
        return jsonify({'success': False, 'message': 'Message cannot be empty'}), 400

    try:
        msg = ChatMessage(
            project_id=project_id,
            user_id=user.id,
            message=message_text
        )
        db.session.add(msg)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': msg.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to send message: {str(e)}'}), 500

