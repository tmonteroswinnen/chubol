# Arquitectura

## Inspección previa

El repositorio estaba prácticamente vacío: sólo `README.md` (un commit inicial) y
el `.md` con el enunciado, sin commitear. No había `package.json`, ni lockfile, ni
carpeta `references/`, ni ningún recurso gráfico.

Después llegaron las tres referencias y una lámina limpia de la cancha, y el
juego se recalibró contra ellas. Ver `docs/VISUAL_SPEC.md`.

Herramientas realmente disponibles, verificadas: Node 20.19.5, pnpm 9.15.9, Git,
Chrome y Edge instalados. **No hay** generación de imágenes, edición generativa,
Blender ni servicios externos.

Como no había stack que respetar, se armó uno nuevo.

## Stack

| Capa | Elección | Versión | Por qué |
|---|---|---|---|
| Lenguaje | TypeScript estricto | 5.9.3 | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Bundler | Vite | 8.3.0 | Arranque rápido, sin configuración |
| Motor | Phaser | 4.2.1 | Escenas, entrada, texturas, escalado |
| Pruebas | Vitest | 5.0.1 | Corre el dominio y la física sin renderer |
| Capturas | playwright-core | 1.63.0 | Maneja el Chrome del sistema; no descarga navegadores |

Un solo lockfile (`pnpm-lock.yaml`). Las versiones se consultaron al registry en
el momento de instalar, no de memoria. La API de Phaser 4 se verificó contra los
tipos y contra la guía de migración v3→v4 que el propio paquete incluye
(`node_modules/phaser/skills/`), no contra recuerdos de la v3.

## Técnica de render: 2.5D con cámara fija

**Decisión:** escenario en capas de pixel art, entidades como sprites, cámara fija
y una proyección de cámara real para posicionarlas.

**Por qué no 3D:** reconstruir el patio con primitivas 3D destruiría el parecido
con una ilustración pixel art y convertiría esta primera versión en un proyecto
mucho mayor, sin poder demostrar el mismo acabado. No hay una base 3D existente
que lo justifique.

**Por qué no un simple plano 2D:** la pelota tiene altura y el aro está a más de
dos metros. Una homografía del suelo sola no define esa dimensión.

### Calibración contra el arte

La cámara **no se elige, se mide**. El proceso, reproducible:

| Script | Qué hace |
|---|---|
| `scripts/png.mjs` | Lee y escribe PNG con `zlib` de Node, sin dependencias |
| `scripts/crop.mjs` | Recorta y amplía zonas de la lámina con una grilla, para medir a mano |
| `scripts/landmarks.mjs` | Encuentra la pintura de la cancha por color y componentes conexas |
| `scripts/fitCamera.mjs` | Resuelve los 17 parámetros de cámara y geometría por Nelder-Mead |
| `scripts/cutLayers.mjs` | Recorta de la lámina el primer plano y el frente del aro |
| `scripts/worldPoints.mjs` | Proyecta puntos de pantalla al mundo, para ubicar el resto |

`fitCamera.mjs` llega a **5,5 px RMS sobre el plano del suelo**. Los valores que
imprime se pegan en `src/game/config/court.ts`. Hay una prueba
(`tests/projection.test.ts`) que falla si la cámara se desalinea de los números
pintados.

### La proyección

`src/game/sim/projection.ts` implementa una **cámara pinhole completa**: proyecta
cualquier punto `(x, y, z)` del mundo. Eso resuelve el plano del suelo **y** la
altura de forma explícita y consistente con el aro y las verticales, que es
justamente lo que una homografía sola no hace.

Ejes del mundo, en metros:

```
+x  a lo largo de la cancha, alejándose del aro   (hacia la derecha en pantalla)
+y  en profundidad, hacia los cipreses
+z  hacia arriba
```

La distancia focal y el punto principal **no se fijan a mano ni se derivan de un
encuadre**: salen del ajuste contra la lámina (`CALIBRATION` en
`src/game/config/court.ts`). El lienzo lógico es fijo (1536 × 1024, igual que la
lámina) y el escalador de Phaser pone márgenes, así que **agrandar la ventana no
puede mover una marca de tiro ni cambiar un resultado**. Hay una prueba que lo
verifica.

`groundFromScreen()` hace la inversa sobre el suelo y `planeFromScreen()` sobre
cualquier plano horizontal — con eso se ubicaron la pelota y los personajes de la
referencia, que están a distintas alturas.

### Escala de los sprites

La lámina es una ilustración a 1536 × 1024, no una grilla de píxel gruesa, así que
los sprites se dibujan una sola vez a tamaño canónico y se escalan suavemente con
la profundidad. Una versión anterior generaba varios tamaños enteros para
preservar una grilla de píxel; con este arte eso no corresponde.

## Estructura

