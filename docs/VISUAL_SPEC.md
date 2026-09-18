# Especificación visual

## Estado honesto, primero

**Las tres imágenes de referencia no están en el repositorio.** Busqué en el
checkout completo y en `Downloads/`:

| Archivo esperado | Estado |
|---|---|
| `references/chubol-nba-jam.png` | ❌ no existe |
| `references/chubol-croquis.jpg` | ❌ no existe |
| `references/chubol-perro.png` | ❌ no existe |

Además, esta sesión **no tiene generación ni edición de imágenes**. Verifiqué las
herramientas disponibles: hay Node, pnpm, Git y Chrome (que uso para capturas
reales y revisión de consola). No hay ninguna herramienta que produzca pixel art.

Por lo tanto:

- **La fidelidad visual a la ilustración está PENDIENTE y no está medida.** No se
  puede afirmar parecido con una imagen que no vi.
- Todo el arte que se ve hoy es **provisional, generado por código**, y está
  marcado como tal dentro del juego con un cartel "ARTE PROVISIONAL — MODO
  DESARROLLO".
- La escena de comparación dice explícitamente que falta la referencia en vez de
  simular una comparación.

Lo que sí está construido y no cambia cuando llegue el arte: la cámara, la
calibración, la proyección, las capas, la oclusión, los pivotes, la densidad de
píxel y toda la lógica. Cuando aparezcan las imágenes se reemplazan texturas, no
arquitectura.

---

## Invariantes que el arte definitivo debe respetar

Estas son las reglas que el código ya impone y que la producción de arte no puede
romper.

### Cámara y encuadre

- Vista elevada en tres cuartos, **fija**. No orbita, no rota, no hay cenital, no
  hay scroll. `CAMERA` en `src/game/config/court.ts`.
- La cámara está corrida a la derecha del aro (`x = 8.5`), no de frente. Esa
  oblicuidad es lo que hace que el tablero se lea como un tablero y no como una
  línea vista de canto. Si se pone la cámara de frente al tablero, desaparece.
- Lienzo lógico fijo de **1536 × 1024** (3:2, igual que la lámina de referencia).
  En otras pantallas se adapta con márgenes (`Phaser.Scale.FIT` + `CENTER_BOTH`):
  nunca se estira ni se recorta el aro, el perro o el trofeo.
- Aro y tablero a la izquierda; el espacio de juego se extiende hacia la derecha.
- El logo **CHUBOL** va arriba al centro, naranja/amarillo con contorno oscuro y
  acabado pixel art. No es una tipografía web: son glifos de 5×7 píxeles
  (`src/game/render/pixelFont.ts`).

### Densidad de píxel

Una sola grilla para todo. El arte se dibuja a **768 × 512** y se muestra a **×2**
en el lienzo de 1536 × 1024 (`ART_SCALE` en `src/game/render/pixelCanvas.ts`).

Nada se muestra nunca a escala fraccionaria. Los personajes que deben cambiar de
tamaño con la profundidad **no se reescalan**: existen en 8 alturas dibujadas
(48, 51, 54, 57, 60, 63, 66, 69 px de arte) y se elige la más cercana. La pelota
tiene 6 tamaños. El arte definitivo tiene que entregarse igual, o el tamaño de
píxel va a variar entre el fondo y los personajes.

Filtrado: nearest-neighbour en todas las texturas. Sin desenfoque, sin suavizado.

### Escenario

| Elemento | Invariante |
|---|---|
| Superficie | Pasto natural, irregular, con zonas gastadas donde más se juega. Nunca parquet, cemento ni asfalto. |
| Líneas | Blancas, pintadas sobre el pasto, con desgaste. Rectángulo de la llave, extremo redondeado, arco exterior. |
| Puntajes en el piso | 2, 3, 4, 5, 6, 7 y 8, en las siete posiciones. La 7 existe aunque una figura la tape. |
| Aro | Uno solo, a la izquierda. Metálico, con red de **cadenas** con eslabones reconocibles. |
| Tablero | Rectangular, de tablones de madera rústica envejecida, marca blanca simple. **No vidrio ni acrílico.** |
| Soporte | Estructura de madera, casera. |
| Pared izquierda | Ladrillo visto, ~30 cm. |
| Pared del frente | Ladrillo visto, ~50 cm, con arbustos por fuera. Es capa de **primer plano**: tapa pies y pelota. |
| Fondo | **No hay pared de ladrillos atrás.** |
| Cipreses | Tres, anchos y frondosos, en las posiciones de `BACKGROUND.cypressXs`. |
| Alambrado | Entre los cipreses y la calle. Postes de madera y alambres horizontales finos, se ve la calle a través. |
| Calle | Una sola, de tierra, **recta y paralela al lateral largo**. No se curva. |
| Sin | Casas, edificios, autos, tribunas, instalaciones deportivas, cartel de "buenos amigos", marcadores superiores, barras TURBO. |
| Objetos | Regadera, pelota de fútbol (decoración, no es una segunda pelota de juego), cajón "CHUBOL SIEMPRE". |
| Trofeo | Mesa de madera con licuadora (base roja y crema, vaso transparente, tapa) y frutas: bananas, naranjas, manzanas. |

#### Una licencia de ilustración, declarada

El horizonte geométrico real de esta cámara cae **por encima** del cuadro. Más
allá de la calle no hay nada modelado: se pinta cielo desde el borde superior
hasta el borde lejano de la calle, con una franja de vegetación lejana que cierra
la composición. Es una convención de ilustración (lo mismo que hace un dibujo),
no un render de terreno distante. Está en `drawDistantBand()` en
`src/game/render/plate.ts`.

### Personajes

Exactamente **cuatro adultos** dentro de la cancha, de piel clara, contextura
normal y delgada. **Sin musculatura exagerada**: la referencia a NBA Jam es de
lenguaje visual y energía, no de anatomía.

| # | Vestimenta | Posición en el cuadro de referencia |
|---|---|---|
| A | Musculosa gris, shorts violetas | Izquierda, dentro de la llave |
| B | Musculosa blanca con sol amarillo, shorts azules | Zona posterior central |
| C | Musculosa roja, shorts negros, vincha roja | Centro-derecha, con la pelota |
| D | Musculosa negra, shorts verdes | Primer plano derecho, de espaldas |

Identidad constante: la misma cara, la misma ropa y la misma escala en todos los
fotogramas. Nada de parpadeos de ropa, cambios de talla, bordes blancos ni
deslizamiento de pies.

**Sin tapones.** No hay ni puede haber animación de bloquear un tiro, marcar
encima del tirador ni disputar la pelota.

### Chico y perro

- Chico de **13 años**, más bajo, proporciones adolescentes. Equipo completo de
  River: camiseta blanca con banda roja diagonal y escudo, shorts negros, medias
  largas blancas con detalle rojo, botines. Es **espectador**, no un quinto
  participante.
- Perro mestizo de aspecto pastor: orejas triangulares erguidas, hocico alargado
  oscuro, pelaje marrón oscuro/negro con zonas atigradas, pecho crema, puntas
  blancas en las patas delanteras.
- **Pelo corto, liso y pegado al cuerpo**, también en cuello y cola. No es un
  pastor de pelo largo ni un labrador de orejas caídas.
- Van juntos, a la derecha, fuera del espacio de lanzamiento.
- **Están separados del fondo**, como sprites propios con dos fotogramas de
  animación ambiental (el perro mueve la cola, el chico festeja al final). No son
  una copia pegada sobre el fondo.

Total de personas: cuatro adultos más el chico = cinco. Un solo perro.

---

## Capas y orden de dibujo

Definido en `DEPTHS` en `src/game/render/courtView.ts`.

```
  0    fondo (cielo, calle, alambrado, cipreses, pasto, líneas, números, pared izquierda)
 10    aro: poste, tablero y mitad lejana del anillo
 20    marcas de tiro
 30    sombras de contacto
100+   entidades ordenadas por profundidad de cámara (nearer = encima)
900    aro: mitad cercana del anillo y cadenas  → la pelota pasa POR DETRÁS
1000   primer plano: pared del frente y arbustos → tapan pies y pelota
1200   efectos y logo
2000   interfaz
```

El aro está partido en dos capas justamente para que un enceste se vea bien: la
pelota pasa por delante del tablero y por detrás del aro cercano y las cadenas.

---

## Interfaz

- El escenario ocupa casi toda la pantalla. La interfaz acompaña, no es un panel.
- Franja fina abajo: turno, marcador, indicación breve. Reloj y vuelta arriba al
  centro, fuera del aro, del perro y del trofeo.
- La barra de carga aparece **sólo** mientras se prepara un tiro.
- **No hay** paneles grandes "Jugador 1 / Jugador 2" ni barras TURBO.
- Nada de nombres de motores, coordenadas ni advertencias de desarrollo para el
  jugador normal. El único cartel técnico es el de arte provisional, y desaparece
  solo cuando el arte definitivo esté en su lugar.
- Modo captura limpia: en la escena de comparación, `H` oculta toda la interfaz.
