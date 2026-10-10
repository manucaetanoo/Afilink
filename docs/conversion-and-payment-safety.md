# Conversión y seguridad de pagos

## Etapa 1: intentos y reintentos

- `PaymentAttempt` conserva una clave UUID estable por intento, su hash y el resultado del proveedor. No guarda tokens ni datos de tarjeta. La clave se envía como `X-Idempotency-Key` a Mercado Pago.
- Las transacciones serializables preparan y reclaman un único intento activo por orden. Las llamadas externas quedan fuera de esas transacciones. Una confirmación concurrente recibe `processing`; no crea otro cobro.
- Un rechazo/cancelación del intento conserva la orden y sus comisiones pendientes. El siguiente medio recibe otro intento. Órdenes rechazadas por la versión anterior pueden reabrirse manteniendo sus importes y atribución; las cancelaciones administrativas y devoluciones siguen bloqueadas.
- Tras un rechazo confirmado, el callback del Brick rechaza su promesa y el formulario se desmonta y vuelve a crearse. El comprador conserva la orden y sus datos de contacto, puede cambiar de medio y volver a pagar sin recargar. El siguiente envío prepara otro intento y utiliza un token nuevo. También se reinicia cuando la consulta de estado confirma el rechazo de un envío incierto.
- Una respuesta anterior de confirmación o consulta no sobrescribe el estado cuando su intento ya fue liberado o reemplazado. Así, una respuesta tardía de “pendiente” no oculta otra vez el formulario después de verificar el rechazo.
- Un pago pendiente o un resultado incierto bloquea nuevos intentos. Se puede consultar su estado. Si se perdió la respuesta, el mismo envío conservado en el navegador puede reenviarse con la misma clave y los mismos datos. Tras un reinicio del servidor, una reclamación expira a los 60 segundos y permite repetir **ese mismo intento**, siempre con la misma clave.
- Si el navegador se cerró y el proveedor no devuelve un resultado, se mantiene la orden en verificación. Una búsqueda vacía no demuestra que no se haya cobrado. Requiere reconciliación con Mercado Pago antes de autorizar otro pago.
- `checkoutId` identifica un checkout y tiene una restricción única derivada en `Order.checkoutKey`. Un reenvío, una preferencia fallida o el vencimiento de la sesión no generan otra orden para ese checkout. Compartir la URL de checkout implica compartir la misma compra; para promocionar se deben usar los enlaces de afiliado.
- La preferencia se conserva en la orden. Wallet usa la redirección nativa del Brick; su envío se reserva antes de resolver el callback y no se libera una segunda redirección aunque expire la reclamación. Se reconcilia con el proveedor al volver y por webhook. No se envía Wallet como un pago de tarjeta.
- Los pagos se asocian primero por ID o metadata de intento. Para Wallet, que carece de esa metadata, se exige una fecha de creación posterior a su envío. Un rechazo antiguo no se asocia al intento actual ni libera su bloqueo.
- Se consulta `/v1/payments/{id}` antes de aprobar una compra, y se verifica referencia, importe y moneda. El endpoint administrativo de pago también exige esa verificación; se elimina la aprobación ficticia.
- La aprobación y el evento de compra se registran en la misma transacción que las comisiones. Webhooks repetidos no vuelven a aprobar comisiones ni a enviar notificaciones. Eventos tardíos de otros intentos no revierten una venta pagada.

## Etapa 2: embudo y sesiones

Se reutilizan `Click`, `CampaignClick`, `Order`, GA4 y Meta Pixel. Se añaden `sessionId` a los registros existentes y una sola tabla `PurchaseEvent` para las etapas que antes no se guardaban. No hay tabla de usuarios o sesiones adicional.

La cookie anónima `afilink_session` es HttpOnly, SameSite=Lax, Secure en producción y dura 30 minutos de inactividad. Se establece en la respuesta del documento antes de los eventos paralelos. Es una sesión de navegador, no una persona; dispositivos distintos o borrado de cookies generan sesiones diferentes. Los clics originales se conservan y los históricos sin sesión se muestran aparte.

