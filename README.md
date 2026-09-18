# CHUBOL

Juego arcade de básquet de patio, con un solo aro y siete marcas que valen 2, 3,
4, 5, 6, 7 y 8 puntos. Se juega de a dos: cada pareja tiene un minuto para sumar
lo más que pueda, hay que tirar de todos los lugares, y después de cada tiro hay
que ir a buscar la pelota mientras el reloj corre.

El juego corre **adentro de tu arte**: la lámina de la cancha es el fondo real, y
la cámara está calibrada contra ella con 5,5 px de error sobre el suelo.

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
pnpm typecheck    # sólo verificación de tipos
pnpm test         # pruebas de reglas, física y proyección (sin renderer)
pnpm capture      # capturas reales del juego + revisión de consola
```

`pnpm capture` necesita el build servido con `pnpm preview` en otra terminal. Usa
el Chrome que ya tenés instalado, no descarga navegadores, y **falla si aparece
cualquier error, advertencia o recurso roto en la consola**.

## Controles

| Acción | Tecla |
|---|---|
| Mover al jugador activo | `W A S D` o flechas |
| Preparar el tiro | mantener `ESPACIO` (o el botón del mouse) |
| Lanzar | soltar `ESPACIO` |
| Pausa | `ESC` |
| Silenciar | `M` |
| Ocultar interfaz (en comparación) | `H` |

Soltá cuando la aguja esté dentro de la franja verde. **Si soltás adentro, entra.**
La franja es el intervalo de acierto real de la física, no una aproximación, y se
angosta a medida que sube el número de la marca: 161 ms en la de 2, 62 ms en la
de 8.

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
| [`docs/CHUBOL-CONTINUAR.md`](docs/CHUBOL-CONTINUAR.md) | Tus instrucciones con el paquete de arte |

## Falta definir

**Qué pasa si las dos parejas empatan.** Por ahora juega una ronda extra de 30 s
cada una, y después de 3 rondas iguales el partido queda compartido y la pantalla
avisa que falta la regla de verdad. Se cambia desde `RULES_DEFAULTS` en
`src/game/config/gameplay.ts`.
