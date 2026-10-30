import os
import sqlite3
from datetime import datetime, date
from flask import current_app, g

def parse_val(val):
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val

def parse_dt_obj(val):
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val)
        except Exception:
            return val
    return val

def get_db_path():
    if current_app:
        return current_app.config.get('DATABASE', 'team_collab.db')
    return os.environ.get('SQLITE_DB_PATH', 'team_collab.db')

def get_db():
    if 'sqlite_db' not in g:
        db_path = get_db_path()
        g.sqlite_db = sqlite3.connect(db_path)
        g.sqlite_db.row_factory = sqlite3.Row
        g.sqlite_db.execute("PRAGMA foreign_keys = ON;")
    return g.sqlite_db

def get_direct_conn():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def execute_sql(sql, params=None):
    params = params or []
    conn = None
    close_after = False
    try:
        conn = get_db()
    except RuntimeError:
        conn = get_direct_conn()
        close_after = True

    try:
        cursor = conn.cursor()
        cursor.execute(sql, [parse_val(p) for p in params])
        rows = cursor.fetchall()
        if close_after:
            conn.close()
        return rows
    except Exception as e:
        if close_after and conn:
            conn.close()
        raise e


class Column:
    def __init__(self, name, model_cls=None):
        self.name = name
        self.model_cls = model_cls

    def __eq__(self, other):
        if other is None:
            return Clause(f"{self.table_col} IS NULL", [])
        return Clause(f"{self.table_col} = ?", [other])

    def __ne__(self, other):
        if other is None:
            return Clause(f"{self.table_col} IS NOT NULL", [])
        return Clause(f"{self.table_col} != ?", [other])

    def __ge__(self, other):
        return Clause(f"{self.table_col} >= ?", [other])

    def __le__(self, other):
        return Clause(f"{self.table_col} <= ?", [other])

    def __gt__(self, other):
        return Clause(f"{self.table_col} > ?", [other])

    def __lt__(self, other):
        return Clause(f"{self.table_col} < ?", [other])

    def is_(self, other):
        if other is None:
            return Clause(f"{self.table_col} IS NULL", [])
        return Clause(f"{self.table_col} = ?", [other])

    def isnot(self, other):
        if other is None:
            return Clause(f"{self.table_col} IS NOT NULL", [])
        return Clause(f"{self.table_col} != ?", [other])

    def in_(self, values):
        val_list = list(values)
        if not val_list:
            return Clause("1=0", [])
        placeholders = ', '.join(['?'] * len(val_list))
        return Clause(f"{self.table_col} IN ({placeholders})", val_list)

    def ilike(self, pattern):
        return Clause(f"LOWER({self.table_col}) LIKE LOWER(?)", [pattern])

    def asc(self):
        return f"{self.table_col} ASC"

    def desc(self):
        return f"{self.table_col} DESC"

    @property
    def table_col(self):
        if self.model_cls and hasattr(self.model_cls, '__tablename__'):
            return f"{self.model_cls.__tablename__}.{self.name}"
        return self.name


class Clause:
    def __init__(self, sql, params=None):
        self.sql = sql
        self.params = params or []

    def __or__(self, other):
        if isinstance(other, Clause):
            return Clause(f"({self.sql} OR {other.sql})", self.params + other.params)
        return self

    def __and__(self, other):
        if isinstance(other, Clause):
            return Clause(f"({self.sql} AND {other.sql})", self.params + other.params)
        return self