Etapas: ficha, Comprar ahora, checkout, datos confirmados, Brick listo, pago enviado, pago pendiente/rechazado y compra aprobada. Los eventos de interfaz deduplican por sesión y producto/orden; envíos por intento y aprobaciones por orden. El navegador no puede registrar una aprobación mediante el endpoint de Analytics. No se envían valores de formulario a GA4, Meta o PurchaseEvent.

GA4 recibe view_item, buy_now_click, begin_checkout, add_payment_info, checkout_error y purchase; Meta recibe ViewContent, InitiateCheckout, AddPaymentInfo y Purchase mediante su inicialización existente. Purchase utiliza transaction_id/eventID y se envía desde una página que contiene una orden verificada. La medición del administrador es del servidor: no depende de que el comprador vuelva a esa página ni de bloqueadores externos.

El administrador incorpora filtros de período, producto y dispositivo. El embudo usa una cohorte de sesiones que visitaron una ficha, y cuenta etapas posteriores para el mismo producto. Muestra órdenes sin pago iniciado, abandonadas, en verificación, pendientes, rechazadas, aprobadas y canceladas. El abandono se estima después de 24 horas sin enviar un pago; no modifica estados comerciales. Las ventas históricas sin marca de verificación nueva se muestran aparte en estas métricas. No se reconstruyen sesiones históricas.

## Migración y despliegue

La migración `20261009000000_payment_attempts_purchase_funnel` es aditiva: dos tablas necesarias, columnas opcionales e índices; conserva importes, referencias y enums de órdenes/comisiones. Se generó mediante comparación de archivos, sin conectar ni aplicar cambios a una base.

Antes de desplegar: aplicar y verificar esta migración en una rama de Neon de pruebas, regenerar Prisma y ejecutar las pruebas. El código requiere el nuevo esquema. La migración en producción requiere autorización explícita; no fue ejecutada. No usar `db push` ni `migrate dev` sobre producción.

Para el entorno de pagos, comprobar APP_URL HTTPS, clave pública y token de la misma cuenta/entorno, moneda UYU, notificaciones y MERCADOPAGO_WEBHOOK_SECRET. Las rutas de retorno no confían en parámetros de aprobación del navegador.

## Verificación

- `npm run test:conversion`: fixtures de proveedor y almacenamiento; rechazos, otro medio, importes, respuesta perdida, clave estable, confirmaciones HTTP simultáneas/repetidas, webhooks concurrentes, atribución, comisiones, saldos, Analytics y sesiones. No conecta a bases ni hace pagos.
- `npm run test:checkout-browser`: componente real del checkout con servidor/Brick simulados, a 360, 390, 768 y 1280 píxeles; desbordamiento, doble envío, rechazos consecutivos por fondos, riesgo, error genérico y código de seguridad, formulario reiniciado y nuevos tokens/intentos sin recargar, pérdida de conexión, pago pendiente y preferencia fallida. Requiere Playwright; `AFILINK_PLAYWRIGHT_PATH` y `AFILINK_BROWSER_PATH` pueden indicar el módulo y navegador instalados.
- `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build`.

Pendiente antes de producción: ejecutar migración y pruebas de concurrencia contra PostgreSQL/Neon de pruebas; probar el SDK real con tarjetas de prueba, Wallet y medios disponibles para la cuenta; comprobar recepción de webhooks, errores de credenciales y eventos en GA4/Meta. Después, un pago real controlado requiere verificar importe, atribución, aprobación única, acceso, emails y comisión. Las pruebas de navegador no simulan los formularios internos reales de Mercado Pago ni certifican Safari/iOS.

Referencias del proveedor: [idempotencia en pagos con tarjeta](https://www.mercadopago.com.uy/developers/es/docs/checkout-bricks/payment-brick/payment-submission/cards), [callback de Wallet](https://www.mercadopago.com.uy/developers/en/docs/checkout-bricks/payment-brick/advanced-features/additional-data).
