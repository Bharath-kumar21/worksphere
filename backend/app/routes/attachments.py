import os
from flask import Blueprint, request, jsonify, g, send_file, current_app
from app.models import db, Task, Attachment, Project
from app.utils.auth_middleware import token_required
from app.utils.file_handler import allowed_file, save_file
from app.utils.activity_logger import log_activity, create_notification

attachments_bp = Blueprint('attachments', __name__, url_prefix='/api')

@attachments_bp.route('/tasks/<int:task_id>/attachments', methods=['GET'])
@token_required
def list_task_attachments(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    attachments = Attachment.query.filter_by(task_id=task.id).order_by(Attachment.created_at.desc()).all()
    return jsonify({
        'success': True,
        'attachments': [a.to_dict() for a in attachments]
    }), 200


@attachments_bp.route('/tasks/<int:task_id>/attachments', methods=['POST'])
@token_required
def upload_task_attachment(task_id):
    user = g.current_user
    task = Task.query.join(Project).filter(
        Task.id == task_id,
        Project.organization_id == user.organization_id
    ).first()

    if not task:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part in the request'}), 400

    uploaded_file = request.files['file']
    if uploaded_file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected for uploading'}), 400

    if not allowed_file(uploaded_file.filename):
        return jsonify({
            'success': False,
            'message': 'File type not allowed. Supported types: images, pdf, doc, docx, xls, xlsx, txt, zip, csv'
        }), 400

    try:
        unique_name, original_name, file_size, file_type, file_path = save_file(uploaded_file)

        attachment = Attachment(
            task_id=task.id,
            user_id=user.id,
            file_name=unique_name,
            original_name=original_name,
            file_size=file_size,
            file_type=file_type,
            file_path=file_path
        )
        db.session.add(attachment)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='uploaded_attachment',
            project_id=task.project_id,
            task_id=task.id,
            details=f"Uploaded file '{original_name}' to task '{task.title}'"
        )

        if task.assignee_id and task.assignee_id != user.id:
            create_notification(
                user_id=task.assignee_id,
                title="File Attached to Task",
                message=f"{user.name} uploaded '{original_name}' to task '{task.title}'.",
                notif_type='file_upload',
                link=f"/projects/{task.project_id}?task={task.id}"
            )

        return jsonify({
            'success': True,
            'message': 'File uploaded successfully',
            'attachment': attachment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to upload file: {str(e)}'}), 500


@attachments_bp.route('/attachments/<int:attachment_id>/download', methods=['GET'])
def download_attachment(attachment_id):
    # Public download or token in query param
    attachment = Attachment.query.get(attachment_id)
    if not attachment:
        return jsonify({'success': False, 'message': 'Attachment not found'}), 404

    if not os.path.exists(attachment.file_path):
        return jsonify({'success': False, 'message': 'File not found on storage server'}), 404

    return send_file(
        attachment.file_path,
        as_attachment=True,
        download_name=attachment.original_name,
        mimetype=attachment.file_type or 'application/octet-stream'
    )


@attachments_bp.route('/attachments/<int:attachment_id>', methods=['DELETE'])
@token_required
def delete_attachment(attachment_id):
    user = g.current_user
    attachment = Attachment.query.get(attachment_id)
    if not attachment:
        return jsonify({'success': False, 'message': 'Attachment not found'}), 404

    # Verify belongs to user's org
    task = attachment.task
    if task.project.organization_id != user.organization_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    if attachment.user_id != user.id and user.role != 'admin':
        return jsonify({'success': False, 'message': 'Only the uploader or admin can delete this file'}), 403

    try:
        # Delete file from storage
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)

        orig_name = attachment.original_name
        db.session.delete(attachment)
        db.session.commit()

        log_activity(
            organization_id=user.organization_id,
            user_id=user.id,
            action='deleted_attachment',
            project_id=task.project_id,
            task_id=task.id,
            details=f"Deleted attachment '{orig_name}' from task '{task.title}'"
        )

        return jsonify({'success': True, 'message': 'Attachment deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Failed to delete attachment: {str(e)}'}), 500
