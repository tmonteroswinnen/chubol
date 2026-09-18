# Manifiesto de recursos

Estado real al momento de escribir esto: **ningún recurso gráfico existe**. Todo lo
que se ve corre sobre arte provisional generado por código en
`src/game/render/`. El estado lo calcula el build (`scripts/viteChubolAssets.ts`),
no está escrito a mano: si copiás un archivo a su ruta, el juego lo detecta.

## Referencias (las provee el autor del proyecto)

| Archivo | Uso | Tamaño | Estado |
|---|---|---|---|
| `references/chubol-nba-jam.png` | Composición, cámara, personajes, paleta, densidad de píxel | 1536 × 1024 | **falta** |
| `references/chubol-croquis.jpg` | Posiciones y valores de tiro | — | **falta** |
| `references/chubol-perro.png` | Rasgos del perro | — | **falta** |

## Recursos a producir

| Clave | Ruta | Uso | Tamaño | Pivote | Estado |
|---|---|---|---|---|---|
| `plate.background` | `public/assets/backgrounds/court-clean.png` | Fondo limpio, sin jugadores ni pelota ni sombras de ellos | 1536 × 1024 | sup. izq. | **falta** |
| `plate.foreground` | `public/assets/backgrounds/court-foreground.png` | Pared del frente y arbustos que tapan pies y pelota | 1536 × 1024 | sup. izq. | **falta** |
| `hoop.back` | `public/assets/props/hoop-back.png` | Poste, tablero y mitad lejana del anillo | 1536 × 1024 | sup. izq. | **falta** |
| `hoop.front` | `public/assets/props/hoop-front.png` | Mitad cercana del anillo y cadenas | 1536 × 1024 | sup. izq. | **falta** |
| `logo` | `public/assets/ui/chubol-logo.png` | Logo CHUBOL, naranja/amarillo con contorno | variable | centro | **falta** |
| `ball` | `public/assets/props/ball.png` | Pelota: 6 tamaños × 4 rotaciones | atlas | centro | **falta** |
| `character.a` | `public/assets/characters/friend-a.png` | Musculosa gris, shorts violetas — 11 poses × 8 tamaños | atlas 73×97 por celda | pies | **falta** |
| `character.b` | `public/assets/characters/friend-b.png` | Musculosa blanca con sol, shorts azules | atlas 73×97 | pies | **falta** |
| `character.c` | `public/assets/characters/friend-c.png` | Musculosa roja, shorts negros, vincha | atlas 73×97 | pies | **falta** |
| `character.d` | `public/assets/characters/friend-d.png` | Musculosa negra, shorts verdes | atlas 73×97 | pies | **falta** |
| `character.d.back` | `public/assets/characters/friend-d-back.png` | El mismo, de espaldas | atlas 73×97 | pies | **falta** |
| `kid` | `public/assets/characters/kid-river.png` | Chico de 13 con equipo de River — idle0, idle1, cheer | atlas | pies | **falta** |
| `dog` | `public/assets/characters/dog.png` | Perro de pelo corto — idle0, idle1 | atlas | pies | **falta** |
| `trophy` | `public/assets/props/trophy-table.png` | Mesa con licuadora y frutas | variable | pies | **falta** |
| `audio.chain` | `public/assets/audio/chain.wav` | Cadena metálica al embocar | — | — | **falta** (hoy sintetizado) |
| `audio.board` | `public/assets/audio/board.wav` | Golpe de madera | — | — | **falta** (hoy sintetizado) |

## Poses de los adultos

Orden de columnas del atlas:

`idle0` · `idle1` · `walk0` · `walk1` · `walk2` · `walk3` · `hold` · `wind` ·
`release` · `follow` · `cheer`

## Tamaños de los adultos

Orden de filas del atlas, altura del personaje en píxeles de arte (1,75 m):

`48` · `51` · `54` · `57` · `60` · `63` · `66` · `69`

Se elige el tamaño más cercano según la profundidad. **No se reescala**: cada
tamaño está dibujado a ese tamaño, para que la grilla de píxel no cambie entre el
fondo y los personajes.

## Procedencia

Nada de esto fue generado en esta sesión. No hay herramienta de imagen disponible
y no se contrató ningún servicio. Las especificaciones y los prompts de producción
están en [`ASSET_REQUESTS.md`](ASSET_REQUESTS.md).
