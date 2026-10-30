from datetime import datetime
from . import Model, Column, db

class Comment(Model):
    __tablename__ = 'comments'

    id = Column('id')
    task_id = Column('task_id')
    user_id = Column('user_id')
    comment = Column('comment')
    created_at = Column('created_at')
    updated_at = Column('updated_at')

    def __init__(self, task_id=None, user_id=None, comment=None, created_at=None, updated_at=None, id=None):
        self.id = id
        self.task_id = task_id
        self.user_id = user_id
        self.comment = comment
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

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
            'user': {
                'id': u.id,
                'name': u.name,
                'email': u.email,
                'avatar_url': u.avatar_url,
                'role': u.role,
            } if u else None,
            'comment': self.comment,
            'created_at': fmt_dt(self.created_at),
            'updated_at': fmt_dt(self.updated_at),
        }
