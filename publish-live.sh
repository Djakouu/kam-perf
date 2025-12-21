#!/bin/bash

cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Kill any existing processes on ports 4000 and 5173
lsof -ti:4000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start API and Worker
echo "Starting API and Worker..."
npm run dev:api > api.log 2>&1 &
npm run dev:worker > worker.log 2>&1 &

# Wait for API to be ready
sleep 5

# Start LocalTunnel for API
echo "Exposing API..."
npx localtunnel --port 4000 > api_url.txt 2>&1 &
sleep 5
API_URL=$(grep -o "https://[^ ]*" api_url.txt | head -n 1)

if [ -z "$API_URL" ]; then
  echo "Failed to get API URL from localtunnel. Retrying..."
  sleep 5
  API_URL=$(grep -o "https://[^ ]*" api_url.txt | head -n 1)
fi

if [ -z "$API_URL" ]; then
  echo "Still failed. Check api_url.txt"
  cat api_url.txt
  cleanup
fi

echo "API is live at: $API_URL"

# Start Web with API URL
echo "Starting Web App..."
VITE_API_URL=$API_URL npm run dev:web > web.log 2>&1 &

# Wait for Web to be ready
sleep 5

# Start LocalTunnel for Web
echo "Exposing Web App..."
npx localtunnel --port 5173 > web_url.txt 2>&1 &
sleep 5
WEB_URL=$(grep -o "https://[^ ]*" web_url.txt | head -n 1)

if [ -z "$WEB_URL" ]; then
  echo "Failed to get Web URL from localtunnel."
  cat web_url.txt
  cleanup
fi

echo "---------------------------------------------------"
echo "🚀 Project is LIVE!"
echo "---------------------------------------------------"
echo "🌍 Web App: $WEB_URL"
echo "🔗 API URL: $API_URL"
echo "---------------------------------------------------"
echo "⚠️  IMPORTANT: You must visit the API URL ($API_URL) once in your browser"
echo "    and click 'Click to Continue' to bypass the abuse check."
echo "    Otherwise, the Web App will not be able to fetch data."
echo "---------------------------------------------------"
echo "Press Ctrl+C to stop."

wait
