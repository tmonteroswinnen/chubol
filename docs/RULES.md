# Reglas de CHUBOL

Este documento separa tres cosas: lo que confirmaste, lo que interpreté porque hacía
falta para que el juego funcione, y lo que todavía falta definir. El código sigue
esta separación: nada de lo interpretado está escrito como si fuera histórico.

---

## 1. Confirmado por vos

| Regla | Dónde vive en el código |
|---|---|
| Se juega **de a dos: pareja contra pareja**. | `src/game/domain/match.ts` (`TeamConfig`, dos equipos de dos) |
| Cada pareja tiene **1 minuto** para sumar lo más que pueda. | `RULES_DEFAULTS.turnSeconds = 60` en `src/game/config/gameplay.ts` |
| **Hay que tirar de todos los lugares**: no puede quedar una marca sin tirar. | `Match.canShootFrom()` — bloquea repetir una marca hasta completar la vuelta |
| Después va la otra pareja, con su minuto. | `Match.endTurn()` / `Match.startTurn()` |
| **Gana la pareja que hizo más puntos.** | `Match.result()` |
| Un solo aro. | `HOOP` en `src/game/config/court.ts` |
| **No se pueden hacer tapones.** | No existe ninguna mecánica de bloqueo. Los otros personajes esperan fuera de la zona de tiro y nunca marcan. |
| Embocar desde distintos lugares vale distinto: 2, 3, 4, 5, 6, 7 y 8. | `SHOT_SPOTS` en `src/game/config/court.ts` |
| **Son lugares concretos**, no zonas. | `spotAt()` en `src/game/domain/spots.ts` devuelve `null` fuera de las marcas |
| **Cuanto más alto el número, más difícil.** | `designedBandWidth(points)` en `src/game/sim/ball.ts` |
| **No hay regla de rebote**: hay que ir a buscar la pelota rápido para no perder tiempo. | Fase `retrieving` en `src/game/scenes/GameScene.ts`. El reloj sigue corriendo mientras vas a buscarla. |
| La licuadora y las frutas son el trofeo. | `PROPS.trophyTable`, celebración en `ResultScene` |

### Dificultad por número

El aro deja un margen físico de aproximadamente ±1 % de la velocidad de lanzamiento
en la marca de 2, y ±0,4 % en la de 8. Eso es imposible de acertar con una barra de
tiempo. Entonces la barra no es una escala fija de velocidad: para cada intento se
estira el mapeo carga → velocidad de forma que **el intervalo real de acierto caiga
exactamente sobre la franja verde dibujada**.

Resultado: si soltás dentro de la franja entra, siempre; y si soltás afuera no
entra, nunca. Y la franja se angosta con el número de la marca, que es lo que
pediste:

| Marca | Ancho de la franja | Tiempo real para soltar |
|---|---|---|
| 2 | 17,0 % de la barra | 161 ms |
| 3 | 15,3 % | 145 ms |
| 4 | 13,5 % | 128 ms |
| 5 | 11,7 % | 112 ms |
| 6 | 10,0 % | 95 ms |
| 7 | 8,3 % | 78 ms |
| 8 | 6,5 % | 62 ms |

Notá que la 3 y la 4 están a la misma distancia del aro, y la 6 y la 7 también.
La dificultad está atada al **número**, no a la distancia, justamente porque eso
fue lo que pediste.

### La otra mitad de la promesa: afuera no entra

Durante un tiempo la franja era verdad sólo hacia adentro. Un tiro pasado de
fuerza pega en el tablero y entra igual, y como la barra estira el intervalo de
acierto sobre una porción fija de sí misma, esos tiros de tablero volvían a caer
sobre la barra en un lugar que nadie dibujó. En cinco de las siete marcas había
una segunda ventana invisible; en la de 5 era **más ancha que la franja pintada y
llegaba justo al tope**, o sea que mantener el botón hasta arriba eran 5 puntos
garantizados. La de 2, además, tenía el intervalo recortado por el límite de
búsqueda: la franja decía 17 % de la barra y la realidad era 59 %.

Ahora el solver busca el intervalo de verdad y además busca la primera isla de
tablero, y el mapeo de los extremos de la barra frena antes de llegar. El test
`tests/ball.test.ts` barre la barra entera, marca por marca, y falla si algo
entra fuera de la franja.

Efecto de costado: **una pelota que picó en el pasto ya no puede entrar.** Es una
regla nueva y hay que decirla. Está por dos motivos: en un patio es lo que pasa,
y le permite al solver cortar el tiro apenas toca el suelo — sin eso, medir una
marca tardaba tanto que se trababa el cuadro justo cuando apretás.

---

## 2. Interpretado (no lo dijiste, pero hacía falta para poder jugar)

Está marcado así en el código y es configuración, no una afirmación.

0. **Contra quién jugás.** Podés elegir tu pareja y que la otra la maneje la
   computadora, o pasarse el aparato entre los dos. No dijiste cuál de las dos
   formas era la del patio, así que están las dos y elegís en el menú. Ver
   [MAQUINA.md](MAQUINA.md).

