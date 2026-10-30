import os
from datetime import datetime, timedelta
from app import create_app
from app.models import (
    db, Organization, User, Team, TeamMember, Project, Task,
    Comment, Attachment, ActivityLog, Notification, ChatMessage
)

app = create_app()

def seed_database():
    with app.app_context():
        print("Creating MySQL tables if not exist...")
        db.create_all()

        # Check if already seeded
        existing_org = Organization.query.filter_by(name='Acme Cloud Technologies').first()
        if existing_org:
            print("Database already contains seed organization 'Acme Cloud Technologies'. Skipping seed.")
            return

        print("Seeding initial data following business flow...")

        # 1. Organization
        org = Organization(
            name='Acme Cloud Technologies',
            status='active'
        )
        db.session.add(org)
        db.session.flush()

        # 2. Users (Admin, Project Manager, Team Members)
        admin = User(
            organization_id=org.id,
            name='Sarah Connor',
            email='admin@acme.com',
            role='admin',
            avatar_url='https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            status='active'
        )
        admin.set_password('password123')
        db.session.add(admin)
        db.session.flush()

        org.owner_id = admin.id

        manager = User(
            organization_id=org.id,
            name='Alex Rivera',
            email='manager@acme.com',
            role='project_manager',
            avatar_url='https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            status='active'
        )
        manager.set_password('password123')
        db.session.add(manager)

        dev_david = User(
            organization_id=org.id,
            name='David Chen',
            email='david@acme.com',
            role='team_member',
            avatar_url='https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
            status='active'
        )
        dev_david.set_password('password123')
        db.session.add(dev_david)

        dev_emily = User(
            organization_id=org.id,
            name='Emily Watson',
            email='emily@acme.com',
            role='team_member',
            avatar_url='https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
            status='active'
        )
        dev_emily.set_password('password123')
        db.session.add(dev_emily)

        designer_marcus = User(
            organization_id=org.id,
            name='Marcus Vance',
            email='marcus@acme.com',
            role='team_member',
            avatar_url='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            status='active'
        )
        designer_marcus.set_password('password123')
        db.session.add(designer_marcus)

        db.session.flush()

        # 3. Teams
        team_eng = Team(
            organization_id=org.id,
            name='Core Engineering',
            description='Frontend, backend, infrastructure, and API architecture team.'
        )
        db.session.add(team_eng)

        team_design = Team(
            organization_id=org.id,
            name='Product & UX Design',
            description='UI/UX system, product wireframes, usability testing, and design tokens.'
        )
        db.session.add(team_design)
        db.session.flush()

        # Team Memberships
        for u, role_in_team in [(admin, 'member'), (manager, 'lead'), (dev_david, 'member'), (dev_emily, 'member')]:
            db.session.add(TeamMember(team_id=team_eng.id, user_id=u.id, role_in_team=role_in_team))

        for u, role_in_team in [(manager, 'lead'), (designer_marcus, 'member')]:
            db.session.add(TeamMember(team_id=team_design.id, user_id=u.id, role_in_team=role_in_team))

        # 4. Projects
        today = datetime.utcnow().date()

        proj1 = Project(
            organization_id=org.id,
            team_id=team_eng.id,
            name='Enterprise SaaS Portal V2',
            description='Next-generation collaboration platform with Kanban boards, live reports, and role permissions.',
            manager_id=manager.id,
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=40),
            status='active'
        )
        db.session.add(proj1)

        proj2 = Project(
            organization_id=org.id,
            team_id=team_design.id,
            name='Mobile App Experience Redesign',
            description='Revamp mobile customer portal UI, touch navigation, and responsive accessibility.',
            manager_id=manager.id,
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=50),
            status='active'
        )
        db.session.add(proj2)

        proj3 = Project(
            organization_id=org.id,
            team_id=team_eng.id,
            name='Cloud Infrastructure Modernization',
            description='Migrate services to containerized autoscaling clusters with high security and HTTPS/TLS.',
            manager_id=admin.id,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=90),
            status='planning'
        )
        db.session.add(proj3)
        db.session.flush()

        # 5. Tasks for Project 1 (Enterprise SaaS Portal V2)
        task1 = Task(
            project_id=proj1.id,
            title='Implement JWT Authentication & RBAC Middleware',
            description='Set up secure JWT access token issuing, password hashing with bcrypt/werkzeug, and role guards.',
            assignee_id=dev_emily.id,
            created_by_id=manager.id,
            priority='high',
            status='completed',
            due_date=today - timedelta(days=5)
        )
        db.session.add(task1)

        task2 = Task(
            project_id=proj1.id,
            title='Design Responsive Kanban Board Component',
            description='Create drag-and-drop Kanban columns (To Do, In Progress, Review, Completed) with live status updates.',
            assignee_id=dev_david.id,
            created_by_id=manager.id,
            priority='high',
            status='in_progress',
            due_date=today + timedelta(days=3)
        )
        db.session.add(task2)

        task3 = Task(
            project_id=proj1.id,
            title='Build Activity History & Audit Trail Feed',
            description='Log all critical user actions (task creation, status change, comments, file attachments) for audit tracking.',
            assignee_id=dev_emily.id,
            created_by_id=manager.id,
            priority='medium',
            status='review',
            due_date=today + timedelta(days=2)
        )
        db.session.add(task3)

        task4 = Task(
            project_id=proj1.id,
            title='Create Project Analytics & Velocity Dashboard',
            description='Aggregate project statistics, completion ratios, overdue alerts, and workload distribution charts.',
            assignee_id=dev_david.id,
            created_by_id=manager.id,
            priority='urgent',
            status='in_progress',
            due_date=today + timedelta(days=5)
        )
        db.session.add(task4)

        task5 = Task(
            project_id=proj1.id,
            title='Implement Task File Attachments & Download API',
            description='Allow team members to upload project assets, design documents, and files with size limits and secure download links.',
            assignee_id=dev_david.id,
            created_by_id=manager.id,
            priority='medium',
            status='to_do',
            due_date=today + timedelta(days=10)
        )
        db.session.add(task5)

        task6 = Task(
            project_id=proj1.id,
            title='Optimize MySQL Database Indexes & Schema',
            description='Add compound indexes for task queries by status, assignee, and organization for sub-millisecond API response times.',
            assignee_id=dev_emily.id,
            created_by_id=manager.id,
            priority='low',
            status='to_do',
            due_date=today + timedelta(days=14)
        )
        db.session.add(task6)

        # Tasks for Project 2 (Mobile App Experience Redesign)
        task7 = Task(
            project_id=proj2.id,
            title='Design Dark Mode Color Palette & Figma Tokens',
            description='Define semantic colors for dark mode and contrast-accessible typography scales.',
            assignee_id=designer_marcus.id,
            created_by_id=manager.id,
            priority='medium',
            status='completed',
            due_date=today - timedelta(days=2)
        )
        db.session.add(task7)

        task8 = Task(
            project_id=proj2.id,
            title='User Feedback Survey on Navigation UX',
            description='Synthesize user testing findings and map high-frequency task routes for bottom navigation tabs.',
            assignee_id=designer_marcus.id,
            created_by_id=manager.id,
            priority='high',
            status='in_progress',
            due_date=today + timedelta(days=4)
        )
        db.session.add(task8)

        task9 = Task(
            project_id=proj2.id,
            title='Interactive Mobile Wireframes Prototype',
            description='Deliver clickable Figma prototypes for the mobile task management flow and quick status swipe.',
            assignee_id=designer_marcus.id,
            created_by_id=manager.id,
            priority='urgent',
            status='to_do',
            due_date=today + timedelta(days=8)
        )
        db.session.add(task9)

        db.session.flush()

        # 6. Comments on Task 2 (Kanban Board)
        comm1 = Comment(
            task_id=task2.id,
            user_id=manager.id,
            comment="David, how is the drag-and-drop state sync performing? Does it update the backend instantly?"
        )
        db.session.add(comm1)

        comm2 = Comment(
            task_id=task2.id,
            user_id=dev_david.id,
            comment="Working seamlessly! The PATCH /api/tasks/:id/status endpoint allows instant optimistic updates on the board."
        )
        db.session.add(comm2)

        comm3 = Comment(
            task_id=task1.id,
            user_id=admin.id,
            comment="Awesome work Emily! The JWT RBAC middleware passes all security checks."
        )
        db.session.add(comm3)

        # 7. Sample Attachment
        # Create a sample text file in uploads folder
        uploads_dir = app.config['UPLOAD_FOLDER']
        os.makedirs(uploads_dir, exist_ok=True)
        sample_file_path = os.path.join(uploads_dir, 'sample_api_spec.txt')
        with open(sample_file_path, 'w', encoding='utf-8') as f:
            f.write("API Architecture Specification & Role Permission Matrix\nAdmin: Full Organization Control\nManager: Project & Task Management\nTeam Member: Task Execution & Comments\n")

        attach1 = Attachment(
            task_id=task1.id,
            user_id=dev_emily.id,
            file_name='sample_api_spec.txt',
            original_name='api_architecture_spec.txt',
            file_size=os.path.getsize(sample_file_path),
            file_type='text/plain',
            file_path=sample_file_path
        )
        db.session.add(attach1)

        # 8. Activity History
        db.session.add(ActivityLog(
            organization_id=org.id,
            user_id=admin.id,
            action='registered_organization',
            details="Registered organization 'Acme Cloud Technologies' with admin account"
        ))
        db.session.add(ActivityLog(
            organization_id=org.id,
            user_id=admin.id,
            action='created_team',
            details="Created team 'Core Engineering' with 4 initial members"
        ))
        db.session.add(ActivityLog(
            organization_id=org.id,
            user_id=manager.id,
            action='created_project',
            project_id=proj1.id,
            details=f"Created project '{proj1.name}'"
        ))
        db.session.add(ActivityLog(
            organization_id=org.id,
            user_id=manager.id,
            action='created_task',
            project_id=proj1.id,
            task_id=task2.id,
            details=f"Created task '{task2.title}' and assigned to David Chen"
        ))
        db.session.add(ActivityLog(
            organization_id=org.id,
            user_id=dev_david.id,
            action='updated_task_status',
            project_id=proj1.id,
            task_id=task2.id,
            details=f"Moved task '{task2.title}' to In Progress"
        ))

        # 9. Notifications
        db.session.add(Notification(
            user_id=dev_david.id,
            title="Task Assigned",
            message=f"Alex Rivera assigned you to '{task2.title}'.",
            type='task_assigned',
            link=f"/projects/{proj1.id}?task={task2.id}",
            is_read=False
        ))
        db.session.add(Notification(
            user_id=dev_david.id,
            title="Urgent Task Priority",
            message=f"'{task4.title}' has been prioritized as Urgent.",
            type='status_changed',
            link=f"/projects/{proj1.id}?task={task4.id}",
            is_read=False
        ))
        db.session.add(Notification(
            user_id=manager.id,
            title="Task Completed",
            message=f"Emily Watson completed '{task1.title}'.",
            type='status_changed',
            link=f"/projects/{proj1.id}?task={task1.id}",
            is_read=True
        ))

        # 10. Project Chat Messages
        db.session.add(ChatMessage(
            project_id=proj1.id,
            user_id=manager.id,
            message="Welcome everyone! Let's kick off Sprint 1 for Enterprise SaaS Portal V2."
        ))
        db.session.add(ChatMessage(
            project_id=proj1.id,
            user_id=dev_emily.id,
            message="Auth and permissions endpoints are ready. Starting on the audit trail next."
        ))
        db.session.add(ChatMessage(
            project_id=proj1.id,
            user_id=dev_david.id,
            message="Kanban frontend board is shaping up nicely! We will have live drag-and-drop ready today."
        ))

        db.session.commit()
        print("Database seeded successfully with realistic demo data!")

if __name__ == '__main__':
    seed_database()
