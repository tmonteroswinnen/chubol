# Manifiesto de recursos

El estado lo calcula el build (`scripts/viteChubolAssets.ts`) escaneando el disco,
no está escrito a mano: si copiás un archivo a su ruta, el juego lo detecta.

## Arte entregado, en uso

| Ruta | Qué es | Tamaño | Procedencia |
|---|---|---|---|
| `public/assets/backgrounds/chubol-court-clean-v1.png` | La cancha entera salvo los cuatro adultos y la pelota | 1536 × 1024 | entregada por el autor |
| `public/assets/backgrounds/court-foreground.png` | Pared del frente y arbustos: tapan los pies | 1536 × 1024 | recortada de la lámina por `scripts/cutLayers.mjs` |
| `public/assets/props/hoop-front.png` | Mitad cercana del anillo y la red de cadenas | 1536 × 1024 | recortada de la lámina por `scripts/cutLayers.mjs` |

## Referencias

| Ruta | Uso |
|---|---|
| `references/chubol-nba-jam.png` | Composición, personajes, paleta. De acá salieron las posiciones y la escala. |
| `references/chubol-croquis.jpg` | Croquis original. Confirma las siete marcas y que el 8 va por fuera del arco. |
| `references/chubol-perro.png` | Rasgos del perro. |

## Lo que falta producir

| Ruta | Qué | Formato |
|---|---|---|
| `public/assets/characters/friend-a.png` | Musculosa gris, shorts violetas | atlas de 11 poses, celdas de 281 × 352 |
| `public/assets/characters/friend-b.png` | Musculosa blanca con sol, shorts azules | ídem |
| `public/assets/characters/friend-c.png` | Musculosa roja, shorts negros, vincha | ídem |
| `public/assets/characters/friend-d.png` | Musculosa negra, shorts verdes | ídem |
| `public/assets/characters/friend-d-back.png` | El mismo D, de espaldas | ídem |
| `public/assets/props/ball.png` | Pelota de juego | atlas de 6 rotaciones, celdas de 48 × 48 |
| `public/assets/audio/chain.wav` | Cadena metálica al embocar | opcional (hoy sintetizado) |
| `public/assets/audio/board.wav` | Golpe de madera | opcional (hoy sintetizado) |

Poses del atlas, en orden:

`idle0` · `idle1` · `walk0` · `walk1` · `walk2` · `walk3` · `hold` · `wind` ·
`release` · `follow` · `cheer`

Especificaciones completas, invariantes y cómo verificar el reemplazo:
[`ASSET_REQUESTS.md`](ASSET_REQUESTS.md).

## Medidas que salieron del arte

| Qué | Valor | Cómo se midió |
|---|---|---|
| Altura del aro | 2,18 m | escala fijada por los cuatro adultos a 1,75 m |
| Radio del aro | 0,32 m | anillo de 95 px a 145 px/m |
| Radio de la pelota | 0,175 m | 43 px a ~118 px/m en la referencia |
| Llave | 3,07 × 2,72 m | esquinas pintadas, a 4× de zoom |
| Error de calibración | 5,5 px RMS en el suelo | `node scripts/fitCamera.mjs` |
