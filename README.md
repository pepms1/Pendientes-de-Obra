# Pendientes de Obra (Web App)

Aplicación web simple para registrar pendientes de obra, con fecha automática y sincronización en la nube mediante Firebase Firestore.

## Configuración rápida

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Firestore Database** en modo de prueba o con reglas adecuadas.
3. Habilita **Authentication > Sign-in method > Anonymous**.
4. Crea una app web en tu proyecto y copia el `firebaseConfig`.
5. Abre `firebase-config.js` y reemplaza los valores de `firebaseConfig` por los de tu proyecto.

Si usas reglas de Firestore que requieren usuario autenticado (`request.auth != null`), la app iniciará sesión de forma anónima automáticamente.

## Uso local

Puedes abrir `index.html` directamente o levantar un servidor local:

```bash
python3 -m http.server 5173
```

Luego visita `http://localhost:5173`.

## Despliegue

Sube los archivos (`index.html`, `styles.css`, `app.js`, `firebase-config.js`) a Firebase Hosting, Netlify o Vercel para acceder desde celular y escritorio.

## Solución de errores comunes

- **`permission-denied`**: revisa reglas de Firestore y confirma que Authentication anónima esté habilitada.
- **`auth/unauthorized-domain`**: agrega tu dominio en `Authentication > Settings > Authorized domains` (incluye `localhost` si trabajas en local).
- **`auth/invalid-api-key` o `auth/app-not-authorized`**: vuelve a copiar `firebaseConfig` desde Firebase Console.
