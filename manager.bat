@echo off
setlocal EnableDelayedExpansion
title Chemometrics Helper - Manager
color 0A

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "LOGS_DIR=%ROOT_DIR%logs"

:: Crear carpeta de logs si no existe
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

:MENU
cls
echo.
echo   ===========================================================
echo                  CHEMOMETRICS HELPER - MANAGER
echo   ===========================================================
echo.
echo      [1] Iniciar Backend         [6] Detener Backend
echo      [2] Iniciar Frontend        [7] Detener Frontend
echo      [3] Iniciar Todo            [8] Detener Todo
echo.
echo      [4] Ver Logs Backend        [9] Reiniciar Backend
echo      [5] Ver Logs Frontend      [10] Reiniciar Frontend
echo                                  [11] Reiniciar Todo
echo.
echo     [12] Estado de Servicios
echo     [13] Instalar Dependencias
echo.
echo      [0] Salir
echo.
echo   ===========================================================
echo.
set /p "CHOICE=  Selecciona una opcion: "

if "%CHOICE%"=="1" goto START_BACKEND
if "%CHOICE%"=="2" goto START_FRONTEND
if "%CHOICE%"=="3" goto START_ALL
if "%CHOICE%"=="4" goto LOGS_BACKEND
if "%CHOICE%"=="5" goto LOGS_FRONTEND
if "%CHOICE%"=="6" goto STOP_BACKEND
if "%CHOICE%"=="7" goto STOP_FRONTEND
if "%CHOICE%"=="8" goto STOP_ALL
if "%CHOICE%"=="9" goto RESTART_BACKEND
if "%CHOICE%"=="10" goto RESTART_FRONTEND
if "%CHOICE%"=="11" goto RESTART_ALL
if "%CHOICE%"=="12" goto STATUS
if "%CHOICE%"=="13" goto INSTALL_DEPS
if "%CHOICE%"=="0" goto EXIT

echo.
echo  Opcion invalida. Intenta de nuevo.
timeout /t 2 >nul
goto MENU

:: ============================================================
:: INICIAR BACKEND
:: ============================================================
:START_BACKEND
cls
echo.
echo  Iniciando Backend...
echo.

:: Verificar si ya está corriendo
tasklist /FI "WINDOWTITLE eq Chemometrics - Backend*" 2>nul | find "cmd.exe" >nul
if not errorlevel 1 (
    echo  [!] El Backend ya esta corriendo.
    timeout /t 3 >nul
    goto MENU
)

cd /d "%BACKEND_DIR%"

if not exist "venv" (
    echo  Creando entorno virtual...
    python -m venv venv
)

:: Iniciar en nueva ventana con logging
start "Chemometrics - Backend" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate && pip install -r requirements.txt --quiet && echo. && echo [Backend] Servidor iniciado en http://localhost:8000 && echo [Backend] API Docs: http://localhost:8000/docs && echo. && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 2>&1 | tee "%LOGS_DIR%\backend.log""

echo.
echo  [OK] Backend iniciado en nueva ventana.
echo  URL: http://localhost:8000
echo  Docs: http://localhost:8000/docs
timeout /t 3 >nul
goto MENU

:: ============================================================
:: INICIAR FRONTEND
:: ============================================================
:START_FRONTEND
cls
echo.
echo  Iniciando Frontend...
echo.

:: Verificar si ya está corriendo
tasklist /FI "WINDOWTITLE eq Chemometrics - Frontend*" 2>nul | find "cmd.exe" >nul
if not errorlevel 1 (
    echo  [!] El Frontend ya esta corriendo.
    timeout /t 3 >nul
    goto MENU
)

cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
    echo  Instalando dependencias npm...
    npm install
)

:: Iniciar en nueva ventana
start "Chemometrics - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && echo [Frontend] Servidor iniciado en http://localhost:5173 && npm run dev"

echo.
echo  [OK] Frontend iniciado en nueva ventana.
echo  URL: http://localhost:5173
timeout /t 3 >nul
goto MENU

:: ============================================================
:: INICIAR TODO
:: ============================================================
:START_ALL
cls
echo.
echo  Iniciando Backend y Frontend...
echo.

:: Backend
cd /d "%BACKEND_DIR%"
if not exist "venv" (
    echo  Creando entorno virtual para Backend...
    python -m venv venv
)
start "Chemometrics - Backend" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate && pip install -r requirements.txt --quiet && echo [Backend] http://localhost:8000 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 >nul

:: Frontend
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    echo  Instalando dependencias npm...
    npm install
)
start "Chemometrics - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && echo [Frontend] http://localhost:5173 && npm run dev"

echo.
echo  [OK] Ambos servicios iniciados.
echo.
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo  Frontend: http://localhost:5173
timeout /t 4 >nul
goto MENU

:: ============================================================
:: VER LOGS BACKEND
:: ============================================================
:LOGS_BACKEND
cls
echo.
echo  === LOGS DEL BACKEND ===
echo.

if exist "%LOGS_DIR%\backend.log" (
    type "%LOGS_DIR%\backend.log" | more
) else (
    echo  No hay logs disponibles.
    echo  (Los logs se generan cuando el backend esta corriendo)
)

echo.
pause
goto MENU

:: ============================================================
:: VER LOGS FRONTEND
:: ============================================================
:LOGS_FRONTEND
cls
echo.
echo  === LOGS DEL FRONTEND ===
echo.

