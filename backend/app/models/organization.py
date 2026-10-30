from datetime import datetime
from . import Model, Column, db

class Organization(Model):
    __tablename__ = 'organizations'

    id = Column('id')
    name = Column('name')
    owner_id = Column('owner_id')
    status = Column('status')
    created_at = Column('created_at')
    updated_at = Column('updated_at')

    def __init__(self, name=None, owner_id=None, status='active', created_at=None, updated_at=None, id=None):
        self.id = id
        self.name = name
        self.owner_id = owner_id
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @property
    def owner(self):
        from .user import User
        return User.query.get(self.owner_id) if self.owner_id else None

    @property
    def users(self):
        from .user import User
        return User.query.filter_by(organization_id=self.id).all()

    @property
    def teams(self):
        from .team import Team
        return Team.query.filter_by(organization_id=self.id).all()

    @property
    def projects(self):
        from .project import Project
        return Project.query.filter_by(organization_id=self.id).all()

    def to_dict(self):
        u_list = self.users
        t_list = self.teams
        p_list = self.projects
        ow = self.owner
        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        return {
            'id': self.id,
            'name': self.name,
            'owner_id': self.owner_id,
            'owner_name': ow.name if ow else None,
            'status': self.status,
            'user_count': len(u_list) if u_list else 0,
            'team_count': len(t_list) if t_list else 0,
            'project_count': len(p_list) if p_list else 0,
            'created_at': fmt_dt(self.created_at),
            'updated_at': fmt_dt(self.updated_at),
        }
