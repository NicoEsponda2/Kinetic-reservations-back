<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# KR Back desarrollado en Nest

1. Levantar la base de datos
2. ``` docker-compose up -d ```
3. Clonar el archivo ``` .env.template ``` y renombrarlo a ```.env```
4. Cambiar las variables de entorno
5. Levantar la base de datos ``` docker-compose up -d```
6. Levantar el servidor ```npm run start:dev```
7. Cargar los datos de prueba ```http://localhost:3000/api/seed``

## Documentación de la API

Swagger UI está disponible en `http://localhost:3000/api/docs` y el documento
OpenAPI en `http://localhost:3000/api/docs-json`. Las rutas se agrupan por
módulo e incluyen parámetros, cuerpos, respuestas y autenticación cuando
corresponde. Para probar rutas protegidas, usa **Autorizar (`Authorize`)** con el JWT
obtenido en `POST /api/auth/login`.

Los módulos `Canchas` y `Almacenamiento en Cloudinary` no exponen rutas HTTP propias; sus
operaciones se realizan a través de otros controladores. Las rutas etiquetadas
como marcadores de posición todavía no consultan ni modifican la base de datos.
La documentación indica también qué rutas históricas son públicas actualmente.

## API para la aplicación móvil

Las rutas exclusivas del cliente móvil se identifican con el segmento
`mobile` y con la etiqueta `Aplicación móvil` en Swagger.

### Inicio móvil

```http
GET /api/user/mobile/dashboard
Authorization: Bearer <token>
X-Client-Platform: mobile
```

El usuario se obtiene exclusivamente desde el JWT; esta ruta no recibe un UUID
por URL. Devuelve `ok: true`, `client: "mobile"`, las próximas reservas y las
métricas mensuales. La ruta web anterior se mantiene sin cambios.

