const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configurar zona horaria
process.env.TZ = process.env.TZ || 'America/Argentina/Buenos_Aires';

console.log('🔧 MODO DEMO: MongoDB deshabilitado para pruebas locales');

// Almacenamiento en memoria para demo
const demoStorage = new Map();

// Middleware de autenticación (simplificado para demo)
function authenticateAPI(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key requerida' });
    }
    
    // En demo, aceptamos cualquier API key
    console.log('🔑 API Key recibida:', apiKey);
    next();
}

// Función para convertir fecha DD/MM/YYYY HH:mm a Date
function parseDateTime(dateString) {
    try {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        
        return new Date(year, month - 1, day, hours, minutes);
    } catch (error) {
        console.error('Error parsing date:', error);
        return new Date(); // Fallback a fecha actual
    }
}

// Rutas de la API

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        mode: 'demo',
        timestamp: new Date().toISOString() 
    });
});

// POST /api/ubicaciones - Crear/actualizar ubicación de bulto (DEMO)
app.post('/api/ubicaciones', authenticateAPI, async (req, res) => {
    try {
        const { guia, bulto, ubicacion, fecha } = req.body;
        
        // Validaciones
        if (!guia || !bulto || !ubicacion || !fecha) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: guia, bulto, ubicacion, fecha' 
            });
        }
        
        console.log('📦 DEMO - Recibiendo ubicación:', { guia, bulto, ubicacion, fecha });
        
        // Simular almacenamiento en memoria
        const key = `${guia}-${bulto}`;
        demoStorage.set(key, {
            guia,
            bulto,
            ubicacion,
            fecha,
            fecha_iso: parseDateTime(fecha),
            timestamp: new Date()
        });
        
        console.log('✅ DEMO - Ubicación guardada en memoria:', key);
        console.log('💾 Total registros en memoria:', demoStorage.size);
        
        // Simular un pequeño delay como en una DB real
        await new Promise(resolve => setTimeout(resolve, 100));
        
        res.status(201).json({ status: 'ok', mode: 'demo' });
        
    } catch (error) {
        console.error('❌ Error guardando ubicación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/ubicaciones/:guia - Obtener ubicaciones de una guía (DEMO)
app.get('/api/ubicaciones/:guia', authenticateAPI, async (req, res) => {
    try {
        const { guia } = req.params;
        
        if (!guia) {
            return res.status(400).json({ error: 'Guía requerida' });
        }
        
        console.log('🔍 DEMO - Buscando guía:', guia);
        
        // Buscar en memoria
        const bultos = [];
        for (const [key, data] of demoStorage.entries()) {
            if (data.guia === guia) {
                bultos.push({
                    bulto: data.bulto,
                    ubicacion: data.ubicacion,
                    fecha: data.fecha
                });
            }
        }
        
        if (bultos.length === 0) {
            return res.status(404).json({ error: 'Guía no encontrada' });
        }
        
        const response = { guia, bultos };
        console.log('📋 DEMO - Respuesta:', response);
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error obteniendo ubicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/ubicaciones - Obtener todas las ubicaciones (DEMO)
app.get('/api/ubicaciones', authenticateAPI, async (req, res) => {
    try {
        console.log('📊 DEMO - Obteniendo todas las ubicaciones');
        
        const guiasMap = new Map();
        
        // Agrupar por guía
        for (const [key, data] of demoStorage.entries()) {
            if (!guiasMap.has(data.guia)) {
                guiasMap.set(data.guia, []);
            }
            guiasMap.get(data.guia).push({
                bulto: data.bulto,
                ubicacion: data.ubicacion,
                fecha: data.fecha
            });
        }
        
        const response = Array.from(guiasMap.entries()).map(([guia, bultos]) => ({
            guia,
            bultos
        }));
        
        console.log(`📈 DEMO - Retornando ${response.length} guías con ${demoStorage.size} bultos total`);
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error obteniendo todas las ubicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para ver el contenido de la memoria (solo para demo)
app.get('/api/demo/storage', (req, res) => {
    const storage = Array.from(demoStorage.entries()).map(([key, data]) => ({
        key,
        ...data
    }));
    
    res.json({
        mode: 'demo',
        total_records: demoStorage.size,
        storage
    });
});

// Endpoint para limpiar la memoria (solo para demo)
app.delete('/api/demo/storage', (req, res) => {
    const previousSize = demoStorage.size;
    demoStorage.clear();
    
    console.log(`🗑️ DEMO - Memoria limpiada. Registros eliminados: ${previousSize}`);
    
    res.json({
        mode: 'demo',
        message: 'Memoria limpiada',
        records_deleted: previousSize
    });
});

// Ruta para servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de errores globales
app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Función para obtener IP local
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }
    
    // Devolver la primera IP encontrada
    for (const name of Object.keys(results)) {
        if (results[name].length > 0) {
            return results[name][0];
        }
    }
    return 'localhost';
}

// Iniciar servidor en todas las interfaces (0.0.0.0)
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('🎉 ========================================');
    console.log('🚀 SERVIDOR DEMO UBICADOR DE BULTOS');
    console.log('🎉 ========================================');
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌎 URL Local: http://localhost:${PORT}`);
    console.log(`🌐 URL Red Local: http://${localIP}:${PORT}`);
    console.log(`🔧 Modo: DEMO (sin MongoDB)`);
    console.log(`⏰ Zona horaria: ${process.env.TZ}`);
    console.log('');
    console.log('📋 Endpoints disponibles:');
    console.log(`   • Frontend Local: http://localhost:${PORT}/`);
    console.log(`   • Frontend Red: http://${localIP}:${PORT}/`);
    console.log(`   • Health: http://${localIP}:${PORT}/api/health`);
    console.log(`   • Demo Storage: http://${localIP}:${PORT}/api/demo/storage`);
    console.log('');
    console.log('📱 Para acceder desde otros dispositivos usa:');
    console.log(`   http://${localIP}:${PORT}`);
    console.log('');
    console.log('✅ ¡Listo para probar desde cualquier dispositivo!');
    console.log('🎉 ========================================');
});

module.exports = app; 