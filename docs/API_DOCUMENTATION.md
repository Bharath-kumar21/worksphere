# TeamFlow SaaS — REST API Documentation

This document describes all REST API endpoints available in the Team Collaboration SaaS backend.

## Base URL & Authentication

- Base URL: `http://localhost:5000/api` (Development) or `https://collab.yourdomain.com/api` (Production)
- Authentication: **Bearer JWT Token**
- Header: `Authorization: Bearer <token>`
- Postman Collection: `Team_Collab_SaaS.postman_collection.json` (located in project root)

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Registers a new organization along with the initial organization owner (`admin` role).

**Request Body:**
```json
{
  "name": "Sarah Connor",
  "email": "admin@acme.com",
  "password": "password123",
  "organization_name": "Acme Cloud Technologies",
  "role": "admin"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": 1,
    "name": "Sarah Connor",
    "email": "admin@acme.com",
    "role": "admin",
    "organization_id": 1,
    "status": "active"
  },
  "organization": {
    "id": 1,
    "name": "Acme Cloud Technologies",
    "status": "active"
  }
}
```

### `POST /api/auth/login`
Authenticates a user and returns a signed JWT token valid for 24 hours.

**Request Body:**
```json
{
  "email": "admin@acme.com",
  "password": "password123"
}
```

### `GET /api/auth/me`
Retrieves current authenticated user's profile and organization info.

### `PUT /api/auth/profile`
Updates current user's profile name, avatar URL, or password.

---

## 2. Organization Endpoints (`/api/organizations`)

### `GET /api/organizations/current`
Returns current organization details including live counts of users, teams, projects, and tasks.

### `PUT /api/organizations/current`
*(Requires `admin` role)* Updates organization name or operational status (`active`, `suspended`).

---

## 3. User Management Endpoints (`/api/users`)

### `GET /api/users`
Lists all members in the current organization with assigned task metrics.
- Query Parameters: `role` (`admin`, `project_manager`, `team_member`), `search`

### `POST /api/users`
*(Requires `admin` role)* Creates and invites a new user with an assigned role.
**Request Body:**
```json
{
  "name": "Alex Rivera",
  "email": "manager@acme.com",
  "password": "password123",
  "role": "project_manager"
}
```

### `GET /api/users/:id`
Retrieves single user profile with team memberships and assigned tasks.

### `PUT /api/users/:id`
*(Requires `admin` role)* Updates user role, account status (`active` / `inactive`), or password.

### `DELETE /api/users/:id`
*(Requires `admin` role)* Removes user from the organization.

---

## 4. Teams Endpoints (`/api/teams`)

### `GET /api/teams`
Lists all teams in the organization with member lists and project counts.

### `POST /api/teams`
*(Requires `admin` or `project_manager`)* Creates a new team with optional initial members.
```json
{
  "name": "Core Engineering",
  "description": "Frontend, backend, infrastructure, and API architecture team.",
  "member_ids": [1, 2, 3]
}
```

### `GET /api/teams/:id`
Returns team details, members, and assigned projects.

### `PUT /api/teams/:id`
Updates team name or description.

### `DELETE /api/teams/:id`
*(Requires `admin` role)* Deletes a team.

### `POST /api/teams/:id/members`
Adds a user to the team (`user_id`, `role_in_team`).

### `DELETE /api/teams/:id/members/:userId`
Removes a user from the team.

### `GET /api/teams/:id/dashboard`
Returns team-specific dashboard: member workload breakdown, task completion rates, and active projects.

---

## 5. Projects Endpoints (`/api/projects`)

### `GET /api/projects`
Lists projects in the organization.
- Query Parameters: `team_id`, `manager_id`, `status` (`planning`, `active`, `on_hold`, `completed`, `archived`)

### `POST /api/projects`
*(Requires `admin` or `project_manager`)* Creates a new project.
```json
{
  "name": "Enterprise SaaS Portal V2",
  "description": "Next-generation collaboration platform with Kanban boards.",
  "team_id": 1,
  "manager_id": 2,
  "start_date": "2026-10-01",
  "end_date": "2026-12-15",
  "status": "active"
}
```

