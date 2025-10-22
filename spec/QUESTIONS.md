# Key Questions

## Product Strategy
1. **Primary Use Case**: El mejor caso de uso es la simplicidad:
- Que el usuario pulse las teclas
- Hable y se le copie al portapapeles
- Y si tiene alguna caja de texto activa, se pegue dentro

2. **Target Audience**: No, la aplicación tiene que ser sencilla, es casi plug-and-play, y es para usuarios super casuales.

3. **Integration Priority**: La más importante es:
- Grabado con pulsación de teclas
- Clipboard
- Keystroke simulation
- Selección de modelos
- Descarga de modelos
- Selección de idioma en el que el usuario habla

## Technical Architecture
4. **Model Selection**: Modelo de lo que debe seleccionar el usuario.Está guardado en la configuración el último que he usado.

5. **Offline Capability**: Es completamente online, solo necesita internet para descargarse los modelos.

6. **Resource Management**: No debería haber grabaciones simultáneas. Lo único que sí, si el audio es muy corto, debería de cortarse y no transcribirlo.

## User Experience
7. **Hotkey Strategy**: En principio, creo que es mantener para grabar.

8. **UI Positioning**: La ventana principal puede estar minimizada, pero el botón flotante debe estar alineado al centro y abajo, y ser lo mínimo posible.

9. **Feedback Mechanisms**: Sí, él debe demostrarte que estás grabando. Bueno, cualquier acción que esté realizando la aplicación sobre el tema de la grabación.

## Feature Scope
10. **Transcription History**: Debe tener un historial de transcripciones y, en principio, que el usuario lo borre. Y poder buscar no creo que sea necesario, solo ver de lo último grabado hasta lo primero grabado. Y sí poder copiar, borrar y descargarte el audio para comprobarlo.

11. **Multi-language Support**: En principio, el lenguaje del usuario se preselecciona desde la aplicación de configuración.

12. **Audio Quality**: Si debería haber reducción, normalización y no, cortado de silencio puede que sí, cortado de silencio también.

## Performance & Reliability
13. **Error Recovery**: Debería demostrar un error: el error que haya ocurrido en la ventana flotante.

14. **Resource Limits**: Esto no lo tengo claro.

15. **Cross-platform**: Sí, la aplicación va a estar disponible para Windows, Mac y Linux, pero principalmente para Mac.
