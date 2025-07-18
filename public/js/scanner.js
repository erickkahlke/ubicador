// Scanner optimizado: GS1-128 + QR simple y confiable
class BarcodeScanner {
    constructor() {
        this.isScanning = false;
        this.integratedScanner = document.getElementById('integrated-scanner');
        this.scannerContainer = document.getElementById('integrated-scanner-container');
        this.closeIntegratedBtn = document.getElementById('close-integrated-scanner');
        this.stream = null;
        this.video = null;
        
        console.log('🔧 BarcodeScanner inicializado:');
        console.log('   - integratedScanner:', !!this.integratedScanner);
        console.log('   - scannerContainer:', !!this.scannerContainer);
        console.log('   - closeIntegratedBtn:', !!this.closeIntegratedBtn);
        
        // QR Reader simple y confiable
        this.html5QrScanner = null;
        this.isCodeDetected = false;
        this.lastScanTime = 0; // Para debounce de escaneos
        
        // Detección de códigos duplicados
        this.lastCode = null;
        this.lastCodeTime = 0;
        this.DUPLICATE_TIMEOUT = 5000; // 5 segundos para considerar duplicado
        
        this.initializeEventListeners();
        this.initializeQR();
    }
    
    initializeQR() {
        if (typeof Html5Qrcode === 'undefined') {
            console.warn('Html5-QrCode no disponible');
        }
    }

    initializeEventListeners() {
        // Verificar que el botón existe
        if (this.closeIntegratedBtn) {
            console.log('✅ Botón de cerrar scanner encontrado, agregando event listener...');
            
            // Cerrar scanner integrado - con múltiples eventos para asegurar captura
            this.closeIntegratedBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔴 CLICK EVENT - Botón X clickeado - cerrando scanner...');
                this.stopScanner();
            });
            
