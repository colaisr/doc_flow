#!/bin/bash

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Start backend server
echo "Starting backend server..."
cd "$PROJECT_ROOT/backend" || exit 1
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$PROJECT_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Start frontend server
echo "Starting frontend server..."
cd "$PROJECT_ROOT/frontend" || exit 1
npm run dev > "$PROJECT_ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "Both servers are starting..."
echo "Backend logs: tail -f backend.log"
echo "Frontend logs: tail -f frontend.log"
echo ""
echo "To stop both servers, run: pkill -f 'uvicorn app.main:app' && pkill -f 'next dev'"
