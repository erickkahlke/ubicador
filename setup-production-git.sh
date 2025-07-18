#!/bin/bash
# Script para configurar Git en producción para GitHub Actions

echo "🔧 Configurando Git en producción..."

# Ir al directorio de la aplicación
cd /var/www/html/via/ubicador

# Inicializar Git si no existe
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git inicializado"
fi

# Configurar remote origin (se actualizará con el repo real)
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/erickkahlke/ubicador.git

# Configurar Git para production
git config user.name "GitHub Actions"
git config user.email "actions@github.com"
git config pull.rebase false

# Hacer fetch inicial
git fetch origin main || echo "⚠️  Repo aún no existe en GitHub"

echo "✅ Git configurado para producción"
echo "📝 Siguiente paso: crear repositorio en GitHub y actualizar la URL"
