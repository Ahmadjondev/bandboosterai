#!/usr/bin/env bash
set -e

echo "Starting entrypoint..."

# Wait for Postgres to become available
host="$DB_HOST"
port=${DB_PORT:-5432}

if [ -n "$host" ]; then
  echo "Waiting for database $host:$port..."
  for i in {1..30}; do
    if nc -z $host $port; then
      echo "Database is up"
      break
    fi
    echo "Waiting for database... ($i)"
    sleep 1
  done
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

if [ "$DJANGO_SUPERUSER_USERNAME" != "" ] && [ "$DJANGO_SUPERUSER_EMAIL" != "" ]; then
  echo "Creating superuser if not exists..."
  python manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); User.objects.filter(username=\"$DJANGO_SUPERUSER_USERNAME\").exists() or User.objects.create_superuser(\"$DJANGO_SUPERUSER_USERNAME\", \"$DJANGO_SUPERUSER_EMAIL\", \"$DJANGO_SUPERUSER_PASSWORD\")"
fi

echo "Starting Gunicorn..."
# Use gunicorn if available, otherwise fallback to runserver for development
if command -v gunicorn >/dev/null 2>&1; then
  exec gunicorn mockexam.wsgi:application --bind 0.0.0.0:8001 --workers 3
else
  exec python manage.py runserver 0.0.0.0:8001
fi