```
references/                  las tres imágenes de referencia
public/assets/
  backgrounds/               la lámina y el primer plano recortado de ella
  props/                     frente del aro recortado de la lámina
  characters/ audio/         lo que todavía falta producir
scripts/
  png.mjs crop.mjs           lectura/escritura de PNG y recortes ampliados
  landmarks.mjs              detección de la pintura de la cancha
  fitCamera.mjs              ajuste de cámara contra la lámina
  cutLayers.mjs              recorte de las capas de oclusión
  worldPoints.mjs            pantalla -> mundo, para ubicar objetos
  viteChubolAssets.ts        plugin: arma el manifiesto de archivos en el build
  capture.mjs                capturas reales y revisión de consola con Chrome
src/
  main.ts                    configuración del juego
  game/
    config/
      court.ts               cámara calibrada, geometría y las siete marcas
      gameplay.ts            física, sensación de tiro, reglas por defecto
    domain/                  reglas puras, sin renderer
      match.ts               parejas, minuto, vuelta obligatoria, resultado
      practice.ts            sesión de práctica
      spots.ts               qué marca se está pisando
    sim/
      projection.ts          cámara pinhole, suelo + altura
      ball.ts                vuelo, contactos, enceste, perfil de tiro
    render/
      palette.ts pixelCanvas.ts
      characters.ts objects.ts   sprites provisionales (adultos y pelota)
      textures.ts            construye y registra las texturas generadas
      courtView.ts           composición, profundidad, oclusión
      hud.ts ui.ts audio.ts
    scenes/
      BootScene MenuScene GameScene ResultScene CompareScene
    assets/manifest.ts       qué recurso existe y cuál falta
tests/                       dominio, física y proyección, sin renderer
docs/
```

La regla que separa las capas: **el dominio y la simulación no importan Phaser**.
Por eso las pruebas corren en Node sin levantar el renderer.

## Máquina de estados de una partida

En `GameScene`:

```
positioning → charging → flight → retrieving → positioning
                                            ↘ (se acabó el minuto)
                                              turnBreak → positioning (otra pareja)
                                                        → Result
```

- `positioning`: el tirador tiene la pelota y camina.
- `charging`: la barra barre; al soltar se lanza.
- `flight`: vuela la pelota; la física resuelve el intento.
- `retrieving`: la pelota quedó en el pasto y hay que ir a buscarla. **El reloj
  sigue corriendo**: es la parte de "hay que ir a buscarla rápido para no perder
  tiempo".
- `turnBreak`: se acabó el minuto, cambio de pareja.

La pausa (`ESC`) suspende reloj, física y entrada de juego sin perder estado.

Garantías: un intento no puede resolverse dos veces (`ShotSimulation` es dueño de
su resolución y `Match` verifica el identificador), no se puede empezar un tiro
con otro en el aire, el valor se congela al soltar la pelota, y no hay estados sin
salida — incluso un empate repetido termina, en vez de repartir turnos para
siempre.

## Física

`src/game/sim/ball.ts`, todo en `src/game/config/gameplay.ts`.

- Integración a **paso fijo** de 1/240 s con acumulador: la trayectoria y el
  resultado son idénticos a 30, 60 o 144 fps. Hay una prueba.
- Un cuadro largo (cambio de pestaña) se limita a 0,25 s de simulación por vez, y
  el cruce del aro se detecta por interpolación entre subpasos, así que la pelota
  no puede atravesarlo.
- **Enceste:** sólo cuenta cuando la pelota cruza el plano del anillo **hacia
  abajo**, dentro de la abertura útil descontando su propio radio. Si antes pasó
  hacia arriba por el anillo, ya no puede contar. Acercarse no suma.
- Contactos con aro, tablero y suelo, con restitución. La pelota nunca atraviesa
  el tablero ni se hunde en el pasto.
- Si la pelota sale de la escena, el intento se resuelve igual en vez de dejarla
  volar.

### Cómo se mapea la barra de carga

El margen físico de un enceste limpio es de aproximadamente ±1 % de la velocidad
en la marca de 2 y ±0,4 % en la de 8: imposible de acertar con una barra.

En vez de falsear el resultado, para cada intento se **mide** el intervalo real de
velocidades que entra (`solveMakeInterval`, por búsqueda sobre la simulación de
verdad) y se estira el mapeo carga → velocidad para que ese intervalo caiga sobre
una fracción de barra elegida por diseño. Entonces:

- La franja verde es el intervalo de acierto real. Soltar adentro entra, siempre.
- La dificultad crece con el número de la marca, por diseño explícito.
- No hay azar: el mismo instante de soltada da siempre el mismo resultado.

El resultado que se ve coincide con la trayectoria que se ve, porque es la misma
simulación.

## Rendimiento

Objetivo: 60 fps en un navegador de escritorio razonable.

**No está medido en hardware real.** Las capturas automáticas corren en Chrome
headless con SwiftShader (render por software), donde da ~15 fps; ese número no
dice nada sobre una GPU. Para medirlo de verdad hay que abrir el juego en el
navegador y mirarlo ahí. Lo que sí está acotado: las texturas se construyen una
sola vez al arrancar, los fotogramas de personaje van en un atlas por personaje en
vez de cientos de texturas sueltas, y la lógica no depende de la frecuencia de
cuadros.

## Sin backend

El juego corre local, sin cuentas, sin servicios y sin claves. Los sonidos se
sintetizan con la Web Audio API, así que no hace falta ningún archivo de audio.
