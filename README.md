# Ubicador de Bultos

Webapp para ubicación y seguimiento de bultos en depósito mediante códigos de barras/QR.

## 🎯 Descripción

Sistema que permite almacenar y actualizar en tiempo real la posición de bultos dentro de un depósito, usando lectores de códigos (teclado o cámara). Los datos se guardan en MongoDB con retención de 45 días.

### Dispositivos objetivo:
- iPhone (navegador móvil en modo kiosk)
- Terminal Skorpio de Hasar (navegador equipado en PDA)

## 🔧 Stack Tecnológico

- **Frontend:** HTML + Bootstrap + FontAwesome + JavaScript puro
- **Backend:** Node.js + Express
- **Base de datos:** MongoDB Community Edition
- **Proxy:** Nginx
- **Gestor de procesos:** PM2
- **SO:** Ubuntu 20.04/22.04

## 📋 Prerrequisitos

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias del sistema
sudo apt install -y nodejs npm mongodb nginx git curl
```

## 🚀 Instalación

### 1. Clonar repositorio

```bash
sudo mkdir -p /var/www/html/via
cd /var/www/html/via
sudo git clone <repository_url> ubicador
sudo chown -R $USER:$USER /var/www/html/via/ubicador
cd ubicador
```

### 2. Instalar dependencias Node.js

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables (usar nano o editor preferido)
nano .env
```

Configurar las siguientes variables:
```env
API_KEY_WRITE=tu-clave-de-escritura-segura
API_KEY_READ=tu-clave-de-lectura-segura
MONGO_URI=mongodb://localhost:27017/ubicador
TZ=America/Argentina/Buenos_Aires
PORT=3000
```

### 4. Configurar MongoDB

```bash
# Iniciar MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verificar que esté funcionando
sudo systemctl status mongodb
```

### 5. Instalar PM2 globalmente

```bash
sudo npm install -g pm2
```

### 6. Configurar Nginx

```bash
# Copiar configuración
sudo cp nginx.conf /etc/nginx/sites-available/ubicador.conf

# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/ubicador.conf /etc/nginx/sites-enabled/

# Remover configuración por defecto
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl reload nginx
```

### 7. Iniciar aplicación con PM2

```bash
# Iniciar aplicación
pm2 start ecosystem.config.js

# Guardar configuración PM2
pm2 save

# Configurar PM2 para arranque automático
pm2 startup
# Ejecutar el comando que PM2 muestre
```

## 🔍 Verificación

### Verificar servicios

```bash
# Estado de MongoDB
sudo systemctl status mongodb

# Estado de Nginx
sudo systemctl status nginx

# Estado de la aplicación PM2
pm2 status

# Logs de la aplicación
pm2 logs ubicador-api
```

### Verificar endpoints

```bash
# Health check
curl http://localhost/api/health

# Test con API key (reemplazar con tu clave)
curl -X POST http://localhost/api/ubicaciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-clave-de-escritura" \
  -d '{
    "guia": "999012345678",
    "bulto": "001",
    "ubicacion": "A1",
    "fecha": "27/01/2025 14:30"
  }'
```

## 📱 Uso

### Flujo básico:

1. **Abrir aplicación:** Navegar a `http://tu-servidor/`
2. **Escanear ubicación:** Código que empiece con `UBI ` (ej: `UBI A1`)
3. **Escanear bulto:** Código de 26 dígitos
4. **Confirmación:** La app procesará automáticamente y guardará

### Formato de códigos:

- **Ubicación:** `UBI A1`, `UBI E3`, etc.
- **Bulto:** `04000009405999028318869001` (26 dígitos mínimo)
  - Se extraen automáticamente: guía (`999028318869`) y bulto (`001`)

## 🛠️ Mantenimiento

### Logs

```bash
# Logs de la aplicación
pm2 logs ubicador-api

# Logs de Nginx
sudo tail -f /var/log/nginx/ubicador_access.log
sudo tail -f /var/log/nginx/ubicador_error.log

# Logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### Actualizaciones

```bash
cd /var/www/html/via/ubicador

# Hacer backup de .env
cp .env .env.backup

# Pull últimos cambios
git pull origin main

# Instalar nuevas dependencias
npm install

# Reiniciar aplicación
pm2 restart ubicador-api
```

### Limpieza manual de datos

La aplicación limpia automáticamente datos de más de 45 días a las 2:00 AM diariamente. Para limpieza manual:

```bash
# Conectar a MongoDB
mongo ubicador

# Eliminar datos antiguos manualmente
db.guias.find().forEach(function(doc) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 45);
    
    doc.bultos = doc.bultos.filter(function(bulto) {
        return bulto.fecha_iso > cutoff;
    });
    
    if (doc.bultos.length === 0) {
        db.guias.remove({_id: doc._id});
    } else {
        db.guias.save(doc);
    }
});
```

## 🔐 Seguridad

- Las API keys deben ser únicas y seguras
- Cambiar las claves por defecto antes de producción
- Considerar implementar HTTPS con Let's Encrypt
- Configurar firewall para restringir acceso

```bash
# Configuración básica de firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📊 Monitoreo

### Métricas importantes:

- Uso de CPU y memoria
- Espacio en disco de MongoDB
- Logs de errores
- Tiempo de respuesta de API

### Comandos útiles:

```bash
# Estado de recursos
htop
df -h
free -h

# Monitoreo PM2
pm2 monit

# Estadísticas MongoDB
mongo ubicador --eval "db.stats()"
```

## 🚨 Resolución de problemas

### Problemas comunes:

1. **Aplicación no inicia:**
   ```bash
   pm2 logs ubicador-api
   ```

2. **Error de conexión MongoDB:**
   ```bash
   sudo systemctl status mongodb
   sudo systemctl restart mongodb
   ```

3. **Nginx error 502:**
   ```bash
   sudo nginx -t
   pm2 status
   ```

4. **Puerto ya en uso:**
   ```bash
   sudo netstat -tulpn | grep :3000
   ```

## 📞 Soporte

Para problemas técnicos, revisar:
1. Logs de la aplicación
2. Logs de Nginx
3. Estado de servicios
4. Conectividad de red

---

**Desarrollado para Punto FTE** 