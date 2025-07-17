const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
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

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ubicador', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', function() {
    console.log('Conectado exitosamente a MongoDB');
});

// Esquema de la base de datos
const bultoSchema = new mongoose.Schema({
    bulto: {
        type: String,
        required: true
    },
    ubicacion: {
        type: String,
        required: true
    },
    fecha: {
        type: String,
        required: true
    },
    fecha_iso: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const guiaSchema = new mongoose.Schema({
    guia: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    bultos: [bultoSchema]
});

const Guia = mongoose.model('Guia', guiaSchema);

// Middleware de autenticación
function authenticateAPI(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key requerida' });
    }
    
    // Verificar API key según el tipo de operación
    const writeKey = process.env.API_KEY_WRITE;
    const readKey = process.env.API_KEY_READ;
    
    if (req.method === 'POST' && apiKey === writeKey) {
        next();
    } else if (req.method === 'GET' && (apiKey === readKey || apiKey === writeKey)) {
        next();
    } else {
        res.status(401).json({ error: 'API key inválida' });
    }
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
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/ubicaciones - Crear/actualizar ubicación de bulto
app.post('/api/ubicaciones', authenticateAPI, async (req, res) => {
    try {
        const { guia, bulto, ubicacion, fecha } = req.body;
        
        // Validaciones
        if (!guia || !bulto || !ubicacion || !fecha) {
            return res.status(400).json({ 
                error: 'Faltan campos requeridos: guia, bulto, ubicacion, fecha' 
            });
        }
        
        console.log('Recibiendo ubicación:', { guia, bulto, ubicacion, fecha });
        
        // Convertir fecha a Date object
        const fechaISO = parseDateTime(fecha);
        
        // Buscar o crear documento de guía
        let guiaDoc = await Guia.findOne({ guia: guia });
        
        if (!guiaDoc) {
            // Crear nueva guía
            guiaDoc = new Guia({
                guia: guia,
                bultos: [{
                    bulto: bulto,
                    ubicacion: ubicacion,
                    fecha: fecha,
                    fecha_iso: fechaISO
                }]
            });
        } else {
            // Buscar si el bulto ya existe
            const bultoIndex = guiaDoc.bultos.findIndex(b => b.bulto === bulto);
            
            if (bultoIndex !== -1) {
                // Actualizar bulto existente (sobrescribir ubicación)
                guiaDoc.bultos[bultoIndex].ubicacion = ubicacion;
                guiaDoc.bultos[bultoIndex].fecha = fecha;
                guiaDoc.bultos[bultoIndex].fecha_iso = fechaISO;
                console.log(`Actualizando bulto existente: ${bulto}`);
            } else {
                // Agregar nuevo bulto
                guiaDoc.bultos.push({
                    bulto: bulto,
                    ubicacion: ubicacion,
                    fecha: fecha,
                    fecha_iso: fechaISO
                });
                console.log(`Agregando nuevo bulto: ${bulto}`);
            }
        }
        
        // Guardar en base de datos
        await guiaDoc.save();
        
        console.log(`Ubicación guardada exitosamente: Guía ${guia}, Bulto ${bulto}, Ubicación ${ubicacion}`);
        
        res.status(201).json({ status: 'ok' });
        
    } catch (error) {
        console.error('Error guardando ubicación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/ubicaciones/:guia - Obtener todas las ubicaciones de una guía
app.get('/api/ubicaciones/:guia', authenticateAPI, async (req, res) => {
    try {
        const { guia } = req.params;
        
        if (!guia) {
            return res.status(400).json({ error: 'Guía requerida' });
        }
        
        const guiaDoc = await Guia.findOne({ guia: guia });
        
        if (!guiaDoc) {
            return res.status(404).json({ error: 'Guía no encontrada' });
        }
        
        // Formatear respuesta
        const response = {
            guia: guiaDoc.guia,
            bultos: guiaDoc.bultos.map(bulto => ({
                bulto: bulto.bulto,
                ubicacion: bulto.ubicacion,
                fecha: bulto.fecha
            }))
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error obteniendo ubicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/ubicaciones - Obtener todas las ubicaciones (opcional para administración)
app.get('/api/ubicaciones', authenticateAPI, async (req, res) => {
    try {
        const guias = await Guia.find({}).limit(100); // Limitar resultados
        
        const response = guias.map(guiaDoc => ({
            guia: guiaDoc.guia,
            bultos: guiaDoc.bultos.map(bulto => ({
                bulto: bulto.bulto,
                ubicacion: bulto.ubicacion,
                fecha: bulto.fecha
            }))
        }));
        
        res.json(response);
        
    } catch (error) {
        console.error('Error obteniendo todas las ubicaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función de limpieza de datos (45 días)
async function cleanupOldData() {
    try {
        console.log('Iniciando limpieza de datos antiguos...');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 45);
        
        console.log(`Eliminando bultos anteriores a: ${cutoffDate.toISOString()}`);
        
        const guias = await Guia.find({});
        let totalBultosEliminados = 0;
        let guiasEliminadas = 0;
        
        for (const guiaDoc of guias) {
            const bultosOriginales = guiaDoc.bultos.length;
            
            // Filtrar bultos que no han expirado
            guiaDoc.bultos = guiaDoc.bultos.filter(bulto => {
                return bulto.fecha_iso > cutoffDate;
            });
            
            const bultosEliminados = bultosOriginales - guiaDoc.bultos.length;
            totalBultosEliminados += bultosEliminados;
            
            if (guiaDoc.bultos.length === 0) {
                // Eliminar guía completa si no tiene bultos
                await Guia.deleteOne({ _id: guiaDoc._id });
                guiasEliminadas++;
                console.log(`Guía eliminada: ${guiaDoc.guia}`);
            } else if (bultosEliminados > 0) {
                // Guardar guía con bultos actualizados
                await guiaDoc.save();
                console.log(`Guía ${guiaDoc.guia}: eliminados ${bultosEliminados} bultos`);
            }
        }
        
        console.log(`Limpieza completada: ${totalBultosEliminados} bultos eliminados, ${guiasEliminadas} guías eliminadas`);
        
    } catch (error) {
        console.error('Error en limpieza de datos:', error);
    }
}

// Programar limpieza diaria a las 2:00 AM
cron.schedule('0 2 * * *', cleanupOldData, {
    timezone: process.env.TZ || 'America/Argentina/Buenos_Aires'
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
    console.error('Error no manejado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
    console.log(`Zona horaria: ${process.env.TZ}`);
    console.log(`MongoDB URI: ${process.env.MONGO_URI}`);
    console.log('Aplicación Ubicador de Bultos lista');
    
    // Ejecutar limpieza inicial en desarrollo (opcional)
    if (process.env.NODE_ENV !== 'production') {
        console.log('Modo desarrollo: ejecutando limpieza inicial en 5 segundos...');
        setTimeout(cleanupOldData, 5000);
    }
});

module.exports = app; 