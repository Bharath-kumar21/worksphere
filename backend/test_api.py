import json
from app import create_app
from app.models import db, Organization, User, Team, Project, Task, Comment, Attachment, ActivityLog, Notification, ChatMessage, TeamMember

app = create_app()
client = app.test_client()

def test_api():
    print("Testing REST API endpoints with self-contained test flow...")

    # 1. Test Health Check
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.data}"
    print("  [PASS] GET /api/health")

    # 2. Test Registration (Self-contained)
    reg_payload = {
        'name': 'Test Admin',
        'email': 'tester_automated@example.com',
        'password': 'SecurePassword123!',
        'organization_name': 'Automated Test Organization',
        'role': 'admin'
    }
    res = client.post('/api/auth/register', json=reg_payload)
    assert res.status_code == 201, f"Registration failed: {res.data}"
    data = res.get_json()
    token = data.get('token')
    assert token, "Token not returned in registration"
    headers = {'Authorization': f'Bearer {token}'}
    print("  [PASS] POST /api/auth/register -> JWT token received")

    # 3. Test Me
    res = client.get('/api/auth/me', headers=headers)
    assert res.status_code == 200
    assert res.get_json()['user']['email'] == 'tester_automated@example.com'
    print("  [PASS] GET /api/auth/me")

    # 4. Test Organization
    res = client.get('/api/organizations/current', headers=headers)
    assert res.status_code == 200
    org_id = res.get_json()['organization']['id']
    print("  [PASS] GET /api/organizations/current")

    # 5. Test Create User
    user_payload = {
        'name': 'Test Member',
        'email': 'member_automated@example.com',
        'password': 'Password123!',
        'role': 'team_member'
    }
    res = client.post('/api/users', headers=headers, json=user_payload)
    assert res.status_code == 201
    member_id = res.get_json()['user']['id']
    print("  [PASS] POST /api/users -> Member created")

    # 6. Test List Users
    res = client.get('/api/users', headers=headers)
    assert res.status_code == 200
    assert len(res.get_json()['users']) >= 2
    print(f"  [PASS] GET /api/users (found {len(res.get_json()['users'])} users)")

    # 7. Test Create Team
    team_payload = {
        'name': 'Automated Core Team',
        'description': 'Test engineering team',
        'member_ids': [member_id]
    }
    res = client.post('/api/teams', headers=headers, json=team_payload)
    assert res.status_code == 201
    team_id = res.get_json()['team']['id']
    print("  [PASS] POST /api/teams -> Team created")

    # 8. Test List Teams
    res = client.get('/api/teams', headers=headers)
    assert res.status_code == 200
    assert len(res.get_json()['teams']) >= 1
    print("  [PASS] GET /api/teams")

    # 9. Test Create Project
    proj_payload = {
        'name': 'Automated Test Project',
        'description': 'Integration testing project',
        'team_id': team_id,
        'status': 'active'
    }
    res = client.post('/api/projects', headers=headers, json=proj_payload)
    assert res.status_code == 201
    proj_id = res.get_json()['project']['id']
    print("  [PASS] POST /api/projects -> Project created")

    # 10. Test Create Task
    task_payload = {
        'project_id': proj_id,
        'title': 'Test Integration Task',
        'description': 'Verify Kanban and comments',
        'assignee_id': member_id,
        'priority': 'high',
        'status': 'to_do',
        'due_date': '2026-12-31'
    }
    res = client.post('/api/tasks', headers=headers, json=task_payload)
    assert res.status_code == 201
    task_id = res.get_json()['task']['id']
    print("  [PASS] POST /api/tasks -> Task created")

    # 11. Test Kanban Quick Status Update
    res = client.patch(f"/api/tasks/{task_id}/status", headers=headers, json={'status': 'in_progress'})
    assert res.status_code == 200
    print(f"  [PASS] PATCH /api/tasks/{task_id}/status -> updated to 'in_progress'")

    # 12. Test Comments
    res = client.post(f"/api/tasks/{task_id}/comments", headers=headers, json={'comment': 'Self-testing task comment!'})
    assert res.status_code == 201
    res = client.get(f"/api/tasks/{task_id}/comments", headers=headers)
    assert res.status_code == 200
    print("  [PASS] POST & GET /api/tasks/:id/comments")

    # 13. Test Dashboard Overview
    res = client.get('/api/dashboard/overview', headers=headers)
    assert res.status_code == 200
    print("  [PASS] GET /api/dashboard/overview")

    # 14. Test Reports
    res = client.get('/api/reports/projects', headers=headers)
    assert res.status_code == 200
    print("  [PASS] GET /api/reports/projects")

    res = client.get('/api/reports/team-workload', headers=headers)
    assert res.status_code == 200
    print("  [PASS] GET /api/reports/team-workload")

    # 15. Test Team Dashboard
    res = client.get(f"/api/teams/{team_id}/dashboard", headers=headers)
    assert res.status_code == 200
    print(f"  [PASS] GET /api/teams/{team_id}/dashboard")

    # 16. Test CSV Export
    res = client.get('/api/reports/export/csv', headers=headers)
    assert res.status_code == 200
    assert 'text/csv' in res.content_type
    print("  [PASS] GET /api/reports/export/csv")

    # 17. Test Activity History
    res = client.get('/api/activity', headers=headers)
    assert res.status_code == 200
    print(f"  [PASS] GET /api/activity (found {len(res.get_json()['activities'])} entries)")

    # Cleanup test records to leave the database clean
    with app.app_context():
        ChatMessage.query.filter_by(project_id=proj_id).delete()
        Comment.query.filter_by(task_id=task_id).delete()
        Task.query.filter_by(project_id=proj_id).delete()
        Project.query.filter_by(id=proj_id).delete()
        TeamMember.query.filter_by(team_id=team_id).delete()
        Team.query.filter_by(id=team_id).delete()
        Notification.query.filter(Notification.user_id.in_([member_id, data['user']['id']])).delete()
        ActivityLog.query.filter_by(organization_id=org_id).delete()
        User.query.filter(User.id.in_([member_id, data['user']['id']])).delete()
        Organization.query.filter_by(id=org_id).delete()
        db.session.commit()
        print("  [CLEANUP] Test tenant wiped. Database left pristine.")


    print("\nALL 17 REST API TEST SUITES PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_api()