            // Backup con mousedown por si click no funciona
            this.closeIntegratedBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔴 MOUSEDOWN EVENT - Botón X presionado - cerrando scanner...');
                this.stopScanner();
            });
            
            // Backup con touchstart para móviles
            this.closeIntegratedBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔴 TOUCHSTART EVENT - Botón X tocado - cerrando scanner...');
                this.stopScanner();
            });
            
            console.log('📱 Event listeners agregados correctamente al botón X');
        } else {
            console.error('❌ Botón de cerrar scanner NO encontrado!');
        }

        // Flash button removed - functionality not needed

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isScanning) {
                console.log('⌨️ ESC presionado - cerrando scanner...');
                this.stopScanner();
            }
        });
    }

    async startScanner() {
        console.log('🎥 Iniciando scanner integrado...');
        
        if (this.isScanning) {
            console.log('Scanner ya está activo');
            return;
        }

        try {
            // Verificar soporte de cámara
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Cámara no soportada en este dispositivo');
            }

            // Mostrar scanner integrado y ocultar input
            this.integratedScanner.classList.remove('d-none');
            document.body.classList.add('scanner-active');
            this.isScanning = true;
            this.isCodeDetected = false;

            console.log('🎥 Scanner UI mostrado, modo scanner activo');
            console.log('📱 Clases body:', document.body.className);
            console.log('🔍 Botón cerrar existe:', !!this.closeIntegratedBtn);
            
            // Debug de clicks en modo scanner
            this.debugClickHandler = (e) => {
                if (document.body.classList.contains('scanner-active')) {
                    console.log('🖱️ Click detectado en modo scanner:');
                    console.log('   - Target:', e.target.tagName, e.target.className, e.target.id);
                    console.log('   - Es botón X?:', e.target.id === 'close-integrated-scanner');
                    console.log('   - Coordenadas:', e.clientX, e.clientY);
                    
                    // Detectar si el click debería ir al botón X
                    const btnX = document.getElementById('close-integrated-scanner');
                    if (btnX) {
                        const rect = btnX.getBoundingClientRect();
                        const clickInBtnArea = e.clientX >= rect.left && e.clientX <= rect.right && 
                                             e.clientY >= rect.top && e.clientY <= rect.bottom;
                        console.log('   - Click en área del botón X?:', clickInBtnArea);
                        console.log('   - Rect botón X:', rect.left, rect.top, rect.right, rect.bottom);
                        
                        if (clickInBtnArea && e.target.id !== 'close-integrated-scanner') {
                            console.log('❌ PROBLEMA: Click en área del botón X interceptado por otro elemento!');
                            console.log('   - Elemento interceptor:', e.target.tagName, e.target.className);
                        }
                    }
                }
            };
            document.addEventListener('click', this.debugClickHandler);
            
            // Verificación adicional del botón después de mostrar el scanner
            setTimeout(() => {
                const btnCheck = document.getElementById('close-integrated-scanner');
                console.log('🔍 Verificación post-apertura - Botón encontrado:', !!btnCheck);
                if (btnCheck) {
                    console.log('🔍 Botón visible:', btnCheck.offsetWidth > 0 && btnCheck.offsetHeight > 0);
                    console.log('🔍 Botón classes:', btnCheck.className);
                    console.log('🔍 Botón z-index:', window.getComputedStyle(btnCheck).zIndex);
                    console.log('🔍 Botón pointer-events:', window.getComputedStyle(btnCheck).pointerEvents);
                    
                    // Debug de elementos que podrían interferir
                    const statusContainer = document.querySelector('.status-container');
                    if (statusContainer) {
                        console.log('📋 Status-container z-index:', window.getComputedStyle(statusContainer).zIndex);
                        console.log('📋 Status-container pointer-events:', window.getComputedStyle(statusContainer).pointerEvents);
                        console.log('📋 Status-container top:', window.getComputedStyle(statusContainer).top);
                    }
                    
                    const scannerHeader = btnCheck.closest('.scanner-header');
                    if (scannerHeader) {
                        console.log('🎬 Scanner-header z-index:', window.getComputedStyle(scannerHeader).zIndex);
                    }
                    
                    // FORZAR event listener directo como backup
                    console.log('🔧 Agregando event listener DIRECTO al botón como backup...');
                    const self = this; // Guardar referencia del contexto
                    btnCheck.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔴 ONCLICK DIRECTO - Botón X clickeado - cerrando scanner...');
                        self.stopScanner();
                    };
                }
            }, 100);
            console.log('📱 Verificando librerías disponibles...');
            console.log('Html5Qrcode:', typeof Html5Qrcode !== 'undefined');
            console.log('Quagga:', typeof Quagga !== 'undefined');

            // Usar Html5-QrCode como principal, Quagga como fallback
            if (typeof Html5Qrcode !== 'undefined') {
                await this.startHtml5Scanner();
            } else {
                console.log('📱 Usando Quagga como fallback...');
                await this.startQuaggaScanner();
            }

            // Flash button removed

            console.log('🎥 Scanner integrado iniciado exitosamente');

        } catch (error) {
            console.error('❌ Error iniciando scanner:', error);
            this.handleScannerError(error);
        }
    }

    async startHtml5Scanner() {
        try {
            console.log('📱 Iniciando Html5-QrCode para detección completa...');
            
            // Crear nueva instancia cada vez para evitar conflictos
            this.html5QrScanner = new Html5Qrcode("integrated-scanner-container");
            
            const config = {
                fps: 10, // Reducir FPS para mejor detección
                qrbox: { width: 350, height: 200 }, // Área más grande para códigos de barras
                aspectRatio: 1.75, // Proporción más cuadrada
                // Html5-QrCode detecta automáticamente QR y códigos de barras
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                },
                // Configuración adicional para mejor detección
                rememberLastUsedCamera: true,
                videoConstraints: {
                    facingMode: "environment",
                    focusMode: "continuous"
                }
            };

            await this.html5QrScanner.start(
                { facingMode: "environment" }, // cámara trasera
                config,
                (decodedText, decodedResult) => {
                    if (!this.isCodeDetected) {
                        console.log('🎯 Código detectado por Html5-QrCode:', decodedText);
                        console.log('Detalles:', decodedResult);
                        
                        // Determinar tipo de código
                        let codeType = 'BARCODE';
                        if (decodedResult.result?.format) {
                            const format = decodedResult.result.format;
                            console.log('Formato detectado:', format);
                            if (format.toString().includes('QR')) {
                                codeType = 'QR';
                            } else if (this.isValidGS1128(decodedText)) {
                                codeType = 'GS1-128';
                            }
                        } else if (this.isValidGS1128(decodedText)) {
                            codeType = 'GS1-128';
                        }
                        
                        console.log(`✅ ${codeType} detectado:`, decodedText);
                        this.isCodeDetected = true;
                        this.onCodeDetected(decodedText, codeType);
                    }
                },
                (errorMessage) => {
                    // Errores normales durante escaneo - no mostrar todos
                }
            );
            
            console.log('✅ Html5-QrCode iniciado exitosamente');
            
        } catch (error) {
            console.error('❌ Error iniciando Html5-QrCode:', error);
            // Fallback a Quagga
            await this.startQuaggaScanner();
        }
    }

    async startQuaggaScanner() {
        console.log('📱 Iniciando Quagga como fallback...');
        
        const quaggaConfig = {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: this.scannerContainer,
                constraints: {
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 },
                    facingMode: "environment",
                    aspectRatio: { min: 1, max: 2 }
                },
                singleChannel: false
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 15,
            decoder: {
                readers: [
                    "code_128_reader", // Principal para GS1-128
                    "ean_reader",
                    "code_39_reader"
                ],
                multiple: false
            },
            locate: true
        };

        await new Promise((resolve, reject) => {
            Quagga.init(quaggaConfig, (err) => {
                if (err) {
                    console.error('❌ Error inicializando Quagga:', err);
                    reject(err);
                } else {
                    console.log('✅ Quagga inicializado correctamente');
                    resolve();
                }
            });
        });

        Quagga.start();

        // Capturar video y stream para control de flash
        this.video = this.scannerContainer.querySelector('video');
        if (this.video && this.video.srcObject) {
            this.stream = this.video.srcObject;
            console.log('📹 Stream capturado para control de flash');
        }

        // Event listener para códigos de barras
        Quagga.onDetected((result) => {
            if (!this.isCodeDetected) {
                const code = result.codeResult.code;
                console.log('📦 Código detectado por Quagga:', code, 'Formato:', result.codeResult.format);
                
                const codeType = this.isValidGS1128(code) ? 'GS1-128' : 'BARCODE';
                console.log(`✅ ${codeType} detectado:`, code);
                
                this.isCodeDetected = true;
                this.onCodeDetected(code, codeType);
            }
        });
    }
    
    // Validación GS1-128
    isValidGS1128(code) {
        if (code.length >= 20 && /^\d+$/.test(code)) {
            return true;
        }
        if (code.match(/^(00|01|02|10|11|17|20|21|30|37|90|91|92|93|94|95|96|97|98|99)/)) {
            return true;
        }
        return false;
    }

    async stopScanner() {
        console.log('🛑 Deteniendo scanner integrado...');
        
        if (!this.isScanning) {
            return;
        }

        try {
            // Detener Html5-QrCode si está activo
            if (this.html5QrScanner) {
                try {
                    await this.html5QrScanner.stop();
                    this.html5QrScanner.clear();
                } catch (e) {
                    console.log('Error deteniendo Html5-QrCode:', e);
                }
                this.html5QrScanner = null;
            }

            // Detener Quagga si está activo (siempre intentar detenerlo)
            if (typeof Quagga !== 'undefined') {
                try {
                    Quagga.stop();
                    Quagga.offDetected();
                    Quagga.offProcessed();
                    console.log('Quagga detenido');
                } catch (e) {
                    console.log('Error deteniendo Quagga:', e);
                }
            }

            // Ocultar scanner integrado y mostrar input
            console.log('🔴 Cerrando scanner - ocultando UI...');
            this.integratedScanner.classList.add('d-none');
            document.body.classList.remove('scanner-active');
            this.isScanning = false;
            
            // Limpiar debug click handler
            if (this.debugClickHandler) {
                document.removeEventListener('click', this.debugClickHandler);
                this.debugClickHandler = null;
            }
            
            console.log('✅ Modo scanner desactivado, clases body:', document.body.className);

            // Reiniciar variables
            this.video = null;
            this.isCodeDetected = false;
            this.lastScanTime = 0; // Reset debounce
            
            // Reset detección de duplicados
            this.lastCode = null;
            this.lastCodeTime = 0;

            console.log('✅ Scanner integrado detenido exitosamente');

        } catch (error) {
            console.error('❌ Error deteniendo scanner:', error);
        }

        // Reenfoque en input
        setTimeout(() => {
            document.getElementById('scanner-input').focus();
        }, 300);
    }

    onCodeDetected(code, type) {
        console.log(`📦 ${type} detectado en onCodeDetected:`, code);

        const currentTime = Date.now();

        // DEBOUNCE: Evitar escaneos repetidos en 1 segundo
        if (currentTime - this.lastScanTime < 1000) {
            console.log('⏱️ Escaneo ignorado por debounce (muy reciente)');
            return;
        }

        // DETECCIÓN DE DUPLICADOS: Evitar lecturas del mismo código en 5 segundos
        if (this.lastCode === code && currentTime - this.lastCodeTime < this.DUPLICATE_TIMEOUT) {
            console.log(`🔄 Código duplicado ignorado: "${code}" (leído hace ${Math.round((currentTime - this.lastCodeTime) / 1000)} segundos)`);
            return;
        }

        // Actualizar registros de último código y tiempo
        this.lastScanTime = currentTime;
        this.lastCode = code;
        this.lastCodeTime = currentTime;

        // Vibración si está disponible
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Sonido de éxito
        try {
            const successSound = document.getElementById('success-sound');
            successSound.currentTime = 0;
            successSound.play().catch(e => {});
        } catch (e) {
            // Ignorar errores de audio
        }

        // Flash verde
        this.flashSuccess();

        // Mostrar mensaje temporal en el scanner
        this.showTemporaryMessage(`${type} detectado: ${code.substring(0, 25)}...`);

        // Procesar código y permitir seguir escaneando
        if (typeof processScannedCode === 'function') {
            processScannedCode(code);
        }
        
        // Resetear flag para permitir detección de siguiente código
        setTimeout(() => {
            this.isCodeDetected = false;
        }, 1500);
    }

    drawBoundingBoxes(boxes) {
        // Opcional: dibujar cajas de detección
        // QuaggaJS ya maneja esto internamente
    }

    // Flashlight functions removed - not working properly

    flashSuccess() {
        // Flash verde en toda la pantalla - MÁS NOTORIO
        const flashOverlay = document.getElementById('flash-overlay');
        if (flashOverlay) {
            flashOverlay.className = 'flash-overlay success show';
            setTimeout(() => {
                flashOverlay.classList.remove('show');
            }, 500); // Duración más larga para ser más notorio
        }
    }

    handleScannerError(error) {
        console.error('Scanner error:', error);
        
        let message = 'Error al acceder a la cámara';
        
        if (error.name === 'NotAllowedError') {
            message = 'Permiso de cámara denegado. Por favor, habilite el acceso a la cámara.';
        } else if (error.name === 'NotFoundError') {
            message = 'No se encontró cámara en el dispositivo.';
        } else if (error.name === 'NotSupportedError') {
            message = 'Cámara no soportada en este navegador.';
        }

        this.showError(message);
        this.stopScanner();
    }

    showError(message) {
        // Usar el sistema de mensajes existente
        if (typeof showError === 'function') {
            showError(message);
        } else {
            alert(message);
        }
    }

    showTemporaryMessage(message) {
        // Crear mensaje temporal en el scanner
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 1000;
            font-size: 14px;
        `;
        messageDiv.textContent = message;
        
        this.scannerContainer.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
}

// Inicializar scanner globalmente
let barcodeScanner;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎬 Inicializando BarcodeScanner...');
    barcodeScanner = new BarcodeScanner();
    console.log('✅ BarcodeScanner listo');
});

// Función global para activar scanner
function activateScanner() {
    if (barcodeScanner) {
        barcodeScanner.startScanner();
    } else {
        console.error('BarcodeScanner no inicializado');
    }
} 