from datetime import datetime
from . import Model, Column, db

class Notification(Model):
    __tablename__ = 'notifications'

    id = Column('id')
    user_id = Column('user_id')
    title = Column('title')
    message = Column('message')
    type = Column('type')
    link = Column('link')
    is_read = Column('is_read')
    created_at = Column('created_at')

    def __init__(self, user_id=None, title=None, message=None, type='info', link=None, is_read=False, created_at=None, id=None):
        self.id = id
        self.user_id = user_id
        self.title = title
        self.message = message
        self.type = type
        self.link = link
        self.is_read = 1 if is_read else 0
        self.created_at = created_at or datetime.utcnow()

    @property
    def user(self):
        from .user import User
        return User.query.get(self.user_id) if self.user_id else None

    def to_dict(self):
        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'link': self.link,
            'is_read': bool(self.is_read),
            'created_at': fmt_dt(self.created_at),
        }
