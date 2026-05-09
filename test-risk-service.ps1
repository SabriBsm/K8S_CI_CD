#!/usr/bin/env pwsh
# Test Risk Service Integration

Write-Host "`n=== Risk Service Integration Test ===" -ForegroundColor Cyan

Write-Host "`nChecking Risk Service port 8089..." -ForegroundColor Yellow
$test = Test-NetConnection -ComputerName "localhost" -Port 8089 -WarningAction SilentlyContinue
if ($test.TcpTestSucceeded) {
    Write-Host "✓ Risk Service is running on port 8089" -ForegroundColor Green
} else {
    Write-Host "✗ Risk Service is NOT running (this is normal if you haven't started it yet)" -ForegroundColor Yellow
}

Write-Host "`nAPI Endpoints:" -ForegroundColor Yellow
Write-Host "  • Risks API:          http://localhost:8089/api/risks" -ForegroundColor White
Write-Host "  • Mitigation Plans:   http://localhost:8089/api/mitigation-plans" -ForegroundColor White
Write-Host "  • Statistics:         http://localhost:8089/api/statistics/dashboard" -ForegroundColor White

Write-Host "`nTest Risk API with this command:" -ForegroundColor Yellow
Write-Host "  Invoke-RestMethod -Uri 'http://localhost:8089/api/risks' -Headers @{'X-User-Id'='1'}" -ForegroundColor Cyan

Write-Host "`n"

