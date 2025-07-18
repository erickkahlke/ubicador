// Variables globales
let currentLocation = null;
let isConnected = true;
let retryCount = 0;
const MAX_RETRIES = 3;
let audioInitialized = false;

// Elementos del DOM
const scannerInput = document.getElementById('scanner-input');
const cameraBtn = document.getElementById('camera-btn');
const closeIntegratedBtn = document.getElementById('close-integrated-scanner');
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
    
    // Inicializar audio en primera interacción
    initializeAudioOnFirstTouch();
    
    // Event listeners
    scannerInput.addEventListener('keypress', handleKeyPress);
    scannerInput.addEventListener('input', handleInput);
    cameraBtn.addEventListener('click', activateCamera);
    retryBtn.addEventListener('click', handleRetry);
    
    // Focus lock: mantener focus siempre en input cuando no está en modo scanner
    initializeFocusLock();
    
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
    
    // Verificar si es la misma ubicación
    if (currentLocation === location) {
        console.log('Misma ubicación, pero reproducir sonido de éxito');
        showSuccess(`Ubicación ${location} confirmada`);
        return;
    }
    
    console.log('Cambiando ubicación de', currentLocation, 'a', location);
    
    // Guardar ubicación anterior para mensaje
    const previousLocation = currentLocation;
    
    currentLocation = location;
    ubicacionTexto.textContent = location;
    ubicacionActual.classList.remove('d-none');
    ubicacionActual.classList.add('fade-in');
    
    // Cambiar mensaje principal
    mensajePrincipal.innerHTML = '<i class="fas fa-box me-2"></i><span>Escanea un bulto para ubicarlo</span>';
    
    // Mensaje diferente para cambio de ubicación
    const mensaje = previousLocation ? 
        `Ubicación cambiada a ${location}` : 
        `Ubicación ${location} seleccionada`;
    
    console.log('Ejecutando showSuccess con mensaje:', mensaje);
    showSuccess(mensaje);
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
        connectionStatus.innerHTML = '<i class="fas fa-wifi me-1"></i>';
        connectionStatus.className = 'connection-status';
        connectionStatus.title = 'Conectado';
        retryBtn.classList.add('d-none');
    } else {
        connectionStatus.innerHTML = '<i class="fas fa-wifi-slash me-1"></i>';
        connectionStatus.className = 'connection-status offline';
        connectionStatus.title = 'Sin conexión';
        retryBtn.classList.remove('d-none');
    }
}

function handleRetry() {
    console.log('Reintentando conexión...');
    checkConnection();
}

// Variable para manejar timeout de notificaciones
let notificationTimeout = null;

function showSuccess(message) {
    console.log('📱 Mostrando mensaje de éxito:', message);
    clearPreviousNotification();
    statusText.textContent = message;
    statusMessage.className = 'status-message success fade-in';
    statusMessage.classList.remove('d-none');
    
    // Feedback sonoro y visual automático
    console.log('📱 Ejecutando feedback de éxito...');
    playSuccessSound();
    flashScreen('success');
    
    notificationTimeout = setTimeout(() => {
        statusMessage.classList.add('d-none');
    }, 30000); // 30 segundos
}

function showError(message) {
    console.log('📱 Mostrando mensaje de error:', message);
    clearPreviousNotification();
    statusText.textContent = message;
    statusMessage.className = 'status-message error shake fade-in';
    statusMessage.classList.remove('d-none');
    
    // Feedback sonoro y visual automático
    console.log('📱 Ejecutando feedback de error...');
    playErrorSound();
    flashScreen('error');
    
    notificationTimeout = setTimeout(() => {
        statusMessage.classList.add('d-none');
        statusMessage.classList.remove('shake');
    }, 30000); // 30 segundos
}

function showStatus(message, type = 'warning') {
    clearPreviousNotification();
    statusText.textContent = message;
    statusMessage.className = `status-message ${type} fade-in`;
    statusMessage.classList.remove('d-none');
    
    // Para estados temporales como "Guardando...", usar tiempo más corto
    if (type === 'warning' && message.includes('Guardando')) {
        notificationTimeout = setTimeout(() => {
            statusMessage.classList.add('d-none');
        }, 5000); // 5 segundos para mensajes de carga
    } else {
        notificationTimeout = setTimeout(() => {
            statusMessage.classList.add('d-none');
        }, 30000); // 30 segundos para otros mensajes
    }
}

function clearPreviousNotification() {
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
    }
}

