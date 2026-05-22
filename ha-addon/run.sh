#!/usr/bin/with-contenv bashio

bashio::log.info "Starting Health Recorder addon..."

# Read Google OAuth credentials from addon options
GOOGLE_CLIENT_ID=$(bashio::config 'google_client_id')
GOOGLE_CLIENT_SECRET=$(bashio::config 'google_client_secret')
GOOGLE_REDIRECT_URI=$(bashio::config 'google_redirect_uri')

export GOOGLE_CLIENT_ID
export GOOGLE_CLIENT_SECRET
export GOOGLE_REDIRECT_URI

# Database persists in /data (survives addon updates)
export DATABASE_URL="sqlite:////data/health_recorder.db"

bashio::log.info "Health Recorder listening on port 8099"
cd /app
exec python3 -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8099 \
  --no-access-log
