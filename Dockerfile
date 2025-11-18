FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# system deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl git ca-certificates netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*
# Some Docker registries or networks are flaky. Add retries for package fetch
RUN apt-get update || true

# install python deps
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy project
COPY . /app

# entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PATH="/root/.local/bin:$PATH"

EXPOSE 8001

CMD ["/entrypoint.sh"]
