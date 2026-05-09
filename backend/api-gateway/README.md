# API Gateway

Passerelle API Spring Cloud Gateway pour le projet PlanSync.

## Prérequis
- Java 17
- Maven 3.9+

## Lancer le serveur

```powershell
cd C:\Users\SABRI\Etude_Esprit\4_ArcTic\PI_Cloud\dev\Projet-PlanSyncPro\PlanSync_MicroService\backend\api-gateway
mvn spring-boot:run
```

## URL
- API Gateway : http://localhost:8080
- Health Check : http://localhost:8080/actuator/health

## Configuration
- Port : 8080
- Service Name : api-gateway
- Routes : Les routes sont configurées dans application.properties

