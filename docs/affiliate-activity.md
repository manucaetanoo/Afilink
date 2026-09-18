# Actividad de afiliados

La ruta `/admin/affiliates` y sus consultas requieren una sesión con rol `ADMIN`.
Está enlazada desde la navegación de administración de escritorio y móvil.
Seleccionar el vendedor y el período; para investigar los 571 clics informados,
seleccionar `mcouruguay1@gmail.com` y «Últimos 30 días» en producción.
La base local no permite verificar ese total ni determinar cuántas cuentas lo generaron.

## Alcance y cálculo

- Se conserva el alcance de «Tus afiliados» del vendedor: `Click` de enlaces de
  productos cuyo `sellerId` coincide con el seleccionado. No incluye `CampaignClick`.
- Comparte con el panel de vendedor las funciones de alcance y fechas. Los rangos
  de 7, 30 y 90 días son ventanas móviles de días de 24 horas hasta el instante
  de la consulta, con extremos incluidos. «Todo el historial» no tiene límite inferior.
- No se excluyen productos ni cuentas inactivos: la métrica original tampoco lo hace.
- Cada `affiliateId` con al menos un clic aporta una fila; se suman todos sus enlaces.
  Los nombres iguales no se fusionan. Cuentas distintas de una misma persona no
  pueden identificarse como una sola persona con este modelo.
- «Enlaces con clics» cuenta enlaces con actividad dentro del período. «Último clic»
  usa la última fecha dentro del mismo período, mostrada en hora de Uruguay.
- El total de clics es la suma de todas las filas, sin truncar el listado.
- Las estadísticas del afiliado siguen filtradas por el ID de su propia sesión.

## Registro y filtros existentes

`Click` y `CampaignClick` guardan un registro por evento con `createdAt`, `linkId`,
IP y User-Agent opcionales. No son contadores acumulados; no se necesita migración.

- **Propios:** no se compara la identidad del visitante con el dueño del enlace.
  Se cuentan. Tampoco se guarda un ID de visitante autenticado para excluirlos
  de forma fiable a posteriori.
- **Repetidos:** cada acceso a `/l/[code]` o `/cl/[code]` puede generar otro evento.
  No hay deduplicación por IP, navegador ni ventana temporal.
- **Checkout:** `/api/checkout` reutiliza el clic de la cookie si pertenece al
  mismo enlace. Si recibe una referencia válida para ese producto y no hay un
  clic de cookie coincidente, crea otro. Es una reutilización puntual, no un filtro
  general de visitas repetidas.
- **Bots en productos:** `/l/[code]` no registra User-Agents que coincidan con
  `facebookexternalhit`, `facebot`, `twitterbot`, `linkedinbot`, `whatsapp`,
  `telegrambot`, `slackbot`, `discordbot`, `pinterest`, `googlebot` o `bingbot`
  (sin distinguir mayúsculas). No detecta todos los bots y acepta agentes ausentes.
- **Otras entradas:** ni campañas ni el registro alternativo de checkout aplican
  ese filtro de bots. Las campañas sí deben existir, estar activas y estar vigentes.
- **Consulta del panel:** no vuelve a filtrar bots, propios ni repeticiones históricos.
  Agregar esos filtros ahora cambiaría la definición del total que se quiere explicar.

Los 571 clics son una referencia del panel de producción en un momento determinado.
Una ventana móvil consultada después puede arrojar otro total.

## Validación

`node scripts/check-affiliate-activity.cjs` comprueba autorización antes de consultas,
alcance por vendedor, períodos compartidos entre conteos y último clic, agrupación,
homónimos, orden y resultados vacíos. Sus 571 clics son datos sintéticos de prueba,
no una medición de producción. Las regresiones de los paneles se ejecutan con
`scripts/check-affiliate-dashboard.cjs` y `scripts/check-seller-dashboard.cjs`.
