# CHUBOL

Juego arcade de básquet de patio, con un solo aro y siete marcas que valen 2, 3,
4, 5, 6, 7 y 8 puntos. Se juega de a dos: cada pareja tiene un minuto para sumar
lo más que pueda, hay que tirar de todos los lugares, y después de cada tiro hay
que ir a buscar la pelota mientras el reloj corre.

El juego corre **adentro de tu arte**: la lámina de la cancha es el fondo real, y
la cámara está calibrada contra ella con 5,5 px de error sobre el suelo.

Se juega en la compu con teclado y en el **celular con el dedo**, y se puede
instalar en la pantalla de inicio como una app que anda sin internet.

> **Falta todavía:** los sprites de los cuatro amigos y de la pelota de juego. Hasta
> que existan, el juego los dibuja provisionalmente por código y lo dice en
> pantalla. Ver [`docs/ASSET_REQUESTS.md`](docs/ASSET_REQUESTS.md).

## Cómo arrancarlo

El proyecto está en `chubol/chubol` (el repo, no la carpeta que lo contiene):

```bash
cd C:\Users\tomas\Downloads\chubol\chubol
pnpm install
pnpm dev
```

Otros comandos:

```bash
pnpm build        # verifica tipos y compila a dist/
pnpm preview      # sirve dist/ en http://localhost:4173
pnpm celular      # lo mismo, pero visible desde el celular en la misma wifi
pnpm run build:publicar   # el build que se publica (sin references/)
pnpm typecheck    # sólo verificación de tipos
pnpm test         # pruebas de reglas, física y proyección (sin renderer)
pnpm capture      # capturas reales del juego + revisión de consola
pnpm capture:mobile  # capturas en cuatro tamaños de celular y tablet
pnpm test:touch      # juega un tiro completo con toques reales, sin teclado
pnpm test:pwa        # manifest, service worker y arranque sin conexión
```

`pnpm capture` necesita el build servido con `pnpm preview` en otra terminal. Usa
el Chrome que ya tenés instalado, no descarga navegadores, y **falla si aparece
cualquier error, advertencia o recurso roto en la consola**.

## Controles

En la compu:

| Acción | Tecla |
|---|---|
| Mover al jugador activo | `W A S D` o flechas |
| Preparar el tiro | mantener `ESPACIO` |
| Lanzar | soltar `ESPACIO` |
| Pausa | `ESC` |
| Silenciar | `M` |
| Ocultar interfaz (en comparación) | `H` |

En el celular, con el dedo: tocás una marca para ir, mantenés **TIRAR** y soltás,
y tocás la pelota para ir a buscarla. Ver [`docs/MOBILE.md`](docs/MOBILE.md).

Elegís si sos **Bocha y Farico** o **Agus y Facu**, y la otra pareja la juega la
computadora con las mismas reglas y sin ventajas. También están el modo de pasarse
el aparato entre los dos y la práctica libre. Ver [`docs/MAQUINA.md`](docs/MAQUINA.md).

Soltá cuando la aguja esté dentro de la franja verde. **Si soltás adentro entra, y
si soltás afuera no entra.** La franja es el intervalo de acierto real de la
física, medido tiro por tiro, y se angosta a medida que sube el número de la
marca: 161 ms en la de 2, 62 ms en la de 8. La aguja se pone verde cuando está
adentro, así soltar es reaccionar a un color y no apuntar a una línea.

La marca de 2 está pintada casi debajo del aro, así que se juega como bandeja: el
jugador se estira por encima del aro y la mete. Es el tiro más fácil y vale lo
menos.

## Modos

**Partido (pareja vs pareja).** Cada pareja tiene 1 minuto. Hay que tirar de las
siete marcas: no se puede repetir una hasta haber tirado de todas. Los dos
integrantes se alternan la pelota. Después de cada tiro hay que ir a buscarla y el
reloj sigue corriendo. Gana la pareja con más puntos.

**Práctica.** Un jugador, sin reloj, sin condición de victoria inventada. Una de
cada marca suma 35.

**Comparación visual.** Reproduce el cuadro de la referencia con los cuatro amigos
en las posiciones medidas de `references/chubol-nba-jam.png`, a 1536 × 1024 y con
un estado determinista. `H` oculta la interfaz para capturar.

## Recalibrar si cambia el arte

Si repintás la lámina, la cámara deja de calzar. Para rehacerla:

```bash
node scripts/fitCamera.mjs    # imprime la cámara y la geometría; pegar en src/game/config/court.ts
node scripts/cutLayers.mjs    # vuelve a recortar el primer plano y el frente del aro
pnpm test                     # tests/projection.test.ts falla si las marcas no caen sobre sus números
```

`node scripts/crop.mjs <imagen> <salida> <x> <y> <ancho> <alto> <zoom>` recorta y
amplía una zona con una grilla, que es como se midieron los puntos de referencia.

## Documentación

| Documento | Qué contiene |
|---|---|
| [`docs/RULES.md`](docs/RULES.md) | Qué confirmaste, qué interpreté y qué falta definir |
| [`docs/VISUAL_SPEC.md`](docs/VISUAL_SPEC.md) | Calibración, capas, escala, y las diferencias que encontré entre el arte y lo escrito |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, proyección, máquina de estados, física |
| [`docs/ASSET_REQUESTS.md`](docs/ASSET_REQUESTS.md) | Qué falta producir, con especificaciones exactas |
| [`docs/ASSET_MANIFEST.md`](docs/ASSET_MANIFEST.md) | Tabla de recursos y estado |
| [`docs/MOBILE.md`](docs/MOBILE.md) | Versión para celular: controles táctiles, instalación, sin conexión |
| [`docs/MAQUINA.md`](docs/MAQUINA.md) | La pareja que juega la computadora: qué tan buena es y por qué no hace trampa |
| [`docs/PUBLICAR.md`](docs/PUBLICAR.md) | Cómo se publica solo en GitHub Pages, y los dos pasos que hay que hacer a mano |
| [`docs/CHUBOL-CONTINUAR.md`](docs/CHUBOL-CONTINUAR.md) | Tus instrucciones con el paquete de arte |

## Falta definir

**Qué pasa si las dos parejas empatan.** Por ahora juega una ronda extra de 30 s
cada una, y después de 3 rondas iguales el partido queda compartido y la pantalla
avisa que falta la regla de verdad. Se cambia desde `RULES_DEFAULTS` en
`src/game/config/gameplay.ts`.
