from datetime import datetime
from . import Model, Column, db

class Project(Model):
    __tablename__ = 'projects'

    id = Column('id')
    organization_id = Column('organization_id')
    team_id = Column('team_id')
    name = Column('name')
    description = Column('description')
    manager_id = Column('manager_id')
    start_date = Column('start_date')
    end_date = Column('end_date')
    status = Column('status')
    created_at = Column('created_at')
    updated_at = Column('updated_at')

    def __init__(self, organization_id=None, team_id=None, name=None, description=None, manager_id=None, start_date=None, end_date=None, status='active', created_at=None, updated_at=None, id=None):
        self.id = id
        self.organization_id = organization_id
        self.team_id = team_id
        self.name = name
        self.description = description
        self.manager_id = manager_id
        self.start_date = start_date
        self.end_date = end_date
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    @property
    def team(self):
        from .team import Team
        return Team.query.get(self.team_id) if self.team_id else None

    @property
    def manager(self):
        from .user import User
        return User.query.get(self.manager_id) if self.manager_id else None

    @property
    def tasks(self):
        from .task import Task
        return Task.query.filter_by(project_id=self.id).all()

    def to_dict(self, include_tasks=False):
        t_list = self.tasks
        total_tasks = len(t_list) if t_list else 0
        completed_tasks = sum(1 for t in t_list if t.status == 'completed') if t_list else 0
        progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

        mgr = self.manager
        tm = self.team

        def fmt_dt(val):
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        data = {
            'id': self.id,
            'organization_id': self.organization_id,
            'team_id': self.team_id,
            'team_name': tm.name if tm else None,
            'name': self.name,
            'description': self.description,
            'manager_id': self.manager_id,
            'manager': {
                'id': mgr.id,
                'name': mgr.name,
                'email': mgr.email,
                'avatar_url': mgr.avatar_url,
            } if mgr else None,
            'start_date': fmt_dt(self.start_date),
            'end_date': fmt_dt(self.end_date),
            'status': self.status,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'progress_percentage': progress,
            'created_at': fmt_dt(self.created_at),
            'updated_at': fmt_dt(self.updated_at),
        }
        if include_tasks and t_list:
            data['tasks'] = [t.to_dict() for t in t_list]
        return data
