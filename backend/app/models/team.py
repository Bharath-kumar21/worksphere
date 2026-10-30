from datetime import datetime
from . import Model, Column, db

class Team(Model):
    __tablename__ = 'teams'

    id = Column('id')
    organization_id = Column('organization_id')
    name = Column('name')
    description = Column('description')
    created_at = Column('created_at')
    updated_at = Column('updated_at')

    def __init__(self, organization_id=None, name=None, description=None, created_at=None, updated_at=None, id=None):
        self.id = id
        self.organization_id = organization_id
        self.name = name
        self.description = description
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @property
    def members(self):
        return TeamMember.query.filter_by(team_id=self.id).all()

    @property
    def projects(self):
        from .project import Project
        return Project.query.filter_by(team_id=self.id).all()

    def to_dict(self, include_members=True):
        m_list = self.members
        p_list = self.projects

        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        data = {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'description': self.description,
            'member_count': len(m_list) if m_list else 0,
            'project_count': len(p_list) if p_list else 0,
            'created_at': fmt_dt(self.created_at),
            'updated_at': fmt_dt(self.updated_at),
        }
        if include_members and m_list:
            data['members'] = [m.to_dict() for m in m_list]
        return data


class TeamMember(Model):
    __tablename__ = 'team_members'

    id = Column('id')
    team_id = Column('team_id')
    user_id = Column('user_id')
    role_in_team = Column('role_in_team')
    joined_at = Column('joined_at')

    def __init__(self, team_id=None, user_id=None, role_in_team='member', joined_at=None, id=None):
        self.id = id
        self.team_id = team_id
        self.user_id = user_id
        self.role_in_team = role_in_team
        self.joined_at = joined_at or datetime.utcnow()

    @property
    def user(self):
        from .user import User
        return User.query.get(self.user_id) if self.user_id else None

    @property
    def team(self):
        return Team.query.get(self.team_id) if self.team_id else None

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
            'team_id': self.team_id,
            'user_id': self.user_id,
            'role_in_team': self.role_in_team,
            'joined_at': fmt_dt(self.joined_at),
            'user': {
                'id': u.id,
                'name': u.name,
                'email': u.email,
                'role': u.role,
                'avatar_url': u.avatar_url,
            } if u else None
        }
