from datetime import datetime
from . import Model, Column, db

class Attachment(Model):
    __tablename__ = 'attachments'

    id = Column('id')
    task_id = Column('task_id')
    user_id = Column('user_id')
    file_name = Column('file_name')
    original_name = Column('original_name')
    file_size = Column('file_size')
    file_type = Column('file_type')
    file_path = Column('file_path')
    created_at = Column('created_at')

    def __init__(self, task_id=None, user_id=None, file_name=None, original_name=None, file_size=0, file_type=None, file_path=None, created_at=None, id=None):
        self.id = id
        self.task_id = task_id
        self.user_id = user_id
        self.file_name = file_name
        self.original_name = original_name
        self.file_size = file_size
        self.file_type = file_type
        self.file_path = file_path
        self.created_at = created_at or datetime.utcnow()

    @property
    def user(self):
        from .user import User
        return User.query.get(self.user_id) if self.user_id else None

    @property
    def task(self):
        from .task import Task
        return Task.query.get(self.task_id) if self.task_id else None

    def to_dict(self):
        u = self.user
        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'user_name': u.name if u else None,
            'file_name': self.file_name,
            'original_name': self.original_name,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'download_url': f"/api/attachments/{self.id}/download",
            'created_at': fmt_dt(self.created_at),
        }
