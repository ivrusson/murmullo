#!/bin/bash

# Script para ejecutar la aplicación y capturar logs
echo "🚀 Ejecutando Murmullo y capturando logs..."
echo "============================================="

echo ""
echo "📋 Instrucciones:"
echo "1. La aplicación se ejecutará en segundo plano"
echo "2. Los logs aparecerán aquí"
echo "3. Presiona Ctrl+C para detener"
echo ""

echo "🔍 Ejecutando aplicación..."
echo ""

# Ejecutar la aplicación y mostrar logs en tiempo real
cd /Users/ivanrubiosubsierra/murmullo
./src-tauri/target/release/murmullo 2>&1 | tee murmullo.log
