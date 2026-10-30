from datetime import datetime
from . import Model, Column, db

class Task(Model):
    __tablename__ = 'tasks'

    id = Column('id')
    project_id = Column('project_id')
    title = Column('title')
    description = Column('description')
    assignee_id = Column('assignee_id')
    created_by_id = Column('created_by_id')
    priority = Column('priority')
    status = Column('status')
    due_date = Column('due_date')
    created_at = Column('created_at')
    updated_at = Column('updated_at')

    def __init__(self, project_id=None, title=None, description=None, assignee_id=None, created_by_id=None, priority='medium', status='to_do', due_date=None, created_at=None, updated_at=None, id=None):
        self.id = id
        self.project_id = project_id
        self.title = title
        self.description = description
        self.assignee_id = assignee_id
        self.created_by_id = created_by_id
        self.priority = priority
        self.status = status
        self.due_date = due_date
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @property
    def project(self):
        from .project import Project
        return Project.query.get(self.project_id) if self.project_id else None

    @property
    def assignee(self):
        from .user import User
        return User.query.get(self.assignee_id) if self.assignee_id else None

    @property
    def creator(self):
        from .user import User
        return User.query.get(self.created_by_id) if self.created_by_id else None

    @property
    def comments(self):
        from .comment import Comment
        return Comment.query.filter_by(task_id=self.id).order_by('created_at DESC').all()

    @property
    def attachments(self):
        from .attachment import Attachment
        return Attachment.query.filter_by(task_id=self.id).order_by('created_at DESC').all()

    def to_dict(self, include_details=True):
        proj = self.project
        assignee_user = self.assignee
        creator_user = self.creator
        c_list = self.comments
        a_list = self.attachments

        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        data = {
            'id': self.id,
            'project_id': self.project_id,
            'project_name': proj.name if proj else None,
            'title': self.title,
            'description': self.description,
            'assignee_id': self.assignee_id,
            'assignee': {
                'id': assignee_user.id,
                'name': assignee_user.name,
                'email': assignee_user.email,
                'avatar_url': assignee_user.avatar_url,
            } if assignee_user else None,
            'created_by_id': self.created_by_id,
            'creator': {
                'id': creator_user.id,
                'name': creator_user.name,
                'email': creator_user.email,
            } if creator_user else None,
            'priority': self.priority,
            'status': self.status,
            'due_date': fmt_dt(self.due_date),
            'comment_count': len(c_list) if c_list else 0,
            'attachment_count': len(a_list) if a_list else 0,
            'created_at': fmt_dt(self.created_at),
            'updated_at': fmt_dt(self.updated_at),
        }
        if include_details:
            data['comments'] = [c.to_dict() for c in c_list] if c_list else []
            data['attachments'] = [a.to_dict() for a in a_list] if a_list else []
        return data