if exist "%LOGS_DIR%\frontend.log" (
    type "%LOGS_DIR%\frontend.log" | more
) else (
    echo  No hay logs disponibles.
    echo  (Revisa la ventana del Frontend para ver los logs en tiempo real)
)

echo.
pause
goto MENU

:: ============================================================
:: DETENER BACKEND
:: ============================================================
:STOP_BACKEND
cls
echo.
echo  Deteniendo Backend...
echo.

:: Cerrar ventana del backend
taskkill /FI "WINDOWTITLE eq Chemometrics - Backend*" /F >nul 2>&1

:: Matar procesos de uvicorn/python en puerto 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  [OK] Backend detenido.
timeout /t 2 >nul
goto MENU

:: ============================================================
:: DETENER FRONTEND
:: ============================================================
:STOP_FRONTEND
cls
echo.
echo  Deteniendo Frontend...
echo.

:: Cerrar ventana del frontend
taskkill /FI "WINDOWTITLE eq Chemometrics - Frontend*" /F >nul 2>&1

:: Matar procesos de node en puerto 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  [OK] Frontend detenido.
timeout /t 2 >nul
goto MENU

:: ============================================================
:: DETENER TODO
:: ============================================================
:STOP_ALL
cls
echo.
echo  Deteniendo todos los servicios...
echo.

:: Backend
taskkill /FI "WINDOWTITLE eq Chemometrics - Backend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Frontend
taskkill /FI "WINDOWTITLE eq Chemometrics - Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  [OK] Todos los servicios detenidos.
timeout /t 2 >nul
goto MENU

:: ============================================================
:: REINICIAR BACKEND
:: ============================================================
:RESTART_BACKEND
cls
echo.
echo  Reiniciando Backend...
echo.

:: Detener
taskkill /FI "WINDOWTITLE eq Chemometrics - Backend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 >nul

:: Iniciar
cd /d "%BACKEND_DIR%"
start "Chemometrics - Backend" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate && pip install -r requirements.txt --quiet && echo [Backend] Reiniciado - http://localhost:8000 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo  [OK] Backend reiniciado.
timeout /t 2 >nul
goto MENU

:: ============================================================
:: REINICIAR FRONTEND
:: ============================================================
:RESTART_FRONTEND
cls
echo.
echo  Reiniciando Frontend...
echo.

:: Detener
taskkill /FI "WINDOWTITLE eq Chemometrics - Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 >nul

:: Iniciar
cd /d "%FRONTEND_DIR%"
start "Chemometrics - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && echo [Frontend] Reiniciado - http://localhost:5173 && npm run dev"

echo  [OK] Frontend reiniciado.
timeout /t 2 >nul
goto MENU

:: ============================================================
:: REINICIAR TODO
:: ============================================================
:RESTART_ALL
cls
echo.
echo  Reiniciando todos los servicios...
echo.

:: Detener todo
taskkill /FI "WINDOWTITLE eq Chemometrics - Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Chemometrics - Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 >nul

:: Iniciar todo
cd /d "%BACKEND_DIR%"
start "Chemometrics - Backend" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate && pip install -r requirements.txt --quiet && echo [Backend] Reiniciado - http://localhost:8000 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 >nul

cd /d "%FRONTEND_DIR%"
start "Chemometrics - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && echo [Frontend] Reiniciado - http://localhost:5173 && npm run dev"

echo  [OK] Todos los servicios reiniciados.
timeout /t 3 >nul
goto MENU

:: ============================================================
:: ESTADO DE SERVICIOS
:: ============================================================
:STATUS
cls
echo.
echo   ===========================================================
echo                    ESTADO DE SERVICIOS
echo   ===========================================================
echo.

:: Verificar Backend (puerto 8000)
netstat -aon | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   [ACTIVO]   Backend  - http://localhost:8000
) else (
    echo   [INACTIVO] Backend  - Puerto 8000 libre
)

:: Verificar Frontend (puerto 5173)
netstat -aon | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo   [ACTIVO]   Frontend - http://localhost:5173
) else (
    echo   [INACTIVO] Frontend - Puerto 5173 libre
)

echo.
echo  -----------------------------------------------------------
echo.

:: Mostrar info adicional
echo   Directorio raiz: %ROOT_DIR%
echo   Backend:         %BACKEND_DIR%
echo   Frontend:        %FRONTEND_DIR%
echo   Logs:            %LOGS_DIR%

echo.
pause
goto MENU

:: ============================================================
:: INSTALAR DEPENDENCIAS
:: ============================================================
:INSTALL_DEPS
cls
echo.
echo  Instalando todas las dependencias...
echo.

echo  [1/2] Configurando Backend (Python)...
cd /d "%BACKEND_DIR%"
if not exist "venv" (
    echo        Creando entorno virtual...
    python -m venv venv
)
call venv\Scripts\activate
echo        Instalando requirements.txt...
pip install -r requirements.txt
call deactivate

echo.
echo  [2/2] Configurando Frontend (npm)...
cd /d "%FRONTEND_DIR%"
echo        Instalando node_modules...
call npm install

echo.
echo  [OK] Todas las dependencias instaladas.
echo.
pause
goto MENU

:: ============================================================
:: SALIR
:: ============================================================
:EXIT
cls
echo.
echo  Hasta luego!
echo.
timeout /t 1 >nul
exit /b 0
