# Especificación visual

## Estado

**El arte ya está y el juego corre adentro de él.** La lámina
`public/assets/backgrounds/chubol-court-clean-v1.png` (1536 × 1024) es el fondo
real del juego. Las tres referencias están en `references/`.

Lo que el juego dibuja encima de la lámina es solamente:

- **los cuatro amigos** — provisionales, generados por código;
- **la pelota de juego** — provisional;
- los anillos punteados de las marcas y la interfaz.

Todo lo demás que ves es tu arte: cancha, líneas, los siete números, aro,
tablero, red de cadenas, paredes, cipreses, alambrado, calle, arbustos, el chico
de River, el perro, la mesa con la licuadora y las frutas, el cajón, la regadera,
la pelota de fútbol decorativa y el logo CHUBOL. **El juego no vuelve a dibujar
nada de eso encima.**

Mientras falten los sprites de los adultos y la pelota, el juego muestra el
cartel **ARTE PROVISIONAL — MODO DESARROLLO**. Desaparece solo cuando esos
archivos existan.

---

## Calibración: cómo se metió el juego adentro del cuadro

La cámara no se eligió, se **midió**. Todo está en `scripts/fitCamera.mjs`.

1. Se recortaron zonas de la lámina a 4×–8× (`scripts/crop.mjs`) y se leyeron las
   posiciones exactas de: las cuatro esquinas de la llave, dónde cruza cada arco
   el eje de la llave, el aro, y las esquinas del tablero.
2. Se resolvieron por mínimos cuadrados los 17 parámetros de cámara y geometría
   (Nelder-Mead con reinicios deterministas).
3. **Error final: 5,5 px RMS sobre el plano del suelo**, o sea unos 10 cm.
4. Los centros de los siete números se midieron a 6× y se proyectaron inversamente
   al suelo: **esas son las posiciones de tiro del juego**, no una reconstrucción
   a partir de la descripción escrita.

Hay una prueba automática (`tests/projection.test.ts`) que falla si alguien mueve
la cámara y las marcas dejan de caer sobre sus números pintados.

### Dos trampas que había que evitar

- **El punto más a la derecha de un círculo proyectado NO es el punto más lejano
  del círculo.** Un círculo se proyecta como elipse. Medir el "vértice" visual de
  los arcos daba 45 px de error. Se miden donde **cruzan el eje de la llave**.
- **Una homografía del suelo no fija la escala.** Una cámara cerca con lente
  corto y una lejos con lente largo dibujan el mismo suelo, y difieren por
  completo en cómo se proyecta un aro de tres metros. Hizo falta un ancla
  vertical.

### La escala: por qué el aro queda en 2,18 m

El ancla vertical son **los cuatro adultos de la referencia**. Tomándolos como
1,75 m, la calibración los reproduce con 5% de error:

| Amigo | Dibujado | Proyectado a 1,75 m |
|---|---|---|
| A (gris/violeta) | 236 px | 248 px |
| B (blanca+sol/azul) | 233 px | 212 px |
| C (roja/negro) | 267 px | 258 px |
| D (negra/verde) | 296 px | 303 px |

Que coincidan entre sí a lo largo de toda la profundidad de la cancha dice que la
perspectiva del dibujo es internamente consistente y que el único grado de
libertad era la escala global.

Con esa escala, **el aro queda a unos 2,18 m**: una canasta casera de patio, no
reglamentaria. La altura del aro nunca me la diste, así que manda el dibujo.

El chico de River sale 1,52 m con la misma calibración — coherente con 13 años.

### Medidas que salieron del arte

| Qué | Valor | De dónde |
|---|---|---|
| Aro | 2,18 m de alto, 0,32 m de radio | anillo de 95 px a 145 px/m |
| Pelota | 0,175 m de radio | 43 px a ~118 px/m en la referencia |
| Llave | 3,07 m de largo, 2,72 m de ancho | esquinas pintadas |
| El aro sobresale | 0,94 m adentro de la línea de fondo | como en una cancha real |

La relación pelota/aro que sale del dibujo es 0,53 — **exactamente** la de una
pelota de básquet real contra un aro real. El dibujo es consistente consigo mismo;
simplemente dibuja todo un poco más grande, como NBA Jam.

---

## Diferencias que encontré entre el arte y lo escrito

Las anoto en vez de resolverlas por mi cuenta.

1. **Las paredes salen más altas en el dibujo que los 30 cm y 50 cm del croquis.**
   Midiendo la pared izquierda en la lámina da del orden del doble. El croquis
   dice claramente "Pared de ladrillo 30cm" (la izquierda) y "50cm" (la del
   frente). El juego usa la geometría del dibujo. Si querés que las paredes se
   respeten como medidas reales, hay que repintarlas más bajas.

2. **Hay un cuarto ciprés en la lámina.** El croquis dibuja tres y el pedido
   original habla de tres cipreses principales. La lámina tiene uno más a la
   derecha. Puede ser "el resto de la vegetación" o puede ser de más.

3. **La lámina limpia no es un parche de la referencia: es un redibujo.** Un
   análisis pixel a pixel da 94,6% de píxeles distintos y algo menos de detalle
   fino. Los cuatro adultos y la pelota efectivamente no están, el 7 quedó
   visible, y las líneas tapadas se reconstruyeron bien (0–3 px de desvío salvo
   en el vértice del arco, donde hay 5–7 px). Pero la red del aro quedó
   redibujada. Nada de esto rompe el juego —la calibración se hizo contra la
   lámina, no contra la referencia— pero conviene saberlo si en algún momento las
   querés superponer.

4. **El 8 está afuera del arco, y eso está bien.** Un análisis automático sugirió
   que el 8 debía ir en el vértice del arco; abrí el croquis y **no**: ahí el 8
   está claramente por fuera del arco, a la derecha. La lámina lo pinta bien y el
   juego lo usa así.

---

## Invariantes que el arte definitivo debe respetar

### Cámara y encuadre

- Vista elevada en tres cuartos, **fija**. No orbita, no rota, no hay cenital.
- Lienzo lógico fijo de **1536 × 1024**, igual que la lámina. En otras pantallas
  se adapta con márgenes (`Phaser.Scale.FIT`): nunca se estira ni se recorta.
- **La cámara está calibrada contra la lámina.** Si se cambia la lámina, hay que
  volver a correr `node scripts/fitCamera.mjs`.

### Capas y orden de dibujo

`DEPTHS` en `src/game/render/courtView.ts`:

```
   0   la lámina entera
  20   anillos punteados de las marcas
  30   sombras de contacto
100+   personajes y pelota, ordenados por profundidad (más cerca = encima)
 900   frente del aro: mitad cercana del anillo y las cadenas
1000   primer plano: pared del frente y arbustos
1200   efectos
2000   interfaz
```

Las dos capas de arriba **se recortan de la propia lámina** con
`scripts/cutLayers.mjs`, no se repintan:

- `court-foreground.png`: todo lo que está por debajo del borde superior de la
  pared del frente, para que tape los pies de quien esté detrás.
- `hoop-front.png`: la mitad cercana del anillo y la red, para que la pelota pase
  **por detrás** al entrar.

### Personajes

Exactamente cuatro adultos, de contextura normal y delgada, **nunca musculosos**.
Identidad constante entre fotogramas.

| # | Vestimenta |
|---|---|
| A | Musculosa gris, shorts violetas |
| B | Musculosa blanca con sol amarillo, shorts azules |
| C | Musculosa roja, shorts negros, vincha roja |
| D | Musculosa negra, shorts verdes |

**Sin tapones.** No hay ni puede haber animación de bloquear un tiro.

El chico y el perro están pintados en la lámina y **no se dibujan de nuevo**. Si
alguna vez se los quiere animar, hay que separarlos del fondo primero.

### Interfaz

- El reloj y las marcas que faltan van **arriba a la izquierda**: el logo CHUBOL
  está pintado en el arte, arriba al centro, y no se tapa.
- Franja fina abajo con turno, marcador e indicación.
- La barra de carga aparece solo mientras se prepara un tiro.
- No hay paneles grandes de jugador ni barras TURBO.
- `H` en la escena de comparación oculta toda la interfaz para capturar.
