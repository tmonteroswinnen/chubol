# Publicar CHUBOL

El juego se publica solo en **GitHub Pages** cada vez que hacés push. La receta
entera está en [`.github/workflows/publicar.yml`](../.github/workflows/publicar.yml).

La dirección queda:

```
https://tmonteroswinnen.github.io/chubol/
```

Ese link se puede mandar por WhatsApp y se abre en cualquier teléfono. Como es
HTTPS, **se puede instalar en la pantalla de inicio y se juega sin conexión**,
que es justo lo que no se podía haciendo `pnpm celular` por la red de casa.

## Los dos pasos que hay que hacer una sola vez, a mano

Los tengo que hacer vos porque son de tu cuenta de GitHub:

1. **Hacer el repositorio público.**
   `Settings` → abajo de todo, `Danger Zone` → `Change repository visibility` →
   `Make public`.
   GitHub Pages sobre un repositorio privado necesita plan pago; con el repo
   público es gratis.

2. **Decirle a Pages que use la receta.**
   `Settings` → `Pages` → `Build and deployment` → `Source`: **GitHub Actions**.

   La receta lo intenta activar sola (`enablement: true`), así que si el push
   llega antes que este paso igual sale bien. La primera vez no fue así y la
   corrida falló: el push llegó un minuto antes de que el interruptor existiera.

Listo. En `Actions` vas a ver el despliegue corriendo; tarda un par de minutos la
primera vez.

## Qué hace la receta

En cada push a `chubol-primera-version` o a `main`:

1. Instala las dependencias con el lockfile.
2. **Corre los tests.** Si algo falla, no publica. Las reglas y la física tienen
   81 tests; no quiero que una versión rota llegue al link que compartiste.
3. Construye con `pnpm run build:publicar`.
4. Sube el resultado a Pages.

## Qué NO se publica

`build:publicar` deja afuera la carpeta `references/`: la ilustración original,
el croquis y la foto del perro. Son material tuyo, son insumo del trabajo y no
parte del juego, y pesan 7,1 MB contra 5,6 de todo el resto. El sitio publicado
pasa de 13 MB a 5,6.

La pantalla de `COMPARACIÓN VISUAL` en el sitio publicado dice, correctamente,
que no hay referencia contra la cual comparar. Corriendo el juego en tu máquina
sigue funcionando completa.

> Ojo: el **repositorio** público sí incluye `references/`, porque están
> versionadas. Si no querés eso, hay que sacarlas del repo (y de su historia)
> antes de hacerlo público.

## Probarlo antes de publicar

```bash
pnpm run build:publicar   # el mismo build que se publica
pnpm test:subruta         # lo sirve desde /chubol/ y lo juega
```

`test:subruta` es el que importa: GitHub Pages sirve el juego desde una
subcarpeta, no desde la raíz, y un juego con rutas absolutas ahí es una pantalla
negra. Comprueba que arranca, que carga la lámina, que se puede jugar, que el
service worker se registra con el alcance correcto y que después arranca **sin
conexión**.

## Actualizarlo

```bash
git push
```

Nada más. El despliegue se dispara solo.

## Si algo sale mal

- **Pantalla negra en el link.** Casi seguro son rutas: el proyecto usa
  `base: './'` en `vite.config.ts` justamente para esto. `pnpm test:subruta` lo
  detecta antes de subir.
- **Se ve una versión vieja.** El service worker guarda el juego para jugarlo sin
  conexión. Pide la página por red primero, así que con una recarga alcanza; si
  no, `Ctrl+Shift+R`.
- **El despliegue no arranca.** Revisá que `Settings → Pages → Source` diga
  `GitHub Actions` y no `Deploy from a branch`.
