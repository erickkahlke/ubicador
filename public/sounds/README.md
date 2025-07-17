# Archivos de Sonido para Ubicador de Bultos

La aplicación necesita archivos de sonido para el feedback auditivo. Coloca los siguientes archivos en este directorio:

## Archivos requeridos:

### 1. Sonido de éxito
- **Archivo:** `success.mp3` o `success.wav`
- **Duración:** 1-2 segundos
- **Descripción:** Sonido que se reproduce cuando se guarda exitosamente una ubicación
- **Sugerencia:** Tono ascendente, campana, o "ding" positivo

### 2. Sonido de error
- **Archivo:** `error.mp3` o `error.wav`
- **Duración:** 1-2 segundos
- **Descripción:** Sonido que se reproduce cuando hay un error (código inválido, fallo de API, etc.)
- **Sugerencia:** Tono descendente, buzz, o "beep" de error

## Generación de sonidos

### Opción 1: Usar herramientas online
- [Freesound.org](https://freesound.org) - Sonidos libres
- [ZapSplat](https://zapsplat.com) - Biblioteca de sonidos
- [Mixkit](https://mixkit.co/free-sound-effects/) - Efectos gratuitos

### Opción 2: Generar con código
Puedes usar el siguiente script de Node.js para generar tonos básicos:

```javascript
// generate-sounds.js
const fs = require('fs');

// Función para generar tono simple
function generateTone(frequency, duration, filename) {
    const sampleRate = 44100;
    const samples = sampleRate * duration;
    const buffer = Buffer.alloc(samples * 2);
    
    for (let i = 0; i < samples; i++) {
        const value = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
        buffer.writeInt16LE(value, i * 2);
    }
    
    // Crear archivo WAV básico
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + buffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(buffer.length, 40);
    
    fs.writeFileSync(filename, Buffer.concat([header, buffer]));
}

// Generar sonidos
generateTone(800, 0.5, 'success.wav');  // Tono alto para éxito
generateTone(200, 0.5, 'error.wav');    // Tono bajo para error

console.log('Sonidos generados: success.wav, error.wav');
```

### Opción 3: Usar archivos de ejemplo
Si necesitas archivos temporales para prueba, la aplicación funcionará sin sonido (los errores se capturan).

## Formato recomendado
- **MP3:** Mayor compatibilidad
- **WAV:** Mejor calidad, sin compresión
- **Tamaño:** Mantener archivos pequeños (<100KB cada uno)
- **Volumen:** Normalizado, no muy alto para modo kiosk
