from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from . import Model, Column, db

class User(Model):
    __tablename__ = 'users'

    id = Column('id')
    organization_id = Column('organization_id')
    name = Column('name')
    email = Column('email')
    password_hash = Column('password_hash')
    role = Column('role')
    avatar_url = Column('avatar_url')
    status = Column('status')
    created_at = Column('created_at')
    updated_at = Column('updated_at')

    def __init__(self, organization_id=None, name=None, email=None, password_hash=None, role='team_member', avatar_url=None, status='active', created_at=None, updated_at=None, id=None):
        self.id = id
        self.organization_id = organization_id
        self.name = name
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.avatar_url = avatar_url
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    @property
    def organization(self):
        from .organization import Organization
        return Organization.query.get(self.organization_id) if self.organization_id else None

    @property
    def owned_organizations(self):
        from .organization import Organization
        return Organization.query.filter_by(owner_id=self.id).all()

    @property
    def managed_projects(self):
        from .project import Project
        return Project.query.filter_by(manager_id=self.id).all()

    @property
    def assigned_tasks(self):
        from .task import Task
        return Task.query.filter_by(assignee_id=self.id).all()

    @property
    def created_tasks(self):
        from .task import Task
        return Task.query.filter_by(created_by_id=self.id).all()

    @property
    def team_memberships(self):
        from .team import TeamMember
        return TeamMember.query.filter_by(user_id=self.id).all()

    @property
    def comments(self):
        from .comment import Comment
        return Comment.query.filter_by(user_id=self.id).all()

    @property
    def notifications(self):
        from .notification import Notification
        return Notification.query.filter_by(user_id=self.id).all()

    def to_dict(self):
        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'avatar_url': self.avatar_url,
            'status': self.status,
            'created_at': fmt_dt(self.created_at),
            'updated_at': fmt_dt(self.updated_at),
        }
