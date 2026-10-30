from app.models import db, ActivityLog, Notification

def log_activity(organization_id, user_id, action, project_id=None, task_id=None, details=None):
    """
    Log an activity for the organization audit trail and activity feed.
    """
    try:
        activity = ActivityLog(
            organization_id=organization_id,
            user_id=user_id,
            project_id=project_id,
            task_id=task_id,
            action=action,
            details=details
        )
        db.session.add(activity)
        db.session.commit()
        return activity
    except Exception as e:
        db.session.rollback()
        print(f"Error logging activity: {e}")
        return None


def create_notification(user_id, title, message, notif_type='info', link=None):
    """
    Create an in-app notification for a user.
    """
    try:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notif_type,
            link=link
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {e}")
        return None
