# Pendientes de Obra (Web App)

Aplicación web simple para registrar pendientes de obra, con fecha automática y sincronización en la nube mediante Firebase Firestore.

## Configuración rápida

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Firestore Database** en modo de prueba o con reglas adecuadas.
3. Crea una app web en tu proyecto y copia el `firebaseConfig`.
4. Abre `app.js` y reemplaza los valores de `firebaseConfig` por los de tu proyecto.

## Uso local

Puedes abrir `index.html` directamente o levantar un servidor local:

```bash
python3 -m http.server 5173
```

Luego visita `http://localhost:5173`.

## Despliegue

Sube los archivos (`index.html`, `styles.css`, `app.js`) a Firebase Hosting, Netlify o Vercel para acceder desde celular y escritorio.
