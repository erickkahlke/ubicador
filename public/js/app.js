// Variables globales
let currentLocation = null;
let isConnected = true;
let retryCount = 0;
const MAX_RETRIES = 3;

// Elementos del DOM
const scannerInput = document.getElementById('scanner-input');
const cameraBtn = document.getElementById('camera-btn');
const ubicacionActual = document.getElementById('ubicacion-actual');
const ubicacionTexto = document.getElementById('ubicacion-texto');
const mensajePrincipal = document.getElementById('mensaje-principal');
const statusMessage = document.getElementById('status-message');
const statusText = document.getElementById('status-text');
const connectionStatus = document.getElementById('connection-status');
const retryBtn = document.getElementById('retry-btn');
const flashOverlay = document.getElementById('flash-overlay');
const successSound = document.getElementById('success-sound');
const errorSound = document.getElementById('error-sound');

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('Inicializando Ubicador de Bultos...');
    
    // Event listeners
    scannerInput.addEventListener('keypress', handleKeyPress);
    scannerInput.addEventListener('input', handleInput);
    cameraBtn.addEventListener('click', activateCamera);
    retryBtn.addEventListener('click', handleRetry);
    
    // Focus en input
    focusInput();
    
    // Verificar conexión
    checkConnection();
    
    console.log('Aplicación inicializada correctamente');
}

function focusInput() {
    scannerInput.focus();
    // Reenfoque automático si se pierde el foco
    setTimeout(() => {
        if (document.activeElement !== scannerInput) {
            scannerInput.focus();
        }
    }, 100);
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        processScannedCode(scannerInput.value.trim());
    }
}

function handleInput(event) {
    // Solo limpiar timeouts previos si existen, pero no procesar automáticamente
    clearTimeout(window.inputTimeout);
    // El procesamiento solo ocurre con Enter, no con timeout
}

function processScannedCode(code) {
    console.log('Código escaneado:', code);
    
    if (!code) {
        showError('Error: código vacío');
        return;
    }
    
    // Limpiar input
    scannerInput.value = '';
    
    // Verificar si es una ubicación
    if (code.toUpperCase().startsWith('UBI ')) {
        handleLocationCode(code);
    } else if (isValidPackageCode(code)) {
        handlePackageCode(code);
    } else {
        showError('Error: código no reconocido');
        playErrorSound();
        flashScreen('error');
    }
    
    // Reenfoque
    focusInput();
}

function handleLocationCode(code) {
    // Extraer ubicación (quitar "UBI " del inicio)
    const location = code.substring(4).trim().toUpperCase();
    
    if (!location) {
        showError('Error: ubicación vacía');
        return;
    }
    
    console.log('Ubicación detectada:', location);
    
    currentLocation = location;
    ubicacionTexto.textContent = location;
    ubicacionActual.classList.remove('d-none');
    ubicacionActual.classList.add('fade-in');
    
    // Cambiar mensaje principal
    mensajePrincipal.innerHTML = '<i class="fas fa-box me-2"></i><span>Escanea un bulto para ubicarlo</span>';
    
    showSuccess(`Ubicación ${location} seleccionada`);
}

function handlePackageCode(code) {
    if (!currentLocation) {
        showError('Error: primero debe escanear una ubicación');
        return;
    }
    
    console.log('Código de bulto detectado:', code);
    
    // Procesar código de bulto según especificaciones
    const packageData = parsePackageCode(code);
    
    if (!packageData) {
        showError('Error: formato de bulto inválido');
        playErrorSound();
        flashScreen('error');
        return;
    }
    
    // Enviar a API
    sendToAPI(packageData);
}

function parsePackageCode(code) {
    // Validar longitud mínima de 26 caracteres
    if (code.length < 26) {
        console.log('Código muy corto:', code.length, 'caracteres');
        return null;
    }
    
    try {
        // Descartar primeros 7 dígitos y siguientes 4 (total 11)
        // Extraer guía: dígitos intermedios
        // Extraer bulto: últimos 3 dígitos
        
        const withoutFirst7 = code.substring(7); // Quitar primeros 7
        const withoutNext4 = withoutFirst7.substring(4); // Quitar siguientes 4
        
        const bulto = code.slice(-3); // Últimos 3 dígitos
        const guia = withoutNext4.slice(0, -3); // Todo excepto los últimos 3
        
        console.log('Parsing:', {
            original: code,
            sinPrimeros7: withoutFirst7,
            sinSiguientes4: withoutNext4,
            guia: guia,
            bulto: bulto
        });
        
        if (!guia || !bulto) {
            return null;
        }
        
        return {
            guia: guia,
            bulto: bulto,
            ubicacion: currentLocation,
            fecha: formatDateTime(new Date())
        };
        
    } catch (error) {
        console.error('Error parsing package code:', error);
        return null;
    }
}

