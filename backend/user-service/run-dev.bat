@echo off
REM Script pour lancer le user-service

echo.
echo ============================================
echo  Lancement du User Service
echo ============================================
echo.

REM Vérifier que Maven est installé
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo ERREUR: Maven n'est pas installé ou pas dans le PATH
    echo.
    echo Solutions:
    echo 1. Installer Maven: choco install maven -y
    echo 2. Ou télécharger depuis: https://maven.apache.org/download.cgi
    echo.
    pause
    exit /b 1
)

echo Maven trouvé. Compilation et lancement...
echo.

REM Compiler et lancer
mvn clean package -DskipTests
if %errorlevel% neq 0 (
    echo.
    echo ERREUR: La compilation a échoué
    pause
    exit /b 1
)

echo.
echo Lancement de l'application avec application.properties (MySQL + email)...
echo.
REM Compiler et lancer avec la configuration par défaut
mvn spring-boot:run

pause

