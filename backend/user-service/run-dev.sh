#!/bin/bash
# Script pour lancer le user-service

echo ""
echo "============================================"
echo "  Lancement du User Service"
echo "============================================"
echo ""

# Vérifier que Maven est installé
if ! command -v mvn &> /dev/null; then
    echo "ERREUR: Maven n'est pas installé"
    echo ""
    echo "Solutions:"
    echo "1. Installer Maven: brew install maven"
    echo "2. Ou télécharger depuis: https://maven.apache.org/download.cgi"
    echo ""
    exit 1
fi

echo "Maven trouvé. Compilation et lancement..."
echo ""

# Compiler et lancer
mvn clean package -DskipTests
if [ $? -ne 0 ]; then
    echo ""
    echo "ERREUR: La compilation a échoué"
    exit 1
fi

echo ""
echo "Lancement de l'application avec application.properties (MySQL + email)..."
echo ""
mvn spring-boot:run

