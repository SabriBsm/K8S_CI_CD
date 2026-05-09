#!/usr/bin/env pwsh

Write-Host "`n"
Write-Host "======================================== " -ForegroundColor Cyan
Write-Host "Starting PlanSync Microservices" -ForegroundColor Cyan
Write-Host "======================================== `n" -ForegroundColor Cyan

$ROOT_PATH = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_PATH = Join-Path $ROOT_PATH "backend"
$FRONTEND_PATH = Join-Path $ROOT_PATH "frontend"

function Start-Service {
    param (
        [int]$Number,
        [string]$Name,
        [string]$Port,
        [string]$Path,
        [string]$Command
    )

    Write-Host "[$Number/8] Starting $Name (Port $Port)..." -ForegroundColor Green
    Start-Process -NoNewWindow -FilePath pwsh -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command"
    Start-Sleep -Seconds 5
}

# 1. Config Server (Port 8888)
Start-Service -Number 1 -Name "Config Server" -Port "8888" `
    -Path "$BACKEND_PATH\config-server" -Command ".\mvnw.cmd spring-boot:run"

# 2. Eureka Server (Port 8761)
Start-Service -Number 2 -Name "Eureka Server" -Port "8761" `
    -Path "$BACKEND_PATH\eureka-server" -Command ".\mvnw.cmd spring-boot:run"

# 3. User Service (Port 8079)
Start-Service -Number 3 -Name "User Service" -Port "8079" `
    -Path "$BACKEND_PATH\user-service" -Command ".\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=dev"

# 4. Risk Service (Port 8089)
Start-Service -Number 4 -Name "Risk Service" -Port "8089" `
    -Path "$BACKEND_PATH\service-risque\Gestion_Risk" -Command ".\mvnw.cmd spring-boot:run"

# 5. Projet Service (Port 8082)
Start-Service -Number 5 -Name "Projet Service" -Port "8082" `
    -Path "$BACKEND_PATH\projet-service" -Command ".\mvnw.cmd spring-boot:run"

# 6. API Gateway (Port 8080)
Start-Service -Number 6 -Name "API Gateway" -Port "8080" `
    -Path "$BACKEND_PATH\api-gateway" -Command ".\mvnw.cmd spring-boot:run"

# 7. Gemini Express API (Port 3000)
Start-Service -Number 7 -Name "Gemini Express API" -Port "3000" `
    -Path "$BACKEND_PATH\gemini-express-api" -Command "npm start"

# 8. Frontend Angular (Port 4200)
Start-Service -Number 8 -Name "Frontend" -Port "4200" `
    -Path "$FRONTEND_PATH" -Command "npm start"

Write-Host "`n======================================== " -ForegroundColor Cyan
Write-Host "All services are starting..." -ForegroundColor Cyan
Write-Host "======================================== `n" -ForegroundColor Cyan

Write-Host "Services URLs:" -ForegroundColor Yellow
Write-Host "- Config Server: http://localhost:8888" -ForegroundColor White
Write-Host "- Eureka:       http://localhost:8761" -ForegroundColor White
Write-Host "- User Service: http://localhost:8079" -ForegroundColor White
Write-Host "- Risk Service: http://localhost:8089" -ForegroundColor White
Write-Host "- Projet Service: http://localhost:8082" -ForegroundColor White
Write-Host "- API Gateway:  http://localhost:8080" -ForegroundColor White
Write-Host "- Gemini API:   http://localhost:3000" -ForegroundColor White
Write-Host "- Frontend:     http://localhost:4200" -ForegroundColor White
Write-Host "`n"
