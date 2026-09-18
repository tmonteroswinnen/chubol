# Recursos gráficos que hay que producir

## Por qué existe este documento

El requisito número uno del proyecto es que la cancha se vea como la ilustración
arcade de CHUBOL. **No puedo cumplirlo en esta sesión**, por dos razones concretas
y verificables:

1. **Las tres imágenes de referencia no están en el repositorio.** Sin la lámina
   `chubol-nba-jam.png` no hay con qué comparar composición, paleta, caras, ropa
   ni densidad de píxel. No vi la imagen, así que no puedo afirmar parecido.
2. **Esta sesión no tiene ninguna herramienta de generación ni edición de
   imágenes.** Verifiqué qué hay disponible: Node, pnpm, Git, Chrome (que uso para
   capturas reales y revisión de consola). No hay nada que produzca pixel art.

Lo que hice en su lugar: todo lo que no depende del arte. Física, reglas, turnos,
reloj, proyección, capas, oclusión, controles, interfaz, sonido, pruebas y
capturas. El arte que se ve hoy es provisional generado por código, marcado como
tal dentro del juego, y está construido sobre la misma calibración que va a usar
el arte final — cuando lleguen las imágenes se reemplazan texturas, no
arquitectura.

---

## Primero: las tres referencias

Antes que cualquier recurso nuevo, hacen falta los archivos que ya existen de tu
lado. Copialos tal cual, sin retocar:

```
references/chubol-nba-jam.png     1536 × 1024, la lámina arcade definitiva
references/chubol-croquis.jpg     el croquis original de la cancha
references/chubol-perro.png       la foto del perro
```

El juego los detecta solo (el plugin `scripts/viteChubolAssets.ts` arma el
manifiesto en el build). Apenas esté `chubol-nba-jam.png`, la escena de
comparación deja de avisar que falta y pasa a mostrar el visor superpuesto.

Con esas tres imágenes se recalibran, en este orden:

1. `CAMERA` y `FRAMING` en `src/game/config/court.ts`, sobre puntos reconocibles
   de la lámina (base del poste, esquinas de la llave, línea del alambrado).
2. `PALETTE` en `src/game/render/palette.ts`, con colores **muestreados de la
   imagen**, no descritos de memoria como están ahora.
3. `SHOT_SPOTS`, sobre el croquis girado 90° en sentido antihorario.
4. Los rasgos del perro, sobre su foto.

---

## Recursos a producir

Todos en PNG con transparencia real (canal alfa, sin fondo pegado, sin halo
blanco), en la grilla de arte de **768 × 512** que se muestra a ×2. Bordes nítidos,
sin desenfoque, sin antialias en los bordes de silueta.

### 1. Fondo limpio

```
ruta:      public/assets/backgrounds/court-clean.png
tamaño:    1536 × 1024  (se dibuja a 768 × 512 y se escala ×2)
pivote:    esquina superior izquierda del cuadro
```

La lámina de referencia **sin los cuatro jugadores, sin la pelota de básquet y
sin sus sombras**. Hay que reconstruir de forma coherente el pasto y las líneas
que quedaban tapados debajo de ellos. El chico, el perro y la pelota de fútbol
decorativa también salen (van como sprites propios).

Se queda todo lo demás: cielo, calle de tierra recta, alambrado, tres cipreses,
vegetación de fondo, pasto con desgaste, líneas pintadas, los siete números en el
piso, pared izquierda de ladrillo, mesa con licuadora y frutas, cajón, regadera.

Prompt de producción sugerido:

> Pixel art de 768×512, estética arcade deportivo de los noventa tipo NBA Jam,
> sprites digitalizados, sombreado con volumen, bordes nítidos, sin antialias.
> Vista elevada en tres cuartos fija de una cancha de básquet de patio argentino
> sobre pasto natural con zonas gastadas. Un solo aro a la izquierda: tablero de
> tablones de madera rústica envejecida con marca blanca simple, aro metálico con
> red de cadenas, soporte de madera casero. Líneas blancas pintadas y desgastadas:
> rectángulo de la llave, extremo redondeado, arco exterior. Números pintados en
> el piso: 2, 3, 4, 5, 6, 7, 8. Pared baja de ladrillo visto a la izquierda (30 cm)
> y al frente (50 cm) con arbustos por fuera. Al fondo, tres cipreses anchos y
> frondosos, alambrado de campo con postes de madera y alambres finos, y detrás una
> calle de tierra recta paralela al lateral largo. Cielo azul diurno, luz cálida.
> A la derecha, mesa de madera con una licuadora eléctrica de base roja y crema con
> vaso transparente, y bananas, naranjas y manzanas al lado. Cajón de madera y
> regadera. Sin personas, sin pelota de básquet, sin casas, sin edificios, sin
> tribunas, sin pared de fondo.

### 2. Máscara de primer plano

```
ruta:      public/assets/backgrounds/court-foreground.png
tamaño:    1536 × 1024, transparente salvo la franja inferior
pivote:    esquina superior izquierda del cuadro
```

Sólo la pared baja de ladrillo del frente y los arbustos que crecen por fuera.
Todo lo demás transparente. Esta capa se dibuja por encima de los personajes y de
la pelota, así que es la que hace que los pies queden correctamente tapados
cuando alguien tira desde la marca de 6.

### 3. Aro, en dos capas

```
ruta:      public/assets/props/hoop-back.png    poste + tablero + mitad lejana del anillo
ruta:      public/assets/props/hoop-front.png   mitad cercana del anillo + cadenas
tamaño:    1536 × 1024 cada una, transparentes salvo el aro
pivote:    esquina superior izquierda del cuadro
```

El corte va por los dos puntos más anchos del anillo. La pelota se dibuja entre
las dos capas: pasa por delante del tablero y por detrás del aro cercano. Sin este
corte, un enceste no se ve bien.

Conviene además una variante de `hoop-front` con las cadenas desplazadas 2–3
píxeles, para la reacción de la red al embocar.

### 4. Los cuatro amigos

```
ruta:      public/assets/characters/friend-a.png   musculosa gris, shorts violetas
ruta:      public/assets/characters/friend-b.png   musculosa blanca con sol amarillo, shorts azules
ruta:      public/assets/characters/friend-c.png   musculosa roja, shorts negros, vincha roja
ruta:      public/assets/characters/friend-d.png   musculosa negra, shorts verdes
ruta:      public/assets/characters/friend-d-back.png   el mismo, de espaldas
pivote:    pies, centrado horizontalmente
```

**Formato de atlas.** Una grilla: una columna por pose, una fila por tamaño.

- Poses, en este orden: `idle0, idle1, walk0, walk1, walk2, walk3, hold, wind,
  release, follow, cheer`.
- Tamaños, en este orden (altura del personaje en píxeles de arte, para 1,75 m):
  `48, 51, 54, 57, 60, 63, 66, 69`.
- Celda: 73 × 97 px de arte. El punto de apoyo de los pies va a 14 px del borde
  inferior de la celda, centrado.

**Por qué ocho tamaños y no un reescalado:** el personaje mide distinto según lo
lejos que esté de la cámara, y reescalar un bitmap rompe la grilla de píxel. Cada
tamaño se dibuja a ese tamaño. Es el mismo criterio que usa el arte provisional de
hoy, así que el reemplazo es directo.

Invariantes: contextura normal y delgada, **nunca musculosa**; misma cara, misma
ropa y misma escala entre fotogramas; los personajes miran al aro; sin bordes
blancos, sin rectángulos opacos, sin deslizamiento de pies entre `walk0..walk3`.
El escudo del sol de la musculosa B no se espeja.

### 5. Chico de River y perro

```
ruta:      public/assets/characters/kid-river.png   poses: idle0, idle1, cheer
ruta:      public/assets/characters/dog.png         poses: idle0, idle1
pivote:    pies, centrado
```

Atlas horizontal, una celda por pose, celdas del mismo tamaño.

- Chico: 13 años, más bajo que los adultos (≈1,55 m), proporciones adolescentes.
  Equipo completo de River: camiseta blanca con banda roja diagonal y escudo,
  shorts negros, medias largas blancas con detalle rojo, botines.
- Perro: mestizo de aspecto pastor, ≈0,56 m de alzada. Orejas triangulares
  erguidas, hocico alargado oscuro, pelaje marrón oscuro/negro con zonas
  atigradas, pecho crema, puntas blancas en las patas delanteras. **Pelo corto,
  liso y pegado al cuerpo, también en cuello y cola.** Entre `idle0` e `idle1`
  sólo cambia la cola. Usar `references/chubol-perro.png` como fuente de rasgos.

### 6. Pelota

```
ruta:      public/assets/props/ball.png
pivote:    centro
```

Atlas: 6 tamaños (7, 8, 9, 10, 11, 12 px de arte de diámetro) × 4 fotogramas de
rotación. Naranja con costuras oscuras y volumen esférico, en el mismo estilo
arcade. La sombra la dibuja el juego, no va en el sprite.

### 7. Logo

```
ruta:      public/assets/ui/chubol-logo.png
pivote:    centro
```

Recorte limpio de la palabra CHUBOL de la lámina, sin deformar letras: naranja y
amarillo con contorno oscuro, acabado pixel art, identidad de logo arcade.

### 8. Mesa con el trofeo

```
ruta:      public/assets/props/trophy-table.png
pivote:    pies de la mesa, centrado
```

Sólo si la celebración final la necesita separada del fondo. Mesa de madera,
licuadora de base roja y crema con vaso transparente y tapa, bananas, naranjas y
manzanas. **No se reemplaza por una copa, medalla, cofre ni trofeo deportivo.**

### 9. Sonido (opcional)

```
ruta:      public/assets/audio/chain.wav   cadena metálica corta, al pasar por el aro
ruta:      public/assets/audio/board.wav   golpe seco de madera
```

Hoy el juego sintetiza estos sonidos con la Web Audio API, así que funciona sin
ellos. Si aparecen los archivos, quedan mejor.

---

## Cómo verificar el reemplazo

1. Poné los archivos en las rutas de arriba.
2. `pnpm build && pnpm preview`
3. `pnpm capture` — captura el juego real y falla si aparece cualquier error o
   recurso roto en la consola.
4. Entrá a **COMPARACIÓN VISUAL** y apretá `H`: oculta toda la interfaz y deja el
   cuadro determinista a 1536 × 1024, con los cuatro amigos en las posiciones de la
   lámina. Esa captura es la que se compara contra la referencia.
5. Revisar en ese orden: fondo, aro, paredes, cipreses, calle, alambrado, mesa,
   perro, chico y cada adulto. Después bordes de recorte, transparencias, sombras
   residuales, pies flotando, escala con profundidad y duplicación de elementos.
6. Comparar también **en movimiento**: un fotograma quieto lindo no prueba que las
   animaciones funcionen.

El cartel "ARTE PROVISIONAL — MODO DESARROLLO" desaparece solo cuando todos los
recursos del manifiesto están presentes.
