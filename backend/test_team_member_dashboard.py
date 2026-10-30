import json
from datetime import datetime, timedelta
from app import create_app
from app.models import db, Organization, User, Team, Project, Task, Comment, Attachment, ActivityLog, Notification, TeamMember

app = create_app()
client = app.test_client()

def test_team_member_dashboard_spec():
    print("Testing Team Member Dashboard Specification & Permissions...")

    # 1. Register Organization & Admin
    reg_admin = {
        'name': 'Sarah Admin',
        'email': 'sarah_admin_spec@example.com',
        'password': 'SecureAdminPassword123!',
        'organization_name': 'WorkSphere Spec Corp',
        'role': 'admin'
    }
    res = client.post('/api/auth/register', json=reg_admin)
    assert res.status_code == 201, f"Admin reg failed: {res.data}"
    admin_data = res.get_json()
    admin_token = admin_data['token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    org_id = admin_data['organization']['id']
    admin_id = admin_data['user']['id']
    print("  [PASS] Registered Admin & WorkSphere Spec Organization")

    # 2. Create Team Member user
    member_payload = {
        'name': 'Alex Johnson',
        'email': 'alex_member_spec@example.com',
        'password': 'MemberPassword123!',
        'role': 'team_member'
    }
    res = client.post('/api/users', headers=admin_headers, json=member_payload)
    assert res.status_code == 201
    member_user = res.get_json()['user']
    member_id = member_user['id']
    print("  [PASS] Created Team Member 'Alex Johnson'")

    # Login as Team Member to get member token
    login_res = client.post('/api/auth/login', json={
        'email': 'alex_member_spec@example.com',
        'password': 'MemberPassword123!'
    })
    assert login_res.status_code == 200
    member_token = login_res.get_json()['token']
    member_headers = {'Authorization': f'Bearer {member_token}'}
    print("  [PASS] Logged in as Team Member -> JWT received")

    # 3. Create Team and add Member
    team_payload = {
        'name': 'Frontend Engineering',
        'description': 'UI & Client Architecture Team',
        'member_ids': [member_id]
    }
    res = client.post('/api/teams', headers=admin_headers, json=team_payload)
    assert res.status_code == 201
    team_id = res.get_json()['team']['id']
    print("  [PASS] Created Team & added Team Member")

    # 4. Create Project
    proj_payload = {
        'name': 'E-commerce Website',
        'description': 'Storefront redesign',
        'team_id': team_id,
        'status': 'active'
    }
    res = client.post('/api/projects', headers=admin_headers, json=proj_payload)
    assert res.status_code == 201
    proj_id = res.get_json()['project']['id']
    print("  [PASS] Created Project 'E-commerce Website'")

    # 5. Create Tasks assigned to Member
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=2)
    tomorrow = today + timedelta(days=1)
    next_week = today + timedelta(days=4)

    # Task 1: In progress, Due tomorrow
    t1_payload = {
        'project_id': proj_id,
        'title': 'Build Login Page',
        'description': 'Create responsive login form with validation',
        'assignee_id': member_id,
        'priority': 'high',
        'status': 'in_progress',
        'due_date': tomorrow.isoformat()
    }
    res = client.post('/api/tasks', headers=admin_headers, json=t1_payload)
    assert res.status_code == 201
    t1_id = res.get_json()['task']['id']

    # Task 2: Overdue task
    t2_payload = {
        'project_id': proj_id,
        'title': 'Fix Profile Update Bug',
        'description': 'Investigate image upload error',
        'assignee_id': member_id,
        'priority': 'urgent',
        'status': 'to_do',
        'due_date': yesterday.isoformat()
    }
    res = client.post('/api/tasks', headers=admin_headers, json=t2_payload)
    assert res.status_code == 201
    t2_id = res.get_json()['task']['id']

    # Task 3: Completed task
    t3_payload = {
        'project_id': proj_id,
        'title': 'Design Dashboard Wireframes',
        'description': 'Initial Figma mockups',
        'assignee_id': member_id,
        'priority': 'medium',
        'status': 'completed',
        'due_date': today.isoformat()
    }
    res = client.post('/api/tasks', headers=admin_headers, json=t3_payload)
    assert res.status_code == 201
    t3_id = res.get_json()['task']['id']
    print("  [PASS] Created 3 Tasks with varied statuses and deadlines")

    # 6. Test GET /api/dashboard/member-overview as Team Member
    res = client.get('/api/dashboard/member-overview', headers=member_headers)
    assert res.status_code == 200, f"member-overview failed: {res.data}"
    m_data = res.get_json()
    assert m_data['success'] is True
    assert m_data['stats']['my_tasks'] == 3
    assert m_data['stats']['in_progress'] == 1
    assert m_data['stats']['overdue'] == 1
    assert m_data['team_name'] == 'Frontend Engineering'
    assert len(m_data['my_projects']) >= 1
    print("  [PASS] GET /api/dashboard/member-overview returned accurate KPI numbers")

    # 7. Test GET /api/projects/my-projects
    res = client.get('/api/projects/my-projects', headers=member_headers)
    assert res.status_code == 200
    p_data = res.get_json()
    assert len(p_data['projects']) >= 1
    proj_stat = p_data['projects'][0]
    assert 'progress_percentage' in proj_stat
    assert proj_stat['my_tasks_count'] == 3
    print("  [PASS] GET /api/projects/my-projects returned accessible projects with completion ratios")

    # 8. Test GET /api/calendar/my-deadlines
    res = client.get('/api/calendar/my-deadlines', headers=member_headers)
    assert res.status_code == 200
    cal_data = res.get_json()
    assert cal_data['count'] == 3
    assert any(d['is_overdue'] for d in cal_data['deadlines'])
    print("  [PASS] GET /api/calendar/my-deadlines returned assigned deadlines with overdue flags")

    # 9. Test Global Search GET /api/search?q=Login
    res = client.get('/api/search?q=Login', headers=member_headers)
    assert res.status_code == 200
    search_data = res.get_json()
    assert len(search_data['results']['tasks']) >= 1
    assert search_data['results']['tasks'][0]['title'] == 'Build Login Page'
    print("  [PASS] GET /api/search?q=Login found matching task")

    # 10. Test Team Member Permissions: Can update status
    res = client.patch(f"/api/tasks/{t1_id}/status", headers=member_headers, json={'status': 'review'})
    assert res.status_code == 200
    assert res.get_json()['task']['status'] == 'review'
    print("  [PASS] PATCH /api/tasks/:id/status allowed for Team Member")

    # 11. Test Team Member Permissions: CANNOT change priority/deadline/reassign
    res = client.put(f"/api/tasks/{t1_id}", headers=member_headers, json={
        'priority': 'urgent',
        'due_date': '2030-01-01'
    })
    assert res.status_code == 403, "Team member should be forbidden from changing priority/deadlines"
    print("  [PASS] PUT /api/tasks/:id blocked for forbidden priority/deadline changes by Team Member (403)")

    # 12. Test Team Member Comments & Notifications
    res = client.post(f"/api/tasks/{t1_id}/comments", headers=member_headers, json={'comment': 'PR is open for review!'})
    assert res.status_code == 201
    print("  [PASS] POST /api/tasks/:id/comments allowed for Team Member")

    # Check notification for member
    res = client.get('/api/notifications', headers=member_headers)
    assert res.status_code == 200
    notifs = res.get_json()['notifications']
    if notifs:
        notif_id = notifs[0]['id']
        # Test PATCH /api/notifications/{id}/read/
        patch_res = client.patch(f"/api/notifications/{notif_id}/read/", headers=member_headers)
        assert patch_res.status_code == 200
        print(f"  [PASS] PATCH /api/notifications/{notif_id}/read/ marked notification read")

    # 13. Test GET & PUT /api/profile
    res = client.get('/api/profile', headers=member_headers)
    assert res.status_code == 200
    prof = res.get_json()['profile']
    assert prof['name'] == 'Alex Johnson'
    assert prof['team']['name'] == 'Frontend Engineering'
    print("  [PASS] GET /api/profile returned complete user profile with team information")

    res = client.put('/api/profile', headers=member_headers, json={'name': 'Alex Johnson Updated'})
    assert res.status_code == 200
    assert res.get_json()['user']['name'] == 'Alex Johnson Updated'
    print("  [PASS] PUT /api/profile updated user profile name")

    # Cleanup test records
    with app.app_context():
        Comment.query.filter(Comment.task_id.in_([t1_id, t2_id, t3_id])).delete()
        Task.query.filter_by(project_id=proj_id).delete()
        Project.query.filter_by(id=proj_id).delete()
        TeamMember.query.filter_by(team_id=team_id).delete()
        Team.query.filter_by(id=team_id).delete()
        Notification.query.filter(Notification.user_id.in_([admin_id, member_id])).delete()
        ActivityLog.query.filter_by(organization_id=org_id).delete()
        User.query.filter(User.id.in_([admin_id, member_id])).delete()
        Organization.query.filter_by(id=org_id).delete()
        db.session.commit()
        print("  [CLEANUP] Test tenant and user records removed. Database clean.")


    print("\nALL TEAM MEMBER DASHBOARD SPECIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_team_member_dashboard_spec()
