# PROJECT 8 — WorkSphere: Project & Team Collaboration SaaS Platform

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1-black.svg)](https://flask.palletsprojects.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3.svg)](https://getbootstrap.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#)

A high-performance, enterprise-grade multi-tenant SaaS collaboration platform built with **Python (Flask)**, **MySQL**, and a **Modern React (Vite)** frontend. It enables organizations to structure teams, plan projects, track deliverables on drag-and-drop Kanban boards, discuss tasks with threaded comments, upload file attachments, and monitor productivity with real-time audit trails and visual reports.

---

## Table of Contents
1. [Overview & Role System](#overview--role-system)
2. [Core Features & Business Flow](#core-features--business-flow)
3. [Technology Stack](#technology-stack)
4. [Architecture & Information Model](#architecture--information-model)
5. [Quick Start Guide](#quick-start-guide)
6. [Demo Accounts & 1-Click Evaluation](#demo-accounts--1-click-evaluation)
7. [Automated Test Suite](#automated-test-suite)
8. [Postman API Collection](#postman-api-collection)
9. [Production Server (Gunicorn + Nginx + HTTPS)](#production-server-gunicorn--nginx--https)

---

## Overview & Role System

The platform enforces strict Role-Based Access Control (RBAC):

| Role | Responsibilities & Capabilities |
| :--- | :--- |
| **Organization Admin** | Manages organization settings, invites/removes users, assigns roles (`admin`, `project_manager`, `team_member`), creates departments/teams, and audits all activities. |
| **Project Manager** | Creates and updates projects, sets deadlines/timelines, creates and assigns tasks to team members, sets priorities, and monitors project velocity. |
| **Team Member** | Works on assigned deliverables, moves tasks across Kanban columns (To Do → In Progress → Review → Completed), posts comments, and uploads attachments. |

---

## Core Features & Business Flow

### The Business Flow
$$\text{Admin creates Org} \longrightarrow \text{Adds Team} \longrightarrow \text{Manager creates Project} \longrightarrow \text{Assigns Tasks} \longrightarrow \text{Members update Tasks} \longrightarrow \text{Manager tracks Progress}$$

### Core Features (Built & Verified)
- **Organization Registration**: Self-serve SaaS onboarding with organization creation and owner account provisioning.
- **User Management**: Add members, update profile details, assign roles, activate or suspend accounts.
- **Team Management**: Form functional teams (e.g. Core Engineering, Product & UX Design), manage membership rosters, and view team dashboards.
- **Project Management**: Create projects with manager assignment, team linking, start/end dates, descriptions, and status (`planning`, `active`, `on_hold`, `completed`, `archived`).
- **Task Management**: Title, description, assignee, priority (`low`, `medium`, `high`, `urgent`), status (`to_do`, `in_progress`, `review`, `completed`), and due dates.
- **Interactive Kanban Board**: Drag-and-drop status transitions with optimistic UI updates and live state sync.
- **Threaded Comments**: Real-time collaborative discussions on individual tasks with timestamps and user avatars.
- **Task File Attachments**: Upload, view, and download project files with secure storage and 16MB file size limits.
- **Project & Team Dashboards**: Real-time velocity metrics, completion percentages, overdue warnings, and workload distributions.
- **Activity History & Audit Feed**: Comprehensive event log capturing every task change, status move, and comment across the organization.
- **In-App Notifications**: Alerts when assigned to a task, when priorities/statuses change, or when comments are posted.
- **Performance Reports & CSV Export**: Export project completion matrices and member workloads to CSV for reporting.
- **Bonus Feature — Live Project Chat**: Real-time project messaging drawer for team discussions.

---

## Technology Stack

- **Backend**: Python 3.12, Flask 3.1, Flask-SQLAlchemy 3.1, Flask-CORS, PyMySQL, PyJWT, Werkzeug.
- **Database**: MySQL 8.0 with InnoDB utf8mb4 charset and relational foreign key constraints.
- **Modern Frontend**: React 18, Vite 5, Bootstrap 5, Custom CSS, Lucide React icons.
- **API Protocol**: RESTful JSON API with Bearer JWT Authentication.
- **Production Stack**: Gunicorn WSGI Server, Nginx Reverse Proxy, Let's Encrypt HTTPS / TLS 1.3, Systemd.

---

## Architecture & Information Model

```
+--------------------------------------------------------------------------+
|                            MySQL 8.0 Database                            |
+-------------------+--------------------+---------------------------------+
| organizations     | id, name, owner_id, status, created_at               |
| users             | id, org_id, name, email, password_hash, role, status |
| teams             | id, org_id, name, description                        |
| team_members      | id, team_id, user_id, role_in_team                   |
| projects          | id, org_id, team_id, name, manager_id, dates, status |
| tasks             | id, project_id, title, assignee_id, priority, status |
| comments          | id, task_id, user_id, comment, created_at            |
| attachments       | id, task_id, user_id, original_name, file_path       |
| activity_logs     | id, org_id, project_id, task_id, user_id, action     |
| notifications     | id, user_id, title, message, is_read, link           |
| chat_messages     | id, project_id, user_id, message, created_at         |
+-------------------+--------------------+---------------------------------+
```

---

## Quick Start Guide

### 1. Database Setup
Make sure your local MySQL service is running:
```sql
CREATE DATABASE IF NOT EXISTS team_collab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Setup & Seeding
From the project root:
```bash
cd backend
pip install -r requirements.txt
python seed_data.py
python run.py
```
> The Flask backend will start on **`http://127.0.0.1:5000`** and automatically verify database tables and upload directories.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
> The React application will start on **`http://localhost:3000`** with Vite hot module replacement (HMR) and automatic API proxying.

Alternatively, since the production React build has already been generated in `frontend/dist`, visiting **`http://127.0.0.1:5000`** directly serves the full React application straight from Flask!

---

## Demo Accounts & 1-Click Evaluation

The login page features **1-Click Demo Login** buttons:

| Role | Email | Password | Pre-configured Data |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acme.com` | `password123` | Full access, user management, audit history, org settings |
| **Project Manager** | `manager@acme.com` | `password123` | Creates projects & tasks, assigns team members, monitors metrics |
| **Team Member** | `david@acme.com` | `password123` | Assigned to frontend tasks, Kanban drag & drop, file uploads |
| **Team Member** | `emily@acme.com` | `password123` | Assigned to backend tasks & RBAC authentication |
| **Team Member** | `marcus@acme.com` | `password123` | Assigned to design tasks on mobile project |

---

## Automated Test Suite

Run the automated backend test suite verifying all 17 REST endpoints:
```bash
cd backend
python test_api.py
```

Expected output:
```
Testing REST API endpoints with test client...
  [PASS] GET /api/health
  [PASS] POST /api/auth/login -> JWT received
  [PASS] GET /api/auth/me
  [PASS] GET /api/organizations/current
  [PASS] GET /api/users (found 5 users)
  [PASS] GET /api/teams (found 2 teams)
  [PASS] GET /api/projects (found 3 projects)
  [PASS] GET /api/tasks (found 9 tasks)
  [PASS] PATCH /api/tasks/1/status -> updated to 'review'
  [PASS] GET /api/dashboard/overview (total tasks: 9)
  [PASS] GET /api/reports/projects
  [PASS] GET /api/reports/team-workload
  [PASS] GET /api/activity (found entries)
  [PASS] GET /api/notifications
  [PASS] POST & GET /api/tasks/1/comments
  [PASS] GET /api/teams/1/dashboard
  [PASS] GET /api/reports/export/csv

ALL 17 REST API TEST SUITES PASSED SUCCESSFULLY!
```

---

## Postman API Collection

A complete Postman collection is included at the root of the project:
- File: **`Team_Collab_SaaS.postman_collection.json`**
- How to use:
  1. Open Postman → Click **Import** → Select `Team_Collab_SaaS.postman_collection.json`.
  2. Run the **Login Admin** request first — it automatically saves the `{{token}}` collection variable.
  3. Run any request across Authentication, Organizations, Users, Teams, Projects, Tasks, Kanban, Comments, Attachments, Reports, or Notifications!

---

## Production Server (Gunicorn + Nginx + HTTPS)

Production configuration templates are provided in `backend/`:
- **`backend/gunicorn_config.py`**: Multi-worker WSGI configuration with process management and timeouts.
- **`backend/nginx.conf`**: Nginx reverse proxy with SSL termination (TLS 1.2/1.3), security headers (`HSTS`, `nosniff`, `SAMEORIGIN`), client max body size (16MB), and static upload routing.
- **`backend/team_collab.service`**: Systemd unit file for running Gunicorn as a supervised background daemon.
- **Detailed Step-by-Step Guide**: See [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).
- **Full API Specification**: See [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md).
