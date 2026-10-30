from datetime import datetime
from . import Model, Column, db

class ChatMessage(Model):
    __tablename__ = 'chat_messages'

    id = Column('id')
    project_id = Column('project_id')
    user_id = Column('user_id')
    message = Column('message')
    created_at = Column('created_at')

    def __init__(self, project_id=None, user_id=None, message=None, created_at=None, id=None):
        self.id = id
        self.project_id = project_id
        self.user_id = user_id
        self.message = message
        self.created_at = created_at or datetime.utcnow()

    @property
    def user(self):
        from .user import User
        return User.query.get(self.user_id) if self.user_id else None

    @property
    def project(self):
        from .project import Project
        return Project.query.get(self.project_id) if self.project_id else None

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
            'project_id': self.project_id,
            'user_id': self.user_id,
            'message': self.message,
            'created_at': fmt_dt(self.created_at),
            'user_name': u.name if u else 'Unknown',
            'user_avatar': u.avatar_url if u else None,
            'user_role': u.role if u else None,
        }

