# Multi-stage Dockerfile for PiVault

# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps && npm install ajv ajv-keywords --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Image
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Expose the port
EXPOSE 8000

# Start script that runs the backend (assuming backend serves the frontend or they are accessed separately)
# Since the backend doesn't currently serve the frontend, we might need to update server.py 
# to serve static files or use Nginx. 
# For now, we'll just run the backend.
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
