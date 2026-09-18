# CHUBOL

Juego arcade de básquet de patio, en pixel art, con un solo aro y siete marcas que
valen 2, 3, 4, 5, 6, 7 y 8 puntos. Se juega de a dos: cada pareja tiene un minuto
para sumar lo más que pueda, y hay que tirar de todos los lugares.

> **Estado del arte:** las tres imágenes de referencia no están en el repositorio y
> esta sesión no tiene herramientas para producir pixel art. Todo lo que se ve es
> **arte provisional generado por código**, marcado como tal dentro del juego. La
> fidelidad visual a la ilustración sigue **pendiente**. Ver
> [`docs/ASSET_REQUESTS.md`](docs/ASSET_REQUESTS.md).

## Cómo arrancarlo

```bash
pnpm install
pnpm dev          # servidor de desarrollo, abre el navegador
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
angosta a medida que sube el número de la marca: 161 ms en la de 2, 62 ms en la de 8.

## Modos

**Partido (pareja vs pareja).** Cada pareja tiene 1 minuto. Hay que tirar de las
siete marcas: no se puede repetir una hasta haber tirado de todas. Los dos
integrantes se alternan la pelota. Después de cada tiro hay que ir a buscar la
pelota, y el reloj sigue corriendo. Gana la pareja con más puntos.

**Práctica.** Un jugador, sin reloj, sin condición de victoria inventada. Sirve
para comprobar que la cancha, la física y los siete valores funcionan. Una de cada
marca suma 35.

**Comparación visual.** Reproduce el encuadre y las posiciones de la lámina de
referencia, en 1536 × 1024 y con un cuadro determinista, para poder compararlo con
`references/chubol-nba-jam.png`. Mientras ese archivo no esté, la escena lo dice.

## Documentación

| Documento | Qué contiene |
|---|---|
| [`docs/RULES.md`](docs/RULES.md) | Qué está confirmado, qué interpreté y qué falta definir |
| [`docs/VISUAL_SPEC.md`](docs/VISUAL_SPEC.md) | Invariantes visuales, capas, densidad de píxel |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, proyección, máquina de estados, física |
| [`docs/ASSET_REQUESTS.md`](docs/ASSET_REQUESTS.md) | Qué recursos gráficos hay que producir, con especificaciones |
| [`docs/ASSET_MANIFEST.md`](docs/ASSET_MANIFEST.md) | Tabla de recursos, tamaños, pivotes y estado |

## Falta definir

**Qué pasa si las dos parejas empatan.** Por ahora se juega una ronda extra de 30
segundos cada una, y después de 3 rondas iguales el partido queda compartido y la
pantalla avisa que falta la regla de verdad. Se cambia desde `RULES_DEFAULTS` en
`src/game/config/gameplay.ts`.
