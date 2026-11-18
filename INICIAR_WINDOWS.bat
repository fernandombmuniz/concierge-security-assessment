@echo off
setlocal
cd /d "%~dp0"
title Concierge Assessment Lumina V3
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_node
if not exist ".env.local" if not exist ".env" goto missing_env
echo Iniciando Concierge Assessment Lumina V3...
echo As dependencias serao preparadas automaticamente no primeiro uso.
echo Mantenha esta janela aberta. Para encerrar, pressione Ctrl+C.
call npm run dev -- --host 127.0.0.1 --port 8080 --strictPort --open
if errorlevel 1 goto failed
exit /b 0
:missing_node
echo Node.js e npm precisam estar instalados. Consulte README.md.
pause
exit /b 1
:missing_env
echo Copie .env.local da pasta atual do Assessment para esta pasta.
echo Depois, abra este iniciador novamente. Consulte README.md.
pause
exit /b 1
:failed
echo Nao foi possivel iniciar. Confira a mensagem acima e o README.md.
pause
exit /b 1
