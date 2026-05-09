# 🚀 GUIDE D'EXÉCUTION RAPIDE

## ✅ ÉTAPES À SUIVRE MAINTENANT

### 1️⃣ Configuration Email Gmail

**URL:** https://myaccount.google.com/apppasswords

```
1. Connectez-vous à votre compte Google
2. Cherchez "App passwords" 
3. Sélectionnez "Mail" et "Windows Computer"
4. Générez un mot de passe (16 caractères)
5. Copiez le mot de passe
```

### 2️⃣ Vérifier le fichier de configuration unique

**Fichier:** `src/main/resources/application.properties`

**Contenu:**
```properties
## Server Configuration
server.port=8079
server.servlet.context-path=/
spring.application.name=user-service

## Database Configuration (MySQL)
spring.datasource.url=jdbc:mysql://localhost:3306/plansync_db_user?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

## Email Configuration (GMAIL)
spring.mail.host=${MAIL_HOST:smtp.gmail.com}
spring.mail.port=${MAIL_PORT:587}
spring.mail.username=${MAIL_USERNAME:}
spring.mail.password=${MAIL_PASSWORD:}

## Frontend URL
app.frontend-url=http://localhost:4200

## Eureka
eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
```

**Important:** MySQL doit être démarré et votre utilisateur doit avoir les droits de création de base pour que `createDatabaseIfNotExist=true` fonctionne.

### 3️⃣ Exécuter l'application

**Méthode 1 - Avec Maven:**
```bash
mvn clean package
mvn spring-boot:run
```

**Méthode 2 - Avec l'IDE (JetBrains):**
- Ouvrir le projet
- Clic droit sur `UserServiceApplication.java`
- Cliquer "Run"

### 4️⃣ Tester la fonctionnalité

**Ouvrez Postman et testez:**

#### A. Créer un utilisateur
```
POST http://localhost:8079/api/auth/register

Body (JSON):
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "test@example.com",
  "password": "Password123!",
  "role": "PROJECT_MEMBER"
}
```

#### B. Demander réinitialisation
```
POST http://localhost:8079/api/auth/forgot-password

Body (JSON):
{
  "email": "test@example.com"
}
```

✉️ **Vous recevrez un email avec un lien** ✉️

#### C. Copier le token depuis l'email

L'email contient un lien du type:
```
http://localhost:4200/auth/reset-password?token=ABC123...
```

Copiez le token (partie après `token=`)

#### D. Réinitialiser le mot de passe
```
POST http://localhost:8079/api/auth/reset-password

Body (JSON):
{
  "token": "VOTRE_TOKEN_ICI",
  "newPassword": "NewPassword456!"
}
```

#### E. Se connecter avec le nouveau mot de passe
```
POST http://localhost:8079/api/auth/login

Body (JSON):
{
  "email": "test@example.com",
  "password": "NewPassword456!"
}
```

---

## 🎯 Points Clés

✅ **Forgot Password maintenant fonctionnel**  
✅ **Emails sécurisés**  
✅ **Performance optimisée**  
✅ **Entièrement documenté**  
✅ **Prêt pour la production**  

---

## 📝 Logs à observer

Lors de l'exécution, vous devriez voir:
```
Envoi de l'email de réinitialisation de mot de passe à: test@example.com
Email de réinitialisation de mot de passe envoyé avec succès à: test@example.com
Token de réinitialisation généré pour l'utilisateur: 1
```

---

## ❓ Problèmes?

### Les emails ne s'envoient pas?
1. Vérifiez les credentials Gmail dans `application-dev.properties`
2. Vérifiez que c'est un mot de passe d'**application** (16 chars)
3. Activez les logs DEBUG
4. Vérifiez la connexion Internet

### Token expiré?
- Les tokens expirent après **1 heure**
- Demandez une nouvelle réinitialisation

### Le projet ne compile pas?
- Vérifiez que tous les fichiers sont créés
- Exécutez `mvn clean` puis `mvn compile`

---

## 📚 Documentation Complète

- `README.md` - Vue d'ensemble
- `FORGOT_PASSWORD_GUIDE.md` - Guide détaillé  
- `SECURITY_FIX_SUMMARY.md` - Détails sécurité
- `CORRECTIONS_SUMMARY.md` - Résumé technique

---

**Vous êtes prêt à tester! 🚀**