class Query:
    def __init__(self, model_cls):
        self.model_cls = model_cls
        self.joins = []
        self.where_clauses = []
        self.order_bys = []
        self.limit_val = None
        self.offset_val = None

    def _clone(self):
        q = Query(self.model_cls)
        q.joins = list(self.joins)
        q.where_clauses = list(self.where_clauses)
        q.order_bys = list(self.order_bys)
        q.limit_val = self.limit_val
        q.offset_val = self.offset_val
        return q

    def join(self, target_model, on_clause=None):
        new_q = self._clone()
        table_name = target_model.__tablename__
        if on_clause:
            new_q.joins.append((table_name, on_clause.sql, on_clause.params))
        else:
            main_table = self.model_cls.__tablename__
            if main_table == 'tasks' and table_name == 'projects':
                new_q.joins.append((table_name, "tasks.project_id = projects.id", []))
            elif main_table == 'projects' and table_name == 'teams':
                new_q.joins.append((table_name, "projects.team_id = teams.id", []))
            elif main_table == 'activity_logs' and table_name == 'projects':
                new_q.joins.append((table_name, "activity_logs.project_id = projects.id", []))
            elif main_table == 'chat_messages' and table_name == 'projects':
                new_q.joins.append((table_name, "chat_messages.project_id = projects.id", []))
            else:
                new_q.joins.append((table_name, None, []))
        return new_q

    def filter_by(self, **kwargs):
        new_q = self._clone()
        main_table = self.model_cls.__tablename__
        for k, v in kwargs.items():
            if v is None:
                new_q.where_clauses.append(Clause(f"{main_table}.{k} IS NULL", []))
            else:
                new_q.where_clauses.append(Clause(f"{main_table}.{k} = ?", [v]))
        return new_q

    def filter(self, *clauses):
        new_q = self._clone()
        for c in clauses:
            if isinstance(c, Clause):
                new_q.where_clauses.append(c)
            elif isinstance(c, str):
                new_q.where_clauses.append(Clause(c, []))
        return new_q

    def order_by(self, *orders):
        new_q = self._clone()
        for o in orders:
            if isinstance(o, Column):
                new_q.order_bys.append(o.asc())
            elif isinstance(o, str):
                new_q.order_bys.append(o)
        return new_q

    def limit(self, val):
        new_q = self._clone()
        new_q.limit_val = val
        return new_q

    def offset(self, val):
        new_q = self._clone()
        new_q.offset_val = val
        return new_q

    def _build_sql(self, count_only=False, limit=None):
        main_table = self.model_cls.__tablename__
        if count_only:
            select_clause = f"SELECT COUNT(*) as count FROM {main_table}"
        else:
            select_clause = f"SELECT {main_table}.* FROM {main_table}"

        sql = select_clause
        params = []

        for join_table, on_sql, join_params in self.joins:
            if on_sql:
                sql += f" JOIN {join_table} ON {on_sql}"
            else:
                sql += f" JOIN {join_table}"
            params.extend(join_params)

        if self.where_clauses:
            where_sqls = [c.sql for c in self.where_clauses]
            sql += " WHERE " + " AND ".join(where_sqls)
            for c in self.where_clauses:
                params.extend(c.params)

        if not count_only and self.order_bys:
            sql += " ORDER BY " + ", ".join(self.order_bys)

        eff_limit = limit if limit is not None else self.limit_val
        if not count_only and eff_limit is not None:
            sql += " LIMIT ?"
            params.append(eff_limit)
            if self.offset_val is not None:
                sql += " OFFSET ?"
                params.append(self.offset_val)

        return sql, params

    def all(self):
        sql, params = self._build_sql()
        rows = execute_sql(sql, params)
        return [self.model_cls._from_row(row) for row in rows]

    def first(self):
        sql, params = self._build_sql(limit=1)
        rows = execute_sql(sql, params)
        if rows:
            return self.model_cls._from_row(rows[0])
        return None

    def get(self, ident):
        if ident is None:
            return None
        return self.filter_by(id=ident).first()

    def count(self):
        sql, params = self._build_sql(count_only=True)
        rows = execute_sql(sql, params)
        return rows[0]['count'] if rows else 0

    def delete(self):
        items = self.all()
        for item in items:
            item.delete_self()


class ModelMeta(type):
    def __init__(cls, name, bases, dct):
        super().__init__(name, bases, dct)
        for k, v in dct.items():
            if isinstance(v, Column):
                v.name = k
                v.model_cls = cls

    @property
    def query(cls):
        return Query(cls)


class Model(metaclass=ModelMeta):
    __tablename__ = ''

    @classmethod
    def _from_row(cls, row):
        if not row:
            return None
        kwargs = dict(row)
        obj = cls.__new__(cls)
        for k, v in kwargs.items():
            if k in ('due_date', 'start_date', 'end_date') and isinstance(v, str) and v:
                try:
                    v = datetime.strptime(v[:10], '%Y-%m-%d').date()
                except Exception:
                    pass
            elif k in ('created_at', 'updated_at', 'joined_at') and isinstance(v, str) and v:
                try:
                    v = datetime.fromisoformat(v)
                except Exception:
                    pass
            setattr(obj, k, v)
        return obj

    def save_self(self):
        table = self.__tablename__
        cols = []
        vals = []
        params = []

        fields = [k for k, v in self.__class__.__dict__.items() if isinstance(v, Column) and k != 'id']

        conn = None
        close_after = False
        try:
            conn = get_db()
        except RuntimeError:
            conn = get_direct_conn()
            close_after = True

        cursor = conn.cursor()

        if not getattr(self, 'id', None):
            for f in fields:
                if hasattr(self, f):
                    val = parse_val(getattr(self, f))
                    cols.append(f)
                    vals.append("?")
                    params.append(val)
            sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(vals)})"
            cursor.execute(sql, params)
            self.id = cursor.lastrowid
        else:
            updates = []
            for f in fields:
                if hasattr(self, f):
                    val = parse_val(getattr(self, f))
                    updates.append(f"{f} = ?")
                    params.append(val)
            params.append(self.id)
            sql = f"UPDATE {table} SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(sql, params)

        if not close_after and hasattr(g, 'sqlite_db'):
            pass
        else:
            conn.commit()
            if close_after:
                conn.close()

    def delete_self(self):
        if not getattr(self, 'id', None):
            return
        table = self.__tablename__
        conn = None
        close_after = False
        try:
            conn = get_db()
        except RuntimeError:
            conn = get_direct_conn()
            close_after = True

        cursor = conn.cursor()
        cursor.execute(f"DELETE FROM {table} WHERE id = ?", [self.id])

        if not close_after and hasattr(g, 'sqlite_db'):
            pass
        else:
            conn.commit()
            if close_after:
                conn.close()


