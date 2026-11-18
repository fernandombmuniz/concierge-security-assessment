@echo off
setlocal
cd /d "%~dp0"
title Gerar build - Concierge Assessment Lumina V3
where node >nul 2>&1
if errorlevel 1 goto missing_node
where npm >nul 2>&1
if errorlevel 1 goto missing_node
echo Preparando dependencias e gerando a versao de producao...
call npm run build
if errorlevel 1 goto failed
echo Build gerado com sucesso. Para abrir o app localmente, use INICIAR_WINDOWS.bat.
pause
exit /b 0
:missing_node
echo Node.js e npm precisam estar instalados. Consulte README.md.
pause
exit /b 1
:failed
echo O build nao foi concluido. Confira a mensagem acima.
pause
exit /b 1
