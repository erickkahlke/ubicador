#!/bin/bash

# Script de instalación automática para Ubicador de Bultos
# Ubuntu 20.04/22.04

set -e

echo "🚀 Iniciando instalación de Ubicador de Bultos..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que se ejecute como root o con sudo
if [[ $EUID -eq 0 ]]; then
   print_error "Este script no debe ejecutarse como root"
   exit 1
fi

# Verificar Ubuntu
if ! grep -qi ubuntu /etc/os-release; then
    print_error "Este script está diseñado para Ubuntu"
    exit 1
fi

# 1. Actualizar sistema
print_status "Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias del sistema
print_status "Instalando dependencias del sistema..."
sudo apt install -y nodejs npm mongodb nginx git curl build-essential

# 3. Verificar versiones
print_status "Verificando versiones instaladas..."
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "MongoDB: $(mongod --version | head -n1)"
echo "Nginx: $(nginx -v 2>&1)"

# 4. Crear directorio de proyecto
print_status "Creando directorio de proyecto..."
sudo mkdir -p /var/www/html/via
cd /var/www/html/via

# Si ya existe, hacer backup
if [ -d "ubicador" ]; then
    print_warning "Directorio ubicador ya existe, creando backup..."
    sudo mv ubicador "ubicador_backup_$(date +%Y%m%d_%H%M%S)"
fi

# 5. Copiar archivos del proyecto
print_status "Copiando archivos del proyecto..."
sudo cp -r "$(pwd)" ubicador 2>/dev/null || {
    print_error "Error copiando archivos. Asegúrate de ejecutar desde el directorio del proyecto."
    exit 1
}

cd ubicador
sudo chown -R $USER:$USER /var/www/html/via/ubicador

# 6. Instalar dependencias Node.js
print_status "Instalando dependencias Node.js..."
npm install

# 7. Configurar variables de entorno
print_status "Configurando variables de entorno..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Archivo .env creado desde .env.example"
        print_warning "IMPORTANTE: Edita .env con tus configuraciones antes de continuar"
    else
        cat > .env << EOF
API_KEY_WRITE=ubi-write-$(openssl rand -hex 16)
API_KEY_READ=ubi-read-$(openssl rand -hex 16)
MONGO_URI=mongodb://localhost:27017/ubicador
TZ=America/Argentina/Buenos_Aires
PORT=3000
EOF
        print_status "Archivo .env creado con valores por defecto"
    fi
fi

# 8. Configurar MongoDB
print_status "Configurando MongoDB..."
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Esperar a que MongoDB esté listo
sleep 5

# Verificar conexión MongoDB
if mongo --eval "db.adminCommand('ismaster')" >/dev/null 2>&1; then
    print_status "MongoDB configurado correctamente"
else
    print_error "Error conectando a MongoDB"
    exit 1
fi

# 9. Instalar PM2
print_status "Instalando PM2..."
sudo npm install -g pm2

# 10. Configurar Nginx
print_status "Configurando Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/ubicador.conf

# Crear enlace simbólico
sudo ln -sf /etc/nginx/sites-available/ubicador.conf /etc/nginx/sites-enabled/

# Remover configuración por defecto si existe
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
if sudo nginx -t; then
    print_status "Configuración de Nginx correcta"
    sudo systemctl reload nginx
else
    print_error "Error en configuración de Nginx"
    exit 1
fi

# 11. Crear directorio de logs
mkdir -p logs

# 12. Iniciar aplicación con PM2
print_status "Iniciando aplicación con PM2..."
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save

# 13. Configurar PM2 para arranque automático
print_status "Configurando PM2 para arranque automático..."
pm2 startup | grep -E '^sudo env' | sh

# 14. Verificar servicios
print_status "Verificando servicios..."

# MongoDB
if sudo systemctl is-active --quiet mongodb; then
    print_status "✓ MongoDB: Activo"
else
    print_error "✗ MongoDB: Inactivo"
fi

# Nginx
if sudo systemctl is-active --quiet nginx; then
    print_status "✓ Nginx: Activo"
else
    print_error "✗ Nginx: Inactivo"
fi

# PM2
if pm2 status | grep -q "ubicador-api"; then
    print_status "✓ Aplicación PM2: Activa"
else
    print_error "✗ Aplicación PM2: Inactiva"
fi

# 15. Test de endpoints
print_status "Probando endpoints..."

# Health check
if curl -s http://localhost/api/health | grep -q "ok"; then
    print_status "✓ Health check: OK"
else
    print_warning "⚠ Health check: No responde"
fi

# 16. Mostrar información final
echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "📋 Información del sistema:"
echo "  • Aplicación: http://localhost/"
echo "  • API Health: http://localhost/api/health"
echo "  • Directorio: /var/www/html/via/ubicador"
echo "  • Logs PM2: pm2 logs ubicador-api"
echo ""
echo "🔧 Comandos útiles:"
echo "  • Ver logs: pm2 logs ubicador-api"
echo "  • Reiniciar: pm2 restart ubicador-api"
echo "  • Estado: pm2 status"
echo "  • Logs Nginx: sudo tail -f /var/log/nginx/ubicador_error.log"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  • Revisa y ajusta las API keys en: /var/www/html/via/ubicador/.env"
echo "  • Considera configurar HTTPS para producción"
echo "  • Configura firewall apropiadamente"
echo ""

# Mostrar API keys generadas
print_status "API Keys generadas:"
grep "API_KEY" .env

echo ""
print_status "Instalación finalizada exitosamente 🚀" 