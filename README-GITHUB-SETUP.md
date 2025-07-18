# 🚀 GitHub Actions Deploy Setup

## 📋 Pasos para configurar deploy automático

### 1️⃣ Crear repositorio en GitHub
```
- Ve a https://github.com/new
- Nombre: ubicador-bultos
- Descripción: PWA para ubicación de bultos con escáner QR
- Público/Privado según tu preferencia
- NO inicializar con README (ya tienes uno)
```

### 2️⃣ Configurar secretos en GitHub
Ve a tu repo → Settings → Secrets and variables → Actions → New repository secret

Agregar estos secretos:
```
HOST = 149.50.139.142
USERNAME = root
SSH_KEY = [tu private key SSH]
```

### 3️⃣ Configurar SSH Key para GitHub Actions
```bash
# En tu máquina local, generar nueva SSH key para Actions
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_key -N ""

# Copiar public key a la VM
ssh-copy-id -i ~/.ssh/github_actions_key.pub root@mi-vm

# Copiar private key para GitHub Secrets
cat ~/.ssh/github_actions_key
```

### 4️⃣ Configurar Git en producción
```bash
# Ejecutar en la VM
./setup-production-git.sh

# Actualizar URL del repositorio
cd /var/www/html/via/ubicador
git remote set-url origin https://github.com/TU-USUARIO/ubicador-bultos.git
```

### 5️⃣ Push inicial a GitHub
```bash
# En tu máquina local
git remote add origin https://github.com/TU-USUARIO/ubicador-bultos.git
git branch -M main
git push -u origin main
```

### 6️⃣ Verificar que funciona
- Haz un pequeño cambio en cualquier archivo
- Commit y push a main
- Ve a GitHub Actions tab para ver el deploy
- Verifica que se actualice en http://149.50.139.142/via/ubicador/

## 🔄 Workflow del deploy automático

1. **Push a main** → Trigger GitHub Action
2. **Checkout código** → Descarga última versión
3. **Install dependencies** → npm ci
4. **Deploy via SSH** → Conecta a VM
5. **Stop PM2** → pm2 stop ubicador
6. **Update código** → git pull + fix routes
7. **Start PM2** → pm2 start ubicador
8. **Verify** → curl health check

## 📱 URLs importantes
- **Producción**: http://149.50.139.142/via/ubicador/
- **API Health**: http://149.50.139.142/via/ubicador/api/health
- **GitHub Actions**: https://github.com/TU-USUARIO/ubicador-bultos/actions

## 🚨 Troubleshooting
- **Action falla**: Revisar logs en GitHub Actions tab
- **SSH no funciona**: Verificar SSH_KEY secret
- **App no arranca**: ssh a VM y revisar pm2 logs ubicador
