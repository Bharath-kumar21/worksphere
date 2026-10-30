"""
Gunicorn configuration for Team Collaboration SaaS production deployment.
Usage: gunicorn -c gunicorn_config.py "app:create_app()"
"""

import multiprocessing

bind = "127.0.0.1:5000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "/var/log/team_collab/gunicorn_access.log"
errorlog = "/var/log/team_collab/gunicorn_error.log"
loglevel = "info"

# Security & Process Naming
proc_name = "worksphere_saas"
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
