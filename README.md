# Cuentero-Salinas

Aplicación móvil creada con React Native y Expo para guardar cuentos de la selva amazónica sin internet ni servidor.

## Funcionalidades realizadas

- Crear, listar, editar y borrar cuentos.
- Persistencia local con SQLite.
- Contador de cuentos.
- Contador de palabras en el editor.
- Vista previa del contenido en cada tarjeta.
- Confirmación al salir sin guardar.
- Autoguardado después de 3 segundos de inactividad.
- Buscador por título usando SQL.
- Marcar cuentos como favoritos.
- Etiquetas para los seres míticos.
- Modo claro y modo oscuro.
- Exportación de todos los cuentos a un archivo Markdown.
- Tres cuentos iniciales: El Chullachaqui, Leyenda del Ayaymama y El Yacuruna.

## Capturas de pantalla

Capturas De Funciones De la App

### Lista de cuentos

![Lista de cuentos](docs/capturas/lista.png)

### Editor y contador de palabras

![Editor](docs/capturas/editor.png)

### Buscador y favoritos

![Buscador y favoritos](docs/capturas/buscador-favoritos.png)

### Etiquetas y modo oscuro

![Etiquetas y modo oscuro](docs/capturas/etiquetas-modo-oscuro.png)

### Exportación de cuentos

![Exportación](docs/capturas/exportacion.png)

## Requisitos

- Node.js 20 LTS o superior.
- npm.
- Expo Go instalado en un celular Android o iOS.
- Computadora y celular conectados a la misma red Wi-Fi.

## Instalación y ejecución

```bash
npm install
npx expo start
```

Escanea el código QR con Expo Go. Si la red local no conecta, ejecuta:

```bash
npx expo start --tunnel
```

Para limpiar la caché de Expo:

```bash
npx expo start -c
```

## Autor

Salinas

