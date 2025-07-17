#!/bin/bash

# Script de pruebas para el modo demo de Ubicador de Bultos

echo "🧪 ==============================================="
echo "🚀 SCRIPT DE PRUEBAS - UBICADOR DE BULTOS DEMO"
echo "🧪 ==============================================="
echo ""

API_KEY="ubi-write-2025-secure-key-789xyz"
BASE_URL="http://localhost:3000"

echo "📡 Probando conexión al servidor..."
HEALTH=$(curl -s $BASE_URL/api/health)
echo "   Respuesta: $HEALTH"
echo ""

echo "📦 Probando ubicación de bultos..."
echo ""

echo "1️⃣ Ubicando bulto 001 de guía 999012345678 en ubicación A1..."
curl -s -X POST $BASE_URL/api/ubicaciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "guia": "999012345678",
    "bulto": "001",
    "ubicacion": "A1",
    "fecha": "16/07/2025 21:30"
  }' | jq .
echo ""

echo "2️⃣ Ubicando bulto 002 de guía 999012345678 en ubicación B3..."
curl -s -X POST $BASE_URL/api/ubicaciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "guia": "999012345678",
    "bulto": "002",
    "ubicacion": "B3",
    "fecha": "16/07/2025 21:31"
  }' | jq .
echo ""

echo "3️⃣ Ubicando bulto 001 de guía 999087654321 en ubicación C5..."
curl -s -X POST $BASE_URL/api/ubicaciones \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "guia": "999087654321",
    "bulto": "001",
    "ubicacion": "C5",
    "fecha": "16/07/2025 21:32"
  }' | jq .
echo ""

echo "🔍 Consultando ubicaciones de guía 999012345678..."
curl -s $BASE_URL/api/ubicaciones/999012345678 \
  -H "x-api-key: $API_KEY" | jq .
echo ""

echo "📊 Consultando todas las ubicaciones..."
curl -s $BASE_URL/api/ubicaciones \
  -H "x-api-key: $API_KEY" | jq .
echo ""

echo "💾 Viendo almacenamiento interno (solo demo)..."
curl -s $BASE_URL/api/demo/storage | jq .
echo ""

echo "✅ ==============================================="
echo "🎉 PRUEBAS COMPLETADAS"
echo "✅ ==============================================="
echo ""
echo "🌐 Interfaz web: $BASE_URL"
echo "🔧 Modo: DEMO (almacenamiento en memoria)"
echo ""
echo "📋 Para probar la interfaz web:"
echo "   1. Abre: $BASE_URL"
echo "   2. Escanea ubicación: UBI A1"
echo "   3. Escanea bulto: 04000009405999028318869001"
echo "   4. Observa el feedback visual y mensajes"
echo ""
echo "🛑 Para detener el servidor: Ctrl+C en la terminal donde está corriendo" 