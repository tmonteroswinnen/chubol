# Recursos gráficos que faltan

## Qué ya está resuelto

La lámina que dejaste (`chubol-court-clean-v1.png`, 1536 × 1024) **es el fondo del
juego**. Se calibró la cámara contra ella con 5,5 px de error sobre el suelo, y de
la misma lámina se recortaron dos capas más sin repintar nada:

| Archivo | Cómo se hizo |
|---|---|
| `public/assets/backgrounds/court-foreground.png` | Todo lo que queda por debajo del borde superior de la pared del frente. Tapa los pies de quien esté detrás. |
| `public/assets/props/hoop-front.png` | La mitad cercana del anillo y la red de cadenas. La pelota pasa por detrás al entrar. |

Ambos los regenera `node scripts/cutLayers.mjs` a partir de la lámina, así que si
cambiás la lámina se vuelven a cortar solos.

---

## Lo único que falta: los cuatro amigos y la pelota

Esta sesión **no tiene generación ni edición de imágenes** (verifiqué las
herramientas disponibles: Node, pnpm, Git y Chrome, que uso para capturas y
revisión de consola). Los sprites hay que producirlos afuera y copiarlos.

Mientras tanto el juego dibuja figuras provisionales por código, marcadas con el
cartel **ARTE PROVISIONAL — MODO DESARROLLO**. Funcionan para jugar y probar las
reglas, pero no son el arte.

### Los cuatro adultos

```
public/assets/characters/friend-a.png        musculosa gris, shorts violetas
public/assets/characters/friend-b.png        musculosa blanca con sol amarillo, shorts azules
public/assets/characters/friend-c.png        musculosa roja, shorts negros, vincha roja
public/assets/characters/friend-d.png        musculosa negra, shorts verdes
public/assets/characters/friend-d-back.png   el mismo D, de espaldas
```

**Formato:** un atlas horizontal por personaje, once celdas iguales, en este
orden:

`idle0` · `idle1` · `walk0` · `walk1` · `walk2` · `walk3` · `hold` · `wind` ·
`release` · `follow` · `cheer`

**Tamaño:** dibujalos con el personaje de **300 px de alto** dentro de una celda
de **281 × 352 px**, con el punto de apoyo de los pies a 26 px del borde inferior
de la celda y centrado horizontalmente. El juego los escala según la profundidad;
300 px es el tamaño más grande que va a necesitar, así que siempre reduce, nunca
agranda.

**Escala de referencia:** en la lámina, un adulto mide entre 212 y 303 px según
dónde esté parado. Los que están más al frente son más grandes.

**Invariantes:**

- Contextura **normal y delgada**, nunca musculosa. La referencia a NBA Jam es de
  lenguaje visual y energía, no de anatomía.
- Misma cara, misma ropa, misma escala entre fotogramas. Nada de parpadeos de
  ropa, cambios de talla ni bordes blancos.
- Miran hacia el aro (a la izquierda del cuadro).
- Pies apoyados, sin deslizamiento entre `walk0..walk3`.
- El sol de la musculosa de B no se espeja.
- **Ningún fotograma de tapón, bloqueo ni marca encima del tirador.**
- Transparencia real, sin fondo pegado ni halo.

**Poses, qué es cada una:**

| Pose | Qué hace |
|---|---|
| `idle0`, `idle1` | quieto, respirando |
| `walk0..walk3` | ciclo de caminata completo |
| `hold` | con la pelota, listo |
| `wind` | flexionando para tirar |
| `release` | soltando, brazos arriba |
| `follow` | terminando el tiro |
| `cheer` | festejo corto |

### La pelota

```
public/assets/props/ball.png
```

Atlas horizontal de 6 fotogramas de rotación, cada uno de **48 × 48 px** con la
pelota de 44 px de diámetro centrada. Naranja con costuras oscuras y volumen, en
el mismo estilo que la de la referencia. La sombra la dibuja el juego.

**Tamaño de referencia:** en la referencia la pelota mide 43 px de diámetro en la
mano del amigo de rojo.

### Sonido (opcional)

```
public/assets/audio/chain.wav    cadena metálica corta al embocar
public/assets/audio/board.wav    golpe seco de madera
```

Hoy el juego sintetiza estos sonidos con la Web Audio API, así que funciona sin
ellos. Si aparecen los archivos, quedan mejor.

---

## Si además querés retocar la lámina

Tres cosas que encontré comparando la lámina con el croquis y con lo que me
escribiste. Ninguna rompe el juego; las dejo para que decidas vos.

1. **Las paredes están más altas que los 30 cm y 50 cm del croquis** — del orden
   del doble. Si querés que se respeten, hay que repintarlas más bajas, y después
   volver a correr `node scripts/fitCamera.mjs`.
2. **Hay un cuarto ciprés** a la derecha. El croquis dibuja tres.
3. **La red del aro quedó redibujada** respecto de la referencia. Si te importa
   que sea idéntica, conviene volver a recortarla de la referencia.

---

## Cómo verificar el reemplazo

1. Copiá los archivos a las rutas de arriba.
2. `pnpm build` y, en otra terminal, `pnpm preview`.
3. `pnpm capture` — saca capturas del juego real y **falla si aparece cualquier
   error, advertencia o recurso roto en la consola**.
4. Entrá a **COMPARACIÓN VISUAL** y apretá `H`: oculta la interfaz y deja el
   cuadro determinista a 1536 × 1024, con los cuatro amigos en las posiciones
   medidas de la referencia. Esa captura es la que se compara.
5. Revisá bordes de recorte, transparencias, pies flotando, escala con
   profundidad y continuidad de cara y ropa entre fotogramas.
6. Comparalo también **en movimiento**: un fotograma quieto lindo no prueba que
   las animaciones funcionen.

El cartel de arte provisional desaparece solo cuando todos los archivos del
manifiesto están presentes.
