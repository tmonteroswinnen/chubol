# La pareja que juega la máquina

Elegís si sos **Bocha y Farico** o **Agus y Facu**; la otra pareja la juega la
computadora. Está en el menú, en *JUGAR CONTRA LA MÁQUINA*.

## No hace trampa

La máquina no toca el estado del partido: emite los mismos tres comandos que
tenés vos —caminar, mantener, soltar— y el juego los procesa por el mismo camino.
Eso quiere decir que tiene exactamente tus limitaciones:

- misma velocidad al caminar;
- el mismo minuto de reloj, que corre igual mientras va a buscar la pelota;
- la misma regla de que hay que tirar de las siete marcas antes de repetir una;
- los dos integrantes de su pareja se alternan la pelota, igual que los tuyos.

Lo único que cambia con la dificultad es **con cuánta precisión suelta la barra**,
que es justo lo único que cambia para una persona. Vive en
[`src/game/domain/cpu.ts`](../src/game/domain/cpu.ts), en `pickRelease()`: apunta
al centro de la franja verde y se equivoca por un valor aleatorio. Como la franja
se angosta cuando sube el número de la marca, el mismo error le hace fallar más
los tiros largos — sin que haya una tabla de "acierta tanto por ciento en la 8".

## Qué tan buena es

Medido contra la física real, con la habilidad por defecto (`skill: 0.5`):

| Marca | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|
| Emboca | 100 % | 75 % | 78 % | 67 % | 57 % | 53 % | 45 % |

En un minuto completo llega a tirar entre 11 y 14 veces y termina, según cómo le
salga, entre **19 y 50 puntos**. Tres partidos medidos en el navegador: 27, 50 y
19. Es un rival que se puede ganar, pero no regalado.

Para hacerla más difícil o más fácil se toca `CPU_DEFAULTS.skill`: con 0,85
emboca casi todo y con 0,4 falla bastante. No hay un selector de dificultad en el
menú; si lo querés, es una línea.

## Cada partido es distinto

El generador aleatorio es determinista (`mulberry32`), lo cual sirve para que los
tests sean reproducibles, pero la partida toma **una semilla nueva cada vez** en
`GameScene.create()`. Si no, la máquina jugaría el mismo minuto, tiro por tiro,
todas las veces.

## Mientras juega la máquina, el teléfono no te responde

Y es a propósito: si tu dedo pudiera caminar o cargar la barra durante el turno
de ella, le arruinarías el tiro. Están bloqueados el toque en la cancha, el botón
TIRAR y el teclado. Lo verifica `scripts/pickerCheck.mjs`, que espera a que la
máquina esté yendo a buscar la pelota —una fase que no se puede confundir con un
tiro propio— y ahí intenta interferir por las tres vías.

## Cómo verificarlo

```bash
pnpm build && pnpm preview      # en otra terminal
node scripts/cpuCheck.mjs       # un turno entero de la máquina, tiro por tiro
node scripts/pickerCheck.mjs    # el selector de pareja y el bloqueo del humano
pnpm test                       # tests de decisión y de puntería
```
