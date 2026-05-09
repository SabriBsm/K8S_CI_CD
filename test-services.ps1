#!/usr/bin/env pwsh

# Script de test d'intégration du service de risque

$services = @(
    @{ Name = "Eureka"; Port = 8761; Url = "http://localhost:8761" },
    @{ Name = "User Service"; Port = 8079; Url = "http://localhost:8079/swagger-ui.html" },
    @{ Name = "Risk Service"; Port = 8089; Url = "http://localhost:8089/swagger-ui.html" },
    @{ Name = "Projet Service"; Port = 8082; Url = "http://localhost:8082/swagger-ui.html" },
    @{ Name = "API Gateway"; Port = 8080; Url = "http://localhost:8080" },
    @{ Name = "Frontend"; Port = 4200; Url = "http://localhost:4200" }
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PlanSync Services Integration Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

foreach ($service in $services) {
    Write-Host "Checking $($service.Name) on port $($service.Port)..." -ForegroundColor Yellow

    try {
        $result = Test-NetConnection -ComputerName "localhost" -Port $service.Port -WarningAction SilentlyContinue
        if ($result.TcpTestSucceeded) {
            Write-Host "  ✓ $($service.Name) is running" -ForegroundColor Green
            Write-Host "    URL: $($service.Url)" -ForegroundColor Gray
        } else {
            Write-Host "  ✗ $($service.Name) is NOT running" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Error checking $($service.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Environment Configuration:" -ForegroundColor Yellow
Write-Host "- User Service (Auth):      http://localhost:8079/api" -ForegroundColor White
Write-Host "- Risk Service (Risks):     http://localhost:8089/api" -ForegroundColor White
Write-Host "- Project Service (Projects): http://localhost:8082/api" -ForegroundColor White
Write-Host "- Frontend (UI):            http://localhost:4200" -ForegroundColor White
Write-Host "- Eureka (Discovery):       http://localhost:8761" -ForegroundColor White

