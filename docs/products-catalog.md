# Búsqueda y categorías del catálogo

`/products` permite buscar por nombre y descripción, combinar la búsqueda con una categoría y recorrer los resultados. La búsqueda se envía con Enter o con el botón Buscar. Cambiar la búsqueda o la categoría vuelve a la primera página. La URL conserva `q`, `category` y `page` para compartir, recargar y navegar hacia atrás.

Mayor comisión es la opción predeterminada: ordena por porcentaje de comisión de mayor a menor, luego fecha de publicación e ID para desempatar. Las categorías también usan ese orden. Todos muestra las publicaciones más recientes. Todas las opciones solamente incluyen productos activos. Limpiar filtros vuelve a Mayor comisión. Recomendado e Idiomas no aparecen entre los filtros; sus URLs anteriores vuelven al orden predeterminado.

Desarrollo y bienestar reúne los productos de salud, bienestar y desarrollo personal. El filtro incluye tanto `bienestar` como la antigua categoría `desarrollo-personal`, y los enlaces antiguos de desarrollo personal abren el filtro unificado. Los formularios, las tarjetas y la API usan la categoría unificada para las publicaciones nuevas o editadas, sin requerir otra migración para agrupar las existentes.

Los vendedores seleccionan la categoría al crear o editar un producto. Las opciones se definen en `lib/product-categories.ts`; la API rechaza categorías desconocidas. Los clientes antiguos que omiten la categoría al crear un producto reciben la categoría Otros.

## Activación

Antes de desplegar el código, aplicar la migración `20261015000000_product_categories` en la base de datos de destino siguiendo el proceso habitual del proyecto:

```sh
npx prisma migrate deploy
npx prisma generate
```

Revisar primero las migraciones pendientes con `npx prisma migrate status`. La migración agrega la columna e índice de categorías y clasifica las publicaciones existentes por palabras del título. Los títulos que no coinciden quedan en Otros. Conviene revisar esa clasificación desde el editor de productos.

## Verificación

```sh
npm run test:catalog
npx tsc --noEmit
npm run test:catalog-browser
```

La prueba de navegador usa los componentes reales con datos y navegación simulados, sin conectarse a la base de datos. Requiere Playwright y Chromium. Se pueden indicar sus rutas mediante `AFILINK_PLAYWRIGHT_PATH` y `AFILINK_BROWSER_PATH`; `AFILINK_CATALOG_SCREENSHOT_DIR` habilita capturas. Comprueba búsqueda, filtros, paginación, ausencia de resultados, limpieza, atrás/recarga y desbordamiento horizontal en 360, 768 y 1280 px.
