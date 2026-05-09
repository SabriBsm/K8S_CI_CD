# ⚠️ URGENT - LIRE D'ABORD!

## 🎯 POURQUOI ÇA NE FONCTIONNE PAS

Le problème: **l'application avait des credentials en clair dans la configuration**.

Avant:
```properties
spring.mail.username=sabriboussami@gmail.com
spring.mail.password=${MAIL_PASSWORD:}
```

Après (sécurisé):
```properties
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}
```

---

## 🚀 SOLUTION IMMÉDIATE

### Windows (PowerShell)
```powershell
cd "C:\Users\SABRI\Etude_Esprit\4_ArcTic\PI_Cloud\dev\Projet-PlanSyncPro\PlanSync_MicroService\backend\user-service"
.\run-dev.bat
```

### Linux/Mac
```bash
cd ~/Etude_Esprit/4_ArcTic/PI_Cloud/dev/Projet-PlanSyncPro/PlanSync_MicroService/backend/user-service
./run-dev.sh
```

### Ou directement avec Maven
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

---

## ✅ VÉRIFICATION

L'application doit s'exécuter sur:
```
http://localhost:8079/swagger-ui.html
```

Vous devez voir la documentation Swagger.

---

### SI TOUJOURS PAS?

### Vérifier les logs
- Les credentials sont fournis via les variables d'environnement `MAIL_USERNAME` et `MAIL_PASSWORD`
- Le host SMTP est configuré via `MAIL_HOST`
- Les timeouts SMTP sont déjà configurés

### Si erreur de connexion email
```
- La configuration de base de données est-elle OK?
- La base de données MySQL est-elle en cours d'exécution?
- Vous avez utilisé le profil 'dev'?
```

---

## 📝 FICHIERS IMPORTANTS

- `application.properties` - Configuration générale (sécurisée)
- `.env.example` - Variables d’environnement à copier/adapter
- `run-dev.bat` - Script Windows
- `run-dev.sh` - Script Linux/Mac

---

**C'est corrigé maintenant! Essayez!** ✅

