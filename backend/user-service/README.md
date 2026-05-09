# User Service - PlanSyncPro

Microservice de gestion des utilisateurs pour la plateforme PlanSyncPro.

## 🚀 Prérequis

- **Java 17+** (JDK)
- **Maven 3.8+**
- **MySQL 8.0+**
- **Git**

## 📦 Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd user-service
```

### 2. Installer Maven (si nécessaire)

#### Avec Chocolatey (Windows)
```powershell
choco install maven -y
```

#### Manuellement
1. Télécharger: https://maven.apache.org/download.cgi
2. Extraire dans `C:\maven` (ou ailleurs)
3. Ajouter `C:\maven\bin` au PATH Windows
4. Redémarrer le terminal

#### Vérifier l'installation
```bash
mvn --version
```

### 3. Base de données

- **Configuration par défaut** : le service utilise MySQL via `application.properties` et la base `plansync_db_user`.
- **Création automatique** : le paramètre `createDatabaseIfNotExist=true` permet de créer la base au premier démarrage si MySQL est accessible et si l’utilisateur a les droits suffisants.

### 4. Configuration des variables d'environnement

Le service lit sa configuration via les variables suivantes :

- `SERVER_PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`
- `APP_FRONTEND_URL`
- `EUREKA_HOST`, `EUREKA_PORT`
- `JWT_SECRET`

Pour Gmail, générez un mot de passe d’application depuis https://myaccount.google.com/apppasswords puis renseignez `MAIL_USERNAME` et `MAIL_PASSWORD` dans votre environnement.

### 5. Configuration Avatar locale

Les photos de profil sont stockées dans `uploads/avatars` et exposées via `/avatars/**`.
Le dossier est créé automatiquement si nécessaire.

## 🏃 Lancer l'application

### Option 1 : Avec Maven
```bash
# Compiler
mvn clean compile

# Exécuter avec la configuration unique (MySQL + email)
mvn spring-boot:run

# Ou via le wrapper Maven
./mvnw spring-boot:run
```

### Option 2 : Avec l'IDE JetBrains
1. Ouvrir le projet dans IntelliJ IDEA
2. Clic droit sur `UserServiceApplication.java`
3. Cliquer sur "Run"

### Option 3 : Créer un JAR
```bash
mvn clean package
java -jar target/user-service-1.0.0.jar
```

## 📝 Endpoints API

### Authentication
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/forgot-password` - Demander réinitialisation
- `POST /api/auth/reset-password` - Réinitialiser mot de passe

### User Management
- `POST /api/users` - Créer un utilisateur
- `GET /api/users` - Lister tous les utilisateurs
- `GET /api/users/{id}` - Récupérer un utilisateur
- `PUT /api/users/{id}` - Mettre à jour un utilisateur
- `DELETE /api/users/{id}` - Supprimer un utilisateur
- `POST /api/users/{id}/change-password` - Changer le mot de passe
- `GET /api/users/username/{username}` - Chercher par username
- `GET /api/users/email/{email}` - Chercher par email
- `GET /api/users/role/{role}` - Chercher par rôle

## 📚 Swagger/OpenAPI

Accédez à la documentation Swagger :
```
http://localhost:8079/swagger-ui.html
```

## 🔧 Configuration

### application.properties (Configuration locale par défaut)
```properties
server.port=${SERVER_PORT:8079}
spring.datasource.url=jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:plansync_db_user}?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

### Variables d'environnement
```bash
export SERVER_PORT=8079
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=plansync_db_user
export DB_USERNAME=root
export DB_PASSWORD=votre-mot-de-passe-mysql
export JWT_SECRET=votre-secret-jwt-base64
export MAIL_HOST=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=votre-email@gmail.com
export MAIL_PASSWORD=votre-app-password
export APP_FRONTEND_URL=http://localhost:4200
export EUREKA_HOST=localhost
export EUREKA_PORT=8761
```

## 🐛 Troubleshooting

### "Maven command not found"
- Vérifiez l'installation de Maven
- Vérifiez que le PATH est configuré correctement
- Redémarrez le terminal

### "Connection refused" (Database)
- Vérifiez que MySQL est en cours d'exécution
- Vérifiez les credentials dans `application.properties` ou via variables d'environnement
- Le service crée les tables automatiquement à l'initialisation, mais la base MySQL doit être accessible au premier démarrage

### Emails ne s'envoient pas
- Vérifiez les credentials Gmail via variables d'environnement
- Assurez-vous d'utiliser un mot de passe d'application (16 caractères)
- Vérifiez la connexion Internet
- Consultez les logs : `logging.level.org.springframework.mail=DEBUG`

## 🔒 Sécurité

⚠️ **NE JAMAIS** commiter les credentials en clair !

1. Utilisez des variables d'environnement pour `DB_USERNAME`, `DB_PASSWORD`, `MAIL_USERNAME`, `MAIL_PASSWORD` et `JWT_SECRET`
2. Utilisez un gestionnaire de secrets (ex: HashiCorp Vault)
3. Gardez `application.properties` sans secrets sensibles en dur

## 📄 Structure du projet

```
user-service/
├── src/main/java/com/microservices/userservice/
│   ├── config/           # Configuration Spring
│   ├── controller/       # Endpoints REST
│   ├── dto/             # Data Transfer Objects
│   ├── entity/          # Entités JPA
│   ├── exception/       # Exceptions personnalisées
│   ├── mapper/          # MapStruct mappers
│   ├── repository/      # Repositories JPA
│   └── service/         # Services métier
├── src/main/resources/
│   └── application.properties
└── pom.xml
```

## 📖 Documentation

- [Spring Boot](https://spring.io/projects/spring-boot)
- [Spring Data JPA](https://spring.io/projects/spring-data-jpa)
- [SpringDoc OpenAPI](https://springdoc.org/)
- [MapStruct](https://mapstruct.org/)

## 👥 Contribution

Pour contribuer au projet, veuillez :

1. Créer une branche : `git checkout -b feature/ma-feature`
2. Commiter vos changements : `git commit -am 'Ajouter ma feature'`
3. Pousser la branche : `git push origin feature/ma-feature`
4. Créer une Pull Request

## 📄 License

MIT License - voir le fichier LICENSE pour plus de détails.

