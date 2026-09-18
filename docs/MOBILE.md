# Versión para celular

CHUBOL funciona en el celular por el navegador, y se puede **instalar** en la
pantalla de inicio como una app. No hace falta tienda ni cuenta.

## Cómo probarlo en tu teléfono

1. En la compu: `pnpm build && pnpm celular`
2. Fijate la IP que imprime (algo como `http://192.168.0.5:4173/`).
3. Entrá a esa dirección desde el celular, con los dos en la misma red wifi.

**Ojo con `pnpm preview -- --host`: no funciona.** pnpm le pasa a vite los dos
argumentos literales `--` y `--host`, así que el flag nunca llega y el servidor
queda escuchando sólo en `localhost`. Desde el teléfono no carga nada y parece un
problema de red. Por eso existe `pnpm celular`, que es el mismo preview con
`--host 0.0.0.0` ya puesto.

## Instalarlo en la pantalla de inicio

Con esto queda como una app: ícono propio (el aro de tu cancha), pantalla
completa, sin barra del navegador, y funciona sin internet.

Pero **sobre `http://192.168.x.x` no se puede instalar**, y no es un bug del
juego: el navegador sólo registra un service worker en un *contexto seguro*, que
es HTTPS o `localhost`. Una IP de red local no es ninguna de las dos. Por wifi el
juego se abre y se juega perfecto; lo que no anda es instalarlo ni jugar sin
conexión.

Para que se pueda instalar hace falta servirlo por HTTPS. La forma más corta es
un túnel (`npx cloudflared tunnel --url http://localhost:4173`), que da una URL
`https://…` temporal. **Eso publica el juego en internet mientras el túnel esté
abierto**, así que decidilo vos: el archivo del encargo dice que no lo publique
por mi cuenta, y no lo hice.

## Controles con el dedo

No hay joystick virtual, y es a propósito: sólo hay siete lugares desde donde se
tira, así que caminar libre no aporta nada.

| Gesto | Qué hace |
|---|---|
| Tocar una marca | El jugador camina solo hasta ahí |
| Tocar cualquier parte de la cancha | Camina hasta ese punto |
| Mantener **TIRAR** | Carga la barra |
| Soltar **TIRAR** | Tira |
| Tocar la pelota | Va a buscarla |
| Botón **II** arriba a la derecha | Pausa |

El teclado sigue andando igual en la compu: WASD o flechas, ESPACIO y ESC.

El botón de tirar dice en qué estado estás: `TIRAR 5` cuando estás parado en una
marca lista, `ANDÁ A UNA MARCA` cuando no, `BUSCÁ LA PELOTA` mientras te falta
recuperarla, y `SOLTÁ` mientras cargás.

## Por qué el lienzo es más ancho que el arte

El arte es 3:2 y no se puede estirar ni recortar. Un celular apaisado es mucho
más ancho que eso, así que la lámina quedaría entre dos barras negras muertas.

El lienzo lógico es **1920 × 1024** con la lámina de 1536 × 1024 centrada. Esas
franjas de 192 px a cada lado dejan de ser barras muertas y pasan a ser la
interfaz: reloj, marcas que faltan y puntaje a la izquierda; pausa y botón de
tiro a la derecha. **La cancha queda limpia.**

La barra de carga es vertical y está justo arriba del botón, para que el pulgar y
el ojo estén en el mismo lugar.

Cuánta pantalla se usa, medido:

| Dispositivo | Antes | Ahora |
|---|---|---|
| iPhone 14 apaisado | 69% | **87%** |
| Pixel 7 apaisado | 68% | **84%** |
| iPad apaisado | 96% | 77% |

El iPad pierde algo porque su pantalla es menos alargada; a cambio gana los
márgenes de interfaz. Es el compromiso de tener un lienzo fijo, que es lo que
mantiene el render nítido en pantallas de alta densidad.

## Vertical no

La cancha no entra en vertical sin recortar el aro o el logo, así que en esa
orientación el juego muestra **GIRÁ EL TELÉFONO**. Es CSS puro, sólo se activa en
pantallas táctiles: una ventana angosta en la compu se sigue jugando igual.

## Memoria de textura

Las dos capas de oclusión se guardaban como imágenes de 1536 × 1024 completas
aunque estuvieran casi vacías. Recortadas a su contenido:

| Capa | Antes | Ahora |
|---|---|---|
| Pared del frente | 6,0 MB | 1,38 MB |
| Frente del aro | 6,0 MB | 0,03 MB |

Son 12 MB menos de textura, que en un celular de gama baja se nota. Lo hace
`node scripts/cutLayers.mjs`, que además imprime los offsets para pegar en
`src/game/config/court.ts`.

## Sin conexión

El service worker se genera en el build con la lista de archivos realmente
emitidos, así que no puede desfasarse. Estrategia: la página va primero a la red
y cae a la caché; el resto va primero a la caché.

Un detalle que costó encontrar y conviene no perder: **hay que ignorar `Vary` al
buscar en la caché**. Muchos hostings responden `Vary: Origin`, y un módulo de
JavaScript se pide en modo CORS, así que lleva un header `Origin` que la copia
precargada no tiene. Con `Vary` respetado esos dos nunca coinciden, el script no
se encuentra en la caché y el juego no arranca sin internet — justo el caso para
el que existe el worker.

## Cómo verificarlo

```bash
pnpm capture:mobile   # capturas en cuatro tamaños de pantalla
pnpm test:touch       # juega un tiro completo con toques reales, sin teclado
pnpm test:pwa         # manifest, service worker y arranque sin conexión
```

`test:touch` usa eventos táctiles de verdad (por CDP), no clics de mouse, así que
comprueba que se juega con el dedo y no sólo con un puntero en una ventana chica.

## Si algún día querés que esté en Play Store

**Capacitor** envuelve exactamente este mismo build en un APK sin reescribir
nada. Es un paso posterior: la PWA ya cubre instalarlo, jugarlo sin conexión y
compartirlo por link.

## Lo que no pude medir

**El rendimiento real en un teléfono.** Mis mediciones corren con render por
software y no dicen nada sobre una GPU de celular. Lo que sí mejoró de forma
comprobable es la memoria de textura (12 MB menos). Hay que abrirlo en tu
teléfono y mirarlo ahí.