function playSuccessSound() {
    console.log('🔊 Reproduciendo sonido de éxito...');
    try {
        // Detener cualquier sonido previo
        successSound.pause();
        successSound.currentTime = 0;
        successSound.play()
            .then(() => console.log('✅ Sonido de éxito reproducido'))
            .catch(e => console.log('❌ Error playing success sound:', e));
    } catch (error) {
        console.log('⚠️ Success sound not available:', error);
    }
}

function playErrorSound() {
    console.log('🔊 Reproduciendo sonido de error...');
    try {
        // Detener cualquier sonido previo
        errorSound.pause();
        errorSound.currentTime = 0;
        errorSound.play()
            .then(() => console.log('✅ Sonido de error reproducido'))
            .catch(e => console.log('❌ Error playing error sound:', e));
    } catch (error) {
        console.log('⚠️ Error sound not available:', error);
    }
}

function flashScreen(type) {
    flashOverlay.className = `flash-overlay ${type} show`;
    
    setTimeout(() => {
        flashOverlay.classList.remove('show');
    }, 500); // Duración más larga para mejor feedback visual
}

function activateCamera() {
    console.log('📱 Activando cámara scanner...');
    if (typeof activateScanner === 'function') {
        activateScanner();
    } else {
        console.error('Scanner no disponible');
        showError('Scanner de cámara no disponible');
    }
}

// Inicializar audio para móviles (requiere interacción del usuario)
function initializeAudioOnFirstTouch() {
    const initAudio = () => {
        if (!audioInitialized) {
            console.log('🔊 Inicializando audio para móviles...');
            
            // Intentar reproducir y pausar inmediatamente para "activar" el audio
            const sounds = [successSound, errorSound];
            sounds.forEach(audio => {
                if (audio) {
                    audio.volume = 0.1; // Volumen muy bajo para esta prueba
                    audio.play().then(() => {
                        audio.pause();
                        audio.volume = 1; // Restaurar volumen
                        audio.currentTime = 0;
                        console.log('✅ Audio inicializado:', audio.id);
                    }).catch(e => {
                        console.log('ℹ️ Audio no pudo inicializarse:', audio.id);
                    });
                }
            });
            
            audioInitialized = true;
            
            // Remover listeners después de la primera inicialización
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        }
    };
    
    // Listeners para la primera interacción
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
}

// Focus Lock: Mantener focus siempre en el input cuando no está en modo scanner
function initializeFocusLock() {
    console.log('🔒 Inicializando focus lock en input...');
    
    // Detectar cuando el focus sale del input
    scannerInput.addEventListener('blur', (e) => {
        // Solo re-enfocar si NO estamos en modo scanner
        if (!document.body.classList.contains('scanner-active')) {
            console.log('🎯 Focus perdido, devolviendo a input...');
            setTimeout(() => {
                if (!document.body.classList.contains('scanner-active')) {
                    scannerInput.focus();
                }
            }, 10);
        }
    });
    
    // Event listener global para capturar clicks fuera del input
    document.addEventListener('click', (e) => {
        // IMPORTANTE: No interferir si estamos en modo scanner
        if (document.body.classList.contains('scanner-active')) {
            console.log('🔍 Modo scanner activo - permitiendo clicks libremente');
            return;
        }
        
        // Solo actuar si NO estamos en modo scanner y no se clickeó elementos permitidos
        if (e.target !== scannerInput && 
            e.target !== cameraBtn &&
            e.target !== closeIntegratedBtn &&
            !cameraBtn.contains(e.target) &&
            !closeIntegratedBtn?.contains(e.target)) {
            
            console.log('🎯 Click detectado fuera del input, devolviendo focus...');
            setTimeout(() => {
                if (!document.body.classList.contains('scanner-active')) {
                    scannerInput.focus();
                }
            }, 10);
        }
    });
    
    // Event listener para teclas de navegación (Tab, Shift+Tab, etc.)
    document.addEventListener('keydown', (e) => {
        // Solo actuar si no estamos en modo scanner
        if (!document.body.classList.contains('scanner-active')) {
            if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault(); // Prevenir navegación con Tab
                scannerInput.focus();
                console.log('🎯 Navegación interceptada, manteniendo focus en input');
            }
        }
    });
    
    // Forzar focus periódicamente como respaldo
    setInterval(() => {
        if (!document.body.classList.contains('scanner-active') && 
            document.activeElement !== scannerInput) {
            scannerInput.focus();
        }
    }, 1000);
}

// Verificar conexión periódicamente
setInterval(checkConnection, 30000);

// Mantener focus en input
setInterval(focusInput, 5000); 