0.5 **No se puede tirar dos veces seguidas de la misma marca.** Al completar la
   vuelta de las siete, la vuelta se reinicia; sin esta regla podías dejar la de
   8 para el final, la vuelta se reiniciaba abajo tuyo y tirabas otra vez sin
   moverte. Ahora la marca recién tirada no puede abrir la vuelta siguiente. Es
   por turno: la pareja que entra después no hereda ningún bloqueo.

1. **Cómo se alternan los dos de la pareja.** Dentro del minuto, los dos integrantes
   se van turnando la pelota: uno tira, después el otro. Si en realidad tiraba
   siempre el mismo, o se elegía libremente, se cambia en `Match.resolveShot()`.

2. **Qué pasa si completás la vuelta de las 7 marcas antes de que termine el minuto.**
   Se habilitan las 7 de nuevo y arranca otra vuelta. Así "no puede quedar un lugar
   por tirar" se cumple y el minuto sigue teniendo sentido. Si en realidad la vuelta
   era una sola y se terminaba ahí, es un cambio de una línea.

3. **Un tiro que salió antes del bocinazo cuenta.** Si soltás la pelota con el reloj
   todavía corriendo, el intento se resuelve aunque el minuto termine en el aire.

4. **Radio de recogida de la pelota:** 0,75 m (`PICKUP_RADIUS` en `GameScene.ts`).
   Si la pelota queda fuera de la cancha, se trae al borde jugable: representa ir a
   buscarla, sin hacerte caminar fuera de escena.

---

## 3. Todavía falta que lo definas

**¿Qué pasa si las dos parejas empatan?** Dijiste que no sabés qué harían.

Mientras tanto, y marcado como provisional en la pantalla de reglas y en el
resultado:

- Ronda extra de 30 segundos para cada pareja (`RULES_DEFAULTS.tiebreakSeconds`).
- Si vuelven a empatar, se repite.
- Después de 3 rondas extra iguales, el partido termina **compartido** y la pantalla
  dice que falta definir el desempate de verdad. Esto existe para que el juego no
  quede en un bucle sin salida, no porque sea una regla.

Se cambia entero desde `RULES_DEFAULTS` en `src/game/config/gameplay.ts`:
`tiebreak: 'extraTurn' | 'shared'`, `tiebreakSeconds`, `maxTiebreakRounds`.

---

## Modo práctica

No es una regla de CHUBOL: es una herramienta para probar que la cancha, la física y
los siete valores funcionan.

- Un solo jugador, sin reloj, sin condición de victoria inventada.
- Podés tirar de cualquier marca, las veces que quieras.
- Lleva la cuenta de cuántas marcas diferentes embocaste (0/7 a 7/7).
- Una de cada marca suma **35**, que es la suma de 2+3+4+5+6+7+8.

---

## Ubicación de las siete marcas

**Medidas, no supuestas.** El centro de cada número pintado en la lámina se leyó
en un recorte a 6× y se proyectó al suelo con la cámara calibrada. Son las marcas
que vos pintaste.

| Puntos | Posición en el mundo (m) | Distancia al aro | Dónde |
|---|---|---|---|
| 2 | (0.62, 0.16) | 0.36 m | Debajo del aro, dentro de la llave |
| 3 | (0.37, 2.66) | 2.72 m | Al costado del aro, hacia los cipreses |
| 4 | (0.31, −1.99) | 2.09 m | Al costado del aro, hacia la pared del frente |
| 5 | (3.59, −0.01) | 2.65 m | Extremo redondeado de la llave |
| 6 | (4.15, −2.31) | 3.96 m | Sobre el arco exterior, lado pared del frente |
| 7 | (5.19, 2.96) | 5.18 m | Sobre el arco exterior, lado cipreses |
| 8 | (7.45, −0.49) | 6.53 m | Lejos, por fuera del arco exterior |

Abrí el croquis original (rotado 90° antihorario) y confirma esta lectura: el **8
va por fuera del arco, a la derecha** — no en el vértice del arco. También
confirma que "30cm" y "50cm" son las alturas de las paredes, no valores de tiro, y
que **no hay ninguna marca de 1**.

Fuera de estas siete posiciones no se puede tirar y no hay puntaje interpolado por
distancia.

### El 2 es una bandeja

La lámina pinta el 2 a **0,36 m del eje del aro**: prácticamente debajo de la
canasta. Desde ahí no existe ningún arco que entre — la pelota tendría que pasar
hacia arriba a través del aro, y eso no es enceste. Lo que hace una persona desde
abajo del aro es estirarse y meterla, y como este aro está a unos 2,18 m, puede.

Así que para tiros muy cerca el juego sube el punto de suelta por encima del aro y
la pelota cae derecho. Es el tiro más fácil y vale lo menos, que es como debe ser.