function isValidPackageCode(code) {
    // Verificar que sea un código de bulto válido
    // Debe tener al menos 26 caracteres y ser numérico
    return code.length >= 26 && /^\d+$/.test(code);
}

function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function sendToAPI(packageData) {
    console.log('Enviando a API:', packageData);
    
    showStatus('Guardando ubicación...', 'warning');
    
    try {
        const response = await fetch('/api/ubicaciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'ubi-write-2025-secure-key-789xyz' // En producción esto vendría de config
            },
            body: JSON.stringify(packageData)
        });
        
        if (response.ok) {
            handleAPISuccess(packageData);
            retryCount = 0;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error enviando a API:', error);
        handleAPIError(packageData);
    }
}

function handleAPISuccess(packageData) {
    console.log('API Success');
    
    const message = `Bulto ${packageData.bulto} de la guía ${packageData.guia}: Ubicado en ${packageData.ubicacion}`;
    showSuccess(message);
    playSuccessSound();
    flashScreen('success');
    
    // Actualizar estado de conexión
    updateConnectionStatus(true);
}

function handleAPIError(packageData) {
    retryCount++;
    
    if (retryCount <= MAX_RETRIES) {
        console.log(`Reintentando... (${retryCount}/${MAX_RETRIES})`);
        setTimeout(() => {
            sendToAPI(packageData);
        }, 1000);
    } else {
        console.log('Máximo de reintentos alcanzado');
        showError('Error. No se pudo guardar la ubicación del bulto.');
        playErrorSound();
        flashScreen('error');
        retryCount = 0;
    }
}

function checkConnection() {
    fetch('/api/health')
        .then(response => {
            updateConnectionStatus(response.ok);
        })
        .catch(() => {
            updateConnectionStatus(false);
        });
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    
    if (connected) {
        connectionStatus.innerHTML = '<i class="fas fa-wifi me-2"></i><span>Conectado</span>';
        connectionStatus.className = 'connection-status';
        retryBtn.classList.add('d-none');
    } else {
        connectionStatus.innerHTML = '<i class="fas fa-wifi-slash me-2"></i><span>Sin conexión</span>';
        connectionStatus.className = 'connection-status offline';
        retryBtn.classList.remove('d-none');
    }
}

function handleRetry() {
    console.log('Reintentando conexión...');
    checkConnection();
}

function showSuccess(message) {
    statusText.textContent = message;
    statusMessage.className = 'status-message success';
    statusMessage.classList.remove('d-none');
    
    setTimeout(() => {
        statusMessage.classList.add('d-none');
    }, 3000);
}

function showError(message) {
    statusText.textContent = message;
    statusMessage.className = 'status-message error shake';
    statusMessage.classList.remove('d-none');
    
    setTimeout(() => {
        statusMessage.classList.add('d-none');
        statusMessage.classList.remove('shake');
    }, 3000);
}

function showStatus(message, type = 'warning') {
    statusText.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('d-none');
}

function playSuccessSound() {
    try {
        successSound.currentTime = 0;
        successSound.play().catch(e => console.log('Error playing success sound:', e));
    } catch (error) {
        console.log('Success sound not available');
    }
}

function playErrorSound() {
    try {
        errorSound.currentTime = 0;
        errorSound.play().catch(e => console.log('Error playing error sound:', e));
    } catch (error) {
        console.log('Error sound not available');
    }
}

function flashScreen(type) {
    flashOverlay.className = `flash-overlay ${type} show`;
    
    setTimeout(() => {
        flashOverlay.classList.remove('show');
    }, 200);
}

function activateCamera() {
    // Implementación básica del escáner con cámara
    // En un entorno real se usaría una librería como ZXing o QuaggaJS
    showStatus('Función de cámara en desarrollo', 'warning');
}

// Verificar conexión periódicamente
setInterval(checkConnection, 30000);

// Mantener focus en input
setInterval(focusInput, 5000); 