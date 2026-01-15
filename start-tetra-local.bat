@echo off
setlocal
set ROOT=%~dp0

if not exist "%ROOT%tetra\backend\node_modules" (
  pushd "%ROOT%tetra\backend"
  npm install
  popd
)

start "TETRA Backend" cmd /k "cd /d %ROOT%tetra\backend && npm start"

if not exist "%ROOT%tetra\app\node_modules" (
  pushd "%ROOT%tetra\app"
  npm install
  popd
)

start "TETRA Frontend" cmd /k "cd /d %ROOT%tetra\app && npm run dev"