class Session:
    def __init__(self):
        self.pending_add = []
        self.pending_delete = []

    def add(self, obj):
        if obj not in self.pending_add:
            self.pending_add.append(obj)

    def delete(self, obj):
        if obj not in self.pending_delete:
            self.pending_delete.append(obj)

    def flush(self):
        self.commit()

    def commit(self):
        conn = None
        close_after = False
        try:
            conn = get_db()
        except RuntimeError:
            conn = get_direct_conn()
            close_after = True

        try:
            for obj in list(self.pending_delete):
                obj.delete_self()
            self.pending_delete.clear()

            for obj in list(self.pending_add):
                obj.save_self()
            self.pending_add.clear()

            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            if close_after:
                conn.close()

    def rollback(self):
        self.pending_add.clear()
        self.pending_delete.clear()
        try:
            if hasattr(g, 'sqlite_db'):
                g.sqlite_db.rollback()
        except Exception:
            pass


class Database:
    def __init__(self):
        self.session = Session()

    def init_app(self, app):
        @app.teardown_appcontext
        def close_db_connection(exception):
            db_conn = g.pop('sqlite_db', None)
            if db_conn is not None:
                db_conn.close()

    def create_all(self):
        conn = None
        close_after = False
        try:
            conn = get_db()
        except RuntimeError:
            conn = get_direct_conn()
            close_after = True

        cursor = conn.cursor()

        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            owner_id INTEGER,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'team_member',
            avatar_url TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS team_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role_in_team TEXT DEFAULT 'member',
            joined_at TEXT,
            UNIQUE(team_id, user_id),
            FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            team_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            manager_id INTEGER,
            start_date TEXT,
            end_date TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
            FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE SET NULL,
            FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            assignee_id INTEGER,
            created_by_id INTEGER,
            priority TEXT NOT NULL DEFAULT 'medium',
            status TEXT NOT NULL DEFAULT 'to_do',
            due_date TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL,
            FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            file_name TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_type TEXT,
            file_path TEXT NOT NULL,
            created_at TEXT,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organization_id INTEGER NOT NULL,
            project_id INTEGER,
            task_id INTEGER,
            user_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT,
            FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
        """)

        conn.commit()
        if close_after:
            conn.close()

    def drop_all(self):
        conn = None
        close_after = False
        try:
            conn = get_db()
        except RuntimeError:
            conn = get_direct_conn()
            close_after = True

        cursor = conn.cursor()
        tables = ['chat_messages', 'notifications', 'activity_logs', 'attachments', 'comments', 'tasks', 'projects', 'team_members', 'teams', 'users', 'organizations']
        for t in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {t};")
        conn.commit()
        if close_after:
            conn.close()

db = Database()

from .organization import Organization
from .user import User
from .team import Team, TeamMember
from .project import Project
from .task import Task
from .comment import Comment
from .attachment import Attachment
from .activity import ActivityLog
from .notification import Notification
from .chat import ChatMessage

def or_(*clauses):
    valid_clauses = [c for c in clauses if c is not False and c is not None]
    if not valid_clauses:
        return Clause("1=0", [])
    res = valid_clauses[0]
    for c in valid_clauses[1:]:
        res = res | c
    return res

def and_(*clauses):
    valid_clauses = [c for c in clauses if c is not False and c is not None]
    if not valid_clauses:
        return Clause("1=1", [])
    res = valid_clauses[0]
    for c in valid_clauses[1:]:
        res = res & c
    return res

__all__ = [
    'db',
    'Column',
    'Clause',
    'Query',
    'Model',
    'or_',
    'and_',
    'Organization',
    'User',
    'Team',
    'TeamMember',
    'Project',
    'Task',
    'Comment',
    'Attachment',
    'ActivityLog',
    'Notification',
    'ChatMessage',
]

