Documento Maestro: App “Ubicador de Bultos”

Propósito: Dejar un brief completo y detallado para un Project Manager y el equipo de desarrollo sobre la webapp de ubicación de bultos en depósito.

⸻

1. Visión General

Una webapp que permita almacenar y actualizar en tiempo real la posición de bultos dentro de un depósito, usando lectores de códigos (teclado o cámara). Los datos se guardan en una base de datos MongoDB con retención de 45 días y se accede mediante una API REST.

Dispositivos objetivo:
	•	iPhone (navegador móvil en modo kiosk)
	•	Terminal Skorpio de Hasar (navegador equipado en PDA)

Ruta de despliegue en VM: /var/www/html/via/ubicador
SO VM: Ubuntu (20.04/22.04)

⸻

2. Flujo de Usuario
	1.	Usuario abre la webapp en modo kiosk (sin scroll).
	2.	Aparece mensaje: “Por favor escanear una ubicación para comenzar”.
	3.	Escanea con lector (teclado+Enter) o toca ícono de cámara para usar la cámara.
	4.	Si el texto escaneado empieza con UBI , la app extrae la ubicación (p. ej. A1), la muestra en la parte superior y cambia mensaje a “Escanea un bulto para ubicarlo”.
	5.	Al escanear un código de bulto (p. ej. 04000009405999028318869001):
	•	Descartar los primeros 7 dígitos y los siguientes 4.
	•	Extraer:
	•	Guía: dígitos intermedios → 999028318869
	•	Bulto: últimos 3 dígitos → 001
	6.	Enviar POST a la API:

POST /api/ubicaciones
{
  "guia": "999028318869",
  "bulto": "001",
  "ubicacion": "A1",
  "fecha": "DD/MM/YYYY HH:mm"
}


	7.	Si la API confirma éxito:
	•	Sonido de éxito y flash verde de pantalla.
	•	Mensaje: “Bulto 001 de la guía 999028318869: Ubicado en A1”.
	8.	Si la API falla:
	•	Reintentar hasta 3 veces.
	•	Al tercer fallo: sonido de error, flash rojo y mensaje “Error. No se pudo guardar la ubicación del bulto.”
	9.	Al desconexión de Internet:
	•	Mensaje persistente “Sin conexión” y botón “Reintentar”.
	10.	Escanear fuera de formato (ni UBI  ni bulto válido):
	•	Flash rojo y mensaje “Error: código no reconocido” + sonido de error.

⸻

3. Requisitos Funcionales
	•	Escaneo mixto: teclado actúa como input + botón de cámara.
	•	Validación de formato:
	•	Ubicación: escaneo comienza con UBI .
	•	Bulto: 26 caracteres, validación de posición y longitud mínima.
	•	Feedback inmediato: colores (verde/rojo), sonidos (éxito/fallo) y mensajes.
	•	3 reintentos ante fallo de guardado.
	•	Gestión de conexión: mensaje y retry.
	•	Borrado automático: retención 45 días.
	•	Sobrescritura de ubicación si reaparece el mismo bulto.
	•	Sin login, autenticación vía x-api-key.

⸻

4. Requisitos No Funcionales
	•	Disponibilidad permanente (200 OK en escaneo real).
	•	Escalabilidad primaria para ~4.000 bultos/mes.
	•	Sin scroll en pantalla (kiosk).
	•	Tipografía: Cairo.
	•	Frameworks: Bootstrap + FontAwesome.

⸻

5. Arquitectura y Stack
	•	Frontend:
	•	Single HTML view con Bootstrap, FontAwesome y fuente Cairo.
	•	JavaScript puro (ES6+).
	•	Backend: Node.js + Express.
	•	DB: MongoDB Community Edition (misma VM).
	•	Proxy y procesos: Nginx + PM2.
	•	Entorno: variables en .env.

⸻

6. Esquema de la Base de Datos

Colección: guias

Cada documento agrupa todos los bultos de una misma guía en un array de subdocumentos.

Ejemplo de documento:

{
  "guia": "999012345678",
  "bultos": [
    {
      "bulto": "001",
      "ubicacion": "A1",
      "fecha": "27/07/2025 16:31",
      "fecha_iso": ISODate("2025-07-27T13:31:00Z")
    },
    {
      "bulto": "002",
      "ubicacion": "E3",
      "fecha": "24/07/2025 12:35",
      "fecha_iso": ISODate("2025-07-24T09:35:00Z")
    }
  ]
}

Retención de datos (45 días)

MongoDB no permite aplicar un índice TTL a campos dentro de subdocumentos sin eliminar todo el documento. Para garantizar que cada bulto expire a los 45 días:
	1.	Se crea un cron job en el backend (p. ej. con node-cron) que se ejecuta diariamente.
	2.	Ese job recorre la colección guias y elimina de su array bultos aquellos subdocumentos cuyo fecha_iso supere 45 días.
	3.	Si, tras la limpieza, un documento queda con un array bultos vacío, se elimina por completo.

⸻

7. API REST

Endpoints
	1.	POST /api/ubicaciones
	•	Headers: Content-Type: application/json, x-api-key: <WRITE_KEY>
	•	Body:

{ "guia": "string", "bulto": "string", "ubicacion": "string", "fecha": "DD/MM/YYYY HH:mm" }


	•	Respuestas:
	•	201 Created → { "status": "ok" }
	•	400 Bad Request → { "error": "mensaje" }
	•	401 Unauthorized → { "error": "API key inválida" }
	•	500 Internal Error

	2.	GET /api/ubicaciones/:guia (opcional)
	•	Headers: x-api-key: <READ_KEY>
	•	Respuesta:

{
  "guia": "999...",
  "bultos": [
    { "bulto":"001", "ubicacion":"A1", "fecha":"..." },
    ...
  ]
}



⸻

8. Seguridad
	•	API Keys en variables de entorno:
	•	API_KEY_WRITE
	•	API_KEY_READ
	•	Middleware Express verifica req.headers['x-api-key'].

⸻

9. Deployment en VM Ubuntu
	1.	Instalar dependencias:

apt update && apt install -y nodejs npm mongodb nginx git


	2.	Clonar repositorio en /var/www/html/via/ubicador.
	3.	Variables de entorno en /var/www/html/via/ubicador/.env:

API_KEY_WRITE=...
API_KEY_READ=...
MONGO_URI=mongodb://localhost:27017/ubicador
TZ=America/Argentina/Buenos_Aires


	4.	Instalar y arrancar Node/Express con PM2:

cd /var/www/html/via/ubicador
npm install
pm2 start src/app.js --name ubicador-api
pm2 save


	5.	Configurar Nginx (/etc/nginx/sites-available/ubicador.conf):

server {
  listen 80;
  server_name _;
  root /var/www/html/via/ubicador/public;
  index index.html;

  location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location / {
    try_files $uri $uri/ =404;
  }
}

ln -s /etc/nginx/sites-available/ubicador.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx



⸻

10. Archivos y Recursos

/var/www/html/via/ubicador
├── public/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── sounds/
├── src/
│   └── app.js
├── ecosystem.config.js
├── .env
└── package.json


⸻

11. Próximos Pasos
	•	Elegir puerto de Express (3000 por defecto) y configurar PM2.
	•	Crear certificado TLS en futuro (Let’s Encrypt).
	•	Desarrollar pruebas unitarias y de extremo a extremo.
	•	Plan de monitoreo (logs, alertas).