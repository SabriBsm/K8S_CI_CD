# 📧 GUIDE COMPLET - GMAIL APP PASSWORD

## ⚠️ PROBLÈME: Aucun email reçu

**Cause probable:** Les credentials Gmail ne sont pas correct ou l'app password n'a pas été généré correctement.

---

## 🔐 ÉTAPES POUR GÉNÉRER UN GMAIL APP PASSWORD (IMPORTANT!)

### Étape 1: Aller à Google Account
1. Ouvrir: https://myaccount.google.com
2. Se connecter avec votre compte Google (sabriboussami@gmail.com)

### Étape 2: Activer la vérification en 2 étapes (OBLIGATOIRE!)
1. Cliquer sur "Sécurité" dans le menu de gauche
2. Chercher "Vérification en 2 étapes"
3. **Si c'est déjà activé, passer à l'étape 3**
4. **Si ce n'est pas activé:**
   - Cliquer "Vérification en 2 étapes"
   - Suivre les instructions
   - Valider avec votre téléphone

### Étape 3: Générer App Password
1. Aller à: https://myaccount.google.com/apppasswords
   - OU: Sécurité → Mots de passe pour applications
2. Sélectionner:
   - **App:** Mail
   - **Device:** Windows Computer (ou Linux/Mac si applicable)
3. Cliquer "Générer"
4. **IMPORTANT:** Google vous donne un mot de passe de 16 caractères

### Étape 4: Copier le mot de passe
```
xxxx xxxx xxxx xxxx  ← Format avec espaces (c'est normal!)
```

---

## 🔧 CONFIGURER L'APPLICATION

### 1. Éditer `application-dev.properties`

**Chemin:** 
```
src/main/resources/application-dev.properties
```

**Modifier ces lignes (36-37):**
```properties
spring.mail.username=sabriboussami@gmail.com
spring.mail.password=xxxx xxxx xxxx xxxx
```

Remplacer `xxxx xxxx xxxx xxxx` par le mot de passe généré (avec les espaces)

**Exemple:**
```properties
spring.mail.username=sabriboussami@gmail.com
spring.mail.password=abcd efgh ijkl mnop
```

### 2. Vérifier les autres paramètres
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.ssl.trust=smtp.gmail.com
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
spring.mail.properties.mail.smtp.writetimeout=5000
```

---

## 🚀 LANCER L'APPLICATION AVEC LE BON PROFIL

### **TRÈS IMPORTANT:** Utiliser le profil `dev`!

#### Windows:
```bash
.\run-dev.bat
```

#### Ou directement:
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

#### Ou avec l'IDE:
1. Clic droit sur `UserServiceApplication.java`
2. "Run"
3. Modifier la configuration:
   - Onglet "Configuration"
   - "VM options": `-Dspring.profiles.active=dev`
   - Cliquer OK

---

## ✅ VÉRIFICATION DES LOGS

Quand vous lancez l'app, cherchez ces logs:

```
DEBUG com.microservices.userservice.service.impl.EmailServiceImpl
Envoi de l'email de réinitialisation de mot de passe à: votre-email@gmail.com
Email de réinitialisation de mot de passe envoyé avec succès à: votre-email@gmail.com
```

### Si vous voyez une erreur:
```
ERROR - Erreur lors de l'envoi de l'email de réinitialisation à: votre-email@gmail.com
```

C'est un problème de credentials.

---

## 🧪 TEST SIMPLE

### Tester si l'email fonctionne:

1. **Créer un utilisateur:**
```
POST http://localhost:8079/api/auth/register
Body:
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@gmail.com",
  "password": "TestPass123!",
  "role": "PROJECT_MEMBER"
}
```

2. **Demander réinitialisation:**
```
POST http://localhost:8079/api/auth/forgot-password
Body:
{
  "email": "test@gmail.com"
}
```

3. **Vérifier les logs:**
   - Cherchez: "Envoi de l'email"
   - Cherchez: "Email envoyé avec succès"

4. **Vérifier Gmail:**
   - Ouvrir: https://mail.google.com
   - Chercher l'email reçu
   - **Attention:** Regarder le dossier SPAM!

---

## ⚠️ PROBLÈMES COURANTS

### Problème: "Authentication failed"
**Solution:** Le mot de passe est incorrect ou l'app password n'a pas été généré correctement

- Aller à https://myaccount.google.com/apppasswords
- Regénérer un nouveau mot de passe
- Copier exactement avec les espaces

### Problème: "Cannot get a connection, pool error"
**Solution:** Vérifier les timeouts

```properties
spring.mail.properties.mail.smtp.connectiontimeout=5000
spring.mail.properties.mail.smtp.timeout=5000
```

### Problème: "2-Step Verification is enabled"
**Solution:** Vous DEVEZ utiliser un App Password, pas votre mot de passe Google normal

### Problème: Email reçu 10 minutes après
**C'est normal!** Gmail peut prendre du temps à envoyer les emails.

---

## 🔒 SÉCURITÉ

⚠️ **NE JAMAIS:**
- Mettre votre mot de passe Google en clair
- Versionner `application-dev.properties` avec credentials

✅ **À FAIRE:**
- Utiliser un App Password (16 chars)
- Ajouter `application-dev.properties` à `.gitignore`
- Utiliser les variables d'environnement en production

---

## 📧 CHECKLIST FINALE

- [ ] J'ai généré un App Password depuis https://myaccount.google.com/apppasswords
- [ ] J'ai copié le mot de passe (avec les 3 espaces)
- [ ] J'ai mis à jour `application-dev.properties`
- [ ] J'ai lancé l'app avec le profil `dev`
- [ ] Je vois les logs "Email envoyé avec succès"
- [ ] J'ai reçu l'email dans Gmail (vérifier SPAM aussi!)

---

**Une fois ces étapes complétées, ça devrait fonctionner! ✅**

