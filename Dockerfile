FROM python:3.12-slim
WORKDIR /app

# Uncomment if pip install fails building bcrypt/greenlet from source:
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py models.py ./
COPY explanation ./explanation
COPY instance ./instance
COPY layout ./layout
COPY parser ./parser
COPY renderer ./renderer
COPY static ./static

RUN addgroup --system flask && adduser --system --ingroup flask flask
USER flask

EXPOSE 5000

# PORT defaults to 5000 for local docker runs; Render will inject its own
# PORT env var for the private service, which this picks up automatically.
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120 app:app