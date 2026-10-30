import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app

def allowed_file(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in current_app.config.get('ALLOWED_EXTENSIONS', set())


def save_file(uploaded_file):
    """
    Saves an uploaded file to the configured UPLOAD_FOLDER with a unique filename.
    Returns: (stored_filename, original_filename, file_size, file_type, file_path)
    """
    original_filename = secure_filename(uploaded_file.filename) or 'file'
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else ''

    unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
    upload_folder = current_app.config.get('UPLOAD_FOLDER')
    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(upload_folder, unique_filename)
    uploaded_file.save(file_path)

    file_size = os.path.getsize(file_path)
    file_type = uploaded_file.content_type or ext

    return unique_filename, original_filename, file_size, file_type, file_path
