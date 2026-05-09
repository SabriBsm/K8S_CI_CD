# 📸 GUIDE VISUEL - GÉNÉRER APP PASSWORD GMAIL

## 🎯 OBJECTIF
Générer un mot de passe d'application Gmail pour que l'application puisse envoyer des emails.

---

## 📋 PRÉREQUIS

- ✅ Compte Gmail (sabriboussami@gmail.com)
- ✅ 2-Step Verification ACTIVÉE
- ✅ Accès à votre téléphone (pour confirmer)

---

## 🔐 ÉTAPE 1: Vérifier la 2-Step Verification

### 1.1 Aller à Google Account
```
https://myaccount.google.com
```

### 1.2 Cliquer sur "Sécurité"
```
Menu de gauche → Sécurité
```

### 1.3 Chercher "Vérification en 2 étapes"
```
Si vous voyez: "Vérification en 2 étapes activée"
→ C'est bon! Aller à l'étape 2

Si vous voyez: "Ajouter une étape de sécurité"
→ Cliquer et suivre les instructions
```

---

## 📲 ÉTAPE 2: Générer App Password

### 2.1 Aller à "Mots de passe pour applications"
```
https://myaccount.google.com/apppasswords
```

### 2.2 Si vous voyez "Désolé, cette page n'existe pas"

**Cela signifie:** 2-Step Verification n'est PAS activée!

**Solution:**
1. Revenir à l'étape 1
2. Activer 2-Step Verification
3. Revenir à https://myaccount.google.com/apppasswords

### 2.3 Sélectionner l'application et l'appareil

**App:** 
- Cliquer sur la liste déroulante
- Chercher "Mail"
- Sélectionner "Mail"

**Device:**
- Cliquer sur la liste déroulante
- Chercher "Windows Computer"
- Sélectionner "Windows Computer"

### 2.4 Cliquer "Générer"

Google vous montre un mot de passe de 16 caractères:
```
xxxx xxxx xxxx xxxx
```

**IMPORTANT:** Avec 3 ESPACES entre les groupes de 4 caractères!

---

## 📋 ÉTAPE 3: Copier le mot de passe

### 3.1 Voir le mot de passe
```
Exemple:
abcd efgh ijkl mnop
```

### 3.2 Cliquer "Copier"

Le mot de passe est copié en mémoire.

---

## 🔧 ÉTAPE 4: Mettre à jour l'application

### 4.1 Ouvrir le fichier de configuration
```
Chemin: src/main/resources/application-dev.properties
```

### 4.2 Trouver les lignes 36-37
```properties
spring.mail.username=sabriboussami@gmail.com
spring.mail.password=${MAIL_PASSWORD:}
```

### 4.3 Remplacer le mot de passe
```properties
spring.mail.username=sabriboussami@gmail.com
spring.mail.password=abcd efgh ijkl mnop
```

Remplacer `abcd efgh ijkl mnop` par le mot de passe généré.

### 4.4 Sauvegarder le fichier
```
Ctrl+S
```

---

## 🚀 ÉTAPE 5: Lancer l'application

### Windows - Option 1 (Recommandé)
```bash
.\run-dev.bat
```

### Windows - Option 2
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

### Attendre les logs
```
The following profiles are active: dev
Started UserServiceApplication in X.XXX seconds
```

---

## ✅ ÉTAPE 6: Tester

### 6.1 Créer un utilisateur

**URL:** `http://localhost:8079/api/auth/register`

**Méthode:** POST

**Body:**
```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test123@example.com",
  "password": "TestPass123!",
  "role": "PROJECT_MEMBER"
}
```

**Réponse attendue:** Status 201

### 6.2 Demander la réinitialisation

**URL:** `http://localhost:8079/api/auth/forgot-password`

**Méthode:** POST

**Body:**
```json
{
  "email": "test123@example.com"
}
```

**Réponse attendue:** Status 204

### 6.3 Vérifier les logs

Chercher dans la console:
```
INFO  - Envoi de l'email de réinitialisation de mot de passe à: test123@example.com
INFO  - Email de réinitialisation de mot de passe envoyé avec succès à: test123@example.com
```

### 6.4 Vérifier Gmail

1. Aller à: https://mail.google.com
2. Vérifier la Boîte de réception
3. **TRÈS IMPORTANT:** Vérifier le dossier SPAM!
4. Chercher un email avec le sujet: "PlanSyncPro - Réinitialisation de votre mot de passe"

---

## 🎓 POINTS IMPORTANTS

1. **2-Step Verification obligatoire** pour générer App Password
2. **Mot de passe avec espaces** - C'est normal!
3. **Profil 'dev' obligatoire** pour utiliser les credentials
4. **Email peut prendre 1-2 minutes** - C'est normal!
5. **Vérifier SPAM** - Gmail le met parfois là

---

## ✅ CHECKLIST

- [ ] J'ai activé 2-Step Verification
- [ ] J'ai généré un App Password
- [ ] J'ai copié le mot de passe (16 chars avec espaces)
- [ ] J'ai mis à jour application-dev.properties
- [ ] J'ai lancé l'app avec profil 'dev'
- [ ] J'ai testé l'envoi d'email
- [ ] J'ai reçu l'email dans Gmail

---

**Si vous suivez ces étapes, les emails devraient fonctionner! ✅**

Pour dépannage: Voir `EMAIL_TROUBLESHOOTING.md`