### `GET /api/projects/:id`
Returns full project details and task list.

### `PUT /api/projects/:id`
Updates project metadata, manager, team, timeline, or status.

### `DELETE /api/projects/:id`
*(Requires `admin` role)* Deletes project and cascades task deletion.

### `GET /api/projects/:id/dashboard`
Returns project metrics: completion percentage, task count by status (`to_do`, `in_progress`, `review`, `completed`), priority distribution, overdue tasks, and member workloads.

---

## 6. Tasks Endpoints (`/api/tasks`)

### `GET /api/tasks`
Lists tasks with flexible filters:
- `project_id`: filter by project ID
- `assignee_id`: filter by assignee ID (`me` for logged in user, `unassigned` for unassigned tasks)
- `status`: `to_do`, `in_progress`, `review`, `completed`
- `priority`: `low`, `medium`, `high`, `urgent`
- `search`: search keywords in title or description

### `POST /api/tasks`
Creates a task, logs activity, and sends notification to assignee.
```json
{
  "project_id": 1,
  "title": "Design Responsive Kanban Board Component",
  "description": "Create drag-and-drop Kanban columns with live status updates.",
  "assignee_id": 3,
  "priority": "high",
  "status": "to_do",
  "due_date": "2026-10-25"
}
```

### `GET /api/tasks/:id`
Retrieves task details including comments thread and file attachments list.

### `PUT /api/tasks/:id`
Updates task title, description, priority, status, assignee, or due date. Logs change and notifies assignee.

### `PATCH /api/tasks/:id/status`
Optimized status transition endpoint for Kanban drag-and-drop moves.
```json
{
  "status": "in_progress"
}
```

### `DELETE /api/tasks/:id`
Deletes task (allowed by creator, project manager, or admin).

---

## 7. Comments Endpoints (`/api/tasks/:taskId/comments`)

### `GET /api/tasks/:taskId/comments`
Lists chronological comments on a task with user author info.

### `POST /api/tasks/:taskId/comments`
Adds a comment to the task and notifies task assignee and creator.
```json
{
  "comment": "All frontend components are built and tested on staging."
}
```

### `DELETE /api/comments/:id`
Deletes comment (author or admin).

---

## 8. Attachments Endpoints (`/api/tasks/:taskId/attachments`)

### `GET /api/tasks/:taskId/attachments`
Lists file attachments on a task.

### `POST /api/tasks/:taskId/attachments`
Uploads a file attachment (`multipart/form-data`, key: `file`). Max size: 16MB. Allowed formats: images, documents, PDFs, zips, spreadsheets.

### `GET /api/attachments/:id/download`
Downloads / streams the attachment file.

### `DELETE /api/attachments/:id`
Deletes attachment file and database record.

---

## 9. Dashboard & Reports Endpoints (`/api/dashboard`, `/api/reports`)

### `GET /api/dashboard/overview`
High-level overview metrics: total projects, total tasks, status breakdown, priority distribution, overdue counts, upcoming deadlines, and recent activities.

### `GET /api/reports/projects`
Detailed delivery report for all projects with completion percentages, task status counts, and overdue counts.

### `GET /api/reports/team-workload`
Workload matrix per team member (assigned, in progress, completed, overdue, completion rate).

### `GET /api/reports/export/csv`
Exports task reporting data as a downloadable `.csv` file.

---

## 10. Activity & Notifications (`/api/activity`, `/api/notifications`)

### `GET /api/activity`
Audit trail of activities with optional filters (`project_id`, `user_id`, `page`, `limit`).

### `GET /api/notifications`
Returns current user's notifications.

### `GET /api/notifications/unread-count`
Returns `{ "unread_count": <number> }`.

### `PUT /api/notifications/:id/read`
Marks single notification as read.

### `PUT /api/notifications/read-all`
Marks all notifications as read.

---

## 11. Project Live Chat (`/api/projects/:id/messages`)

### `GET /api/projects/:id/messages`
Returns recent collaborative chat messages for the project.

### `POST /api/projects/:id/messages`
Posts a new chat message to the project discussion thread.
```json
{
  "message": "Sprint planning meeting starts in 15 minutes."
}
```
