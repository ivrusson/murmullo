#!/usr/bin/env node

/**
 * Script para generar iconos de Tauri
 * Uso: node generate-icons.js [ruta-al-icono-base]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const sourceIcon = process.argv[2] || './assets/murmullo-icon.svg';
const outputDir = './src-tauri/icons';

console.log('🎨 Generando iconos de Tauri...');
console.log(`📁 Icono fuente: ${sourceIcon}`);
console.log(`📁 Directorio de salida: ${outputDir}`);

// Verificar que existe el icono fuente
if (!fs.existsSync(sourceIcon)) {
    console.error(`❌ Error: No se encontró el icono fuente en ${sourceIcon}`);
    console.log('💡 Usa el SVG de Murmullo: ./assets/murmullo-icon.svg');
    console.log('💡 O pasa la ruta como parámetro: node generate-icons.js /ruta/a/tu/icono.svg');
    process.exit(1);
}

// Crear directorio de salida si no existe
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

try {
    // Generar todos los iconos usando el CLI de Tauri
    console.log('🔄 Generando iconos con Tauri CLI...');
    
    const command = `npx @tauri-apps/cli icon "${sourceIcon}" --output "${outputDir}" --verbose`;
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ ¡Iconos generados exitosamente!');
    console.log(`📋 Iconos creados en: ${outputDir}`);
    console.log('');
    console.log('📝 Iconos generados:');
    
    // Listar archivos generados
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(1);
        console.log(`  📄 ${file} (${size} KB)`);
    });
    
    console.log('');
    console.log('🎯 Próximos pasos:');
    console.log('1. Verifica que todos los iconos se generaron correctamente');
    console.log('2. Ejecuta "pnpm tauri build" para compilar la aplicación');
    console.log('3. Los iconos se usarán automáticamente en la aplicación');
    
} catch (error) {
    console.error('❌ Error al generar los iconos:', error.message);
    process.exit(1);
}
