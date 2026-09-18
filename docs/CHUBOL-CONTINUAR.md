# CHUBOL — referencias disponibles y continuación del trabajo

Continuá el proyecto en el checkout actual de `tmonteroswinnen/chubol`. Este archivo complementa el prompt extenso que ya recibiste; no te estoy pidiendo crear ni clonar otro repositorio.

## 1. Verificá los archivos que acabo de incorporar

Abrí e inspeccioná realmente:

- `references/chubol-nba-jam.png`: referencia gráfica principal, pixel art detallado de arcade noventoso, parecido a NBA Jam. Es la última versión aprobada con cuatro adultos delgados, chico de River, perro de pelo corto, alambrado, calle recta y licuadora con frutas.
- `references/chubol-croquis.jpg`: dibujo original de la cancha y ubicaciones de puntaje. Está girado; se lee rotándolo 90 grados en sentido antihorario.
- `references/chubol-perro.png`: foto de referencia del perro; no define el estilo gráfico del juego.
- `public/assets/backgrounds/chubol-court-clean-v1.png`: primera versión del escenario sin los cuatro adultos, sin la pelota de básquet y con el 7 visible. Es un asset inicial para integrar, no solamente otra referencia.

Si no aparecen, mostrá el directorio de trabajo real y buscá esas rutas dentro del checkout. Verificá si quedó una carpeta contenedora del ZIP entre la raíz del repo y `references/`. No vuelvas a buscar indiscriminadamente en Downloads ni concluyas que los archivos no existen sin revisar dónde se extrajo el paquete.

## 2. Dirección visual definitiva

Conservá el estilo de `chubol-nba-jam.png`: arcade parecido a NBA Jam, pixel art rico, sprites detallados, cámara fija en tres cuartos, mismo patio y paleta. La versión hiperrealista no es la referencia. El nuevo fondo no autoriza a cambiar personajes, reglas o escenario.

El fondo limpio y la referencia principal miden 1536 × 1024. Comparalos para calibrar el juego. El fondo fue preparado como una primera edición: revisá diferencias y no declares que cada píxel es idéntico al original.

## 3. Qué resuelve el fondo y qué sigue pendiente

El fondo ya no tiene los cuatro jugadores adultos ni su pelota. Podés usarlo para desarrollar y probar composición, cámara, proyección y mecánica del tiro sin dejar copias de los adultos pegadas atrás de los sprites.

Contiene de forma estática:

- El chico de River y el perro: no dibujes copias encima. Si más adelante van a animarse, será necesaria una nueva separación del fondo.
- El logo CHUBOL: no superpongas otro logo.
- Las paredes, arbustos, tablero y aro, con la mesa de la licuadora y las frutas.
- Los siete valores de tiro: 2, 3, 4, 5, 6, 7 y 8.
- La pelota de fútbol decorativa del frente: no es la pelota de juego.

Todavía no es un paquete completo de producción. Faltan:

1. Sprites y animaciones de los cuatro amigos: reposo, movimiento, sostener pelota, preparar/lanzar y reacción.
2. Pelota de juego independiente con escala, rotación y sombra adecuadas.
3. Máscaras/capas de primer plano y del aro para oclusión correcta.
4. Audio, si no hay recursos disponibles en el repo.

No afirmes que hay sprites animados si solo existen estas cuatro imágenes. No suplantes el estilo por figuras básicas ni presentes el fondo estático como un videojuego terminado.

## 4. Cómo trabajar sin generación de imágenes en tu sesión

Tu tarea es programar, integrar y verificar. La producción gráfica que requiera generación/edición de imágenes puede resolverse fuera de esa sesión y luego incorporarse al repo.

No necesitás instalar una API de imágenes ni inventar credenciales. Prepará `docs/ASSET_REQUESTS.md` solo con los recursos realmente faltantes, indicando por cada uno: filename, dimensiones, transparencia, encuadre, pivote de pies, escala relativa, poses/direcciones, animación/fotogramas necesarios y reglas de continuidad de cara, ropa y pixel art. Priorizá el recurso mínimo necesario para el siguiente hito; no pidas todo de golpe.

Continuá en paralelo con las partes que no requieren esos recursos: inicialización del proyecto si sigue vacío, carga del fondo, vista de comparación, coordenadas de cancha, ubicaciones de tiro, física, puntajes, turnos y pruebas. Una escena técnica provisional puede servir para verificar la lógica, identificada como tal; no debe confundirse con la entrega gráfica final.

## 5. Próximo resultado concreto

1. Confirmá que pudiste abrir los cuatro archivos y mostrás conocimiento real de sus contenidos.
2. Leé el prompt original y las instrucciones existentes del repo.
3. Si todavía solo hay README y prompt, inicializá el proyecto como estaba previsto: no tener package.json no es por sí mismo un bloqueo.
4. Montá el fondo limpio en una aplicación ejecutable, con la relación 3:2, sin estirar ni recortar elementos importantes.
5. Calibrá las siete posiciones y el aro; validá escalado e input.
6. Implementá el siguiente tramo funcional posible y documentá qué recurso artístico limita la animación completa.
7. Mostrá una captura real de la aplicación y los comandos de ejecución, sin presentar el archivo de referencia como una captura del juego.

Mantené como pendientes las reglas históricas aún no respondidas y usá únicamente las hipótesis de prototipo claramente identificadas en el prompt original. No hay tapones. La licuadora y las frutas son el trofeo.

No necesito que te detengas otra vez en el diagnóstico inicial si las referencias ya están presentes: verificá los archivos y avanzá con estos recursos.
