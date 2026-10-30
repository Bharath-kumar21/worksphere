from datetime import datetime
from . import Model, Column, db

class ActivityLog(Model):
    __tablename__ = 'activity_logs'

    id = Column('id')
    organization_id = Column('organization_id')
    project_id = Column('project_id')
    task_id = Column('task_id')
    user_id = Column('user_id')
    action = Column('action')
    details = Column('details')
    created_at = Column('created_at')

    def __init__(self, organization_id=None, project_id=None, task_id=None, user_id=None, action=None, details=None, created_at=None, id=None):
        self.id = id
        self.organization_id = organization_id
        self.project_id = project_id
        self.task_id = task_id
        self.user_id = user_id
        self.action = action
        self.details = details
        self.created_at = created_at or datetime.utcnow()

    @property
    def user(self):
        from .user import User
        return User.query.get(self.user_id) if self.user_id else None

    @property
    def project(self):
        from .project import Project
        return Project.query.get(self.project_id) if self.project_id else None

    @property
    def task(self):
        from .task import Task
        return Task.query.get(self.task_id) if self.task_id else None

    def to_dict(self):
        u = self.user
        p = self.project
        t = self.task

        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'project_id': self.project_id,
            'project_name': p.name if p else None,
            'task_id': self.task_id,
            'task_title': t.title if t else None,
            'user_id': self.user_id,
            'user_name': u.name if u else 'System',
            'user_avatar': u.avatar_url if u else None,
            'action': self.action,
            'details': self.details,
            'created_at': fmt_dt(self.created_at),
        }
