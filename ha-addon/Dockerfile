ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base-python:3.12-alpine3.20
FROM ${BUILD_FROM}

# Build dependencies (needed by some Python packages)
RUN apk add --no-cache gcc musl-dev libffi-dev

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy Python app package
COPY app/ app/

# Copy vanilla-JS UI → served as static/index.html
COPY ui/ static/

# Startup script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 8099
CMD ["/run.sh"]
