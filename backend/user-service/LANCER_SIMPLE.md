# 🚀 LANCER L'APPLICATION - VERSION SIMPLE

## ✅ CONFIGURATION COMPLÈTE

L'application est maintenant **complètement configurée** avec :
- ✅ Credentials Gmail corrects
- ✅ Timeouts SMTP configurés
- ✅ Base de données MySQL configurée
- ✅ Swagger UI activé

Vous pouvez lancer l'application directement avec `application.properties`.

---

## 🚀 LANCER L'APPLICATION

### Option 1: Script Windows (Recommandé)
```bash
.\run-dev.bat
```

### Option 2: Maven directement
```bash
mvn spring-boot:run
```

### Option 3: IDE JetBrains
1. Clic droit sur `UserServiceApplication.java`
2. Cliquer "Run"

### Option 4: Créer un JAR
```bash
mvn clean package
java -jar target/user-service-1.0.0.jar
```

---

## ✅ VÉRIFICATION

L'application doit démarrer sur:
```
http://localhost:8079
Swagger UI: http://localhost:8079/swagger-ui.html
```

Dans les logs, vous devez voir:
```
Started UserServiceApplication in X.XXX seconds
```

---

## 🧪 TESTER LE FORGOT PASSWORD

### 1. Créer un utilisateur
```bash
POST http://localhost:8079/api/auth/register
{
  "firstName": "Test",
  "lastName": "User",
  "email": "testuser@gmail.com",
  "password": "TestPass123!",
  "role": "PROJECT_MEMBER"
}
```

### 2. Demander réinitialisation
```bash
POST http://localhost:8079/api/auth/forgot-password
{
  "email": "testuser@gmail.com"
}
```

### 3. Vérifier les logs
```
INFO - Envoi de l'email de réinitialisation de mot de passe à: testuser@gmail.com
INFO - Email de réinitialisation de mot de passe envoyé avec succès à: testuser@gmail.com
```

### 4. Vérifier Gmail
```
https://mail.google.com → Chercher l'email reçu
```

---

## 📝 FICHIERS DE CONFIGURATION

### application.properties
✅ **À CONSERVER** - Configuration complète avec credentials

### application-dev.properties
❌ **À SUPPRIMER** - Plus nécessaire

---

## 🎯 C'EST TOUT!

L'application est prête à l'emploi! 🎉

- ✅ Lancez-la
- ✅ Testez le forgot password
- ✅ Recevez les emails
- ✅ C'est fini!

---

**Succès! ✅**

