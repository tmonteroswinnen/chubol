# CHUBOL — construir el videojuego dentro de este repositorio

Quiero que construyas un videojuego jugable llamado **CHUBOL**, basado en un juego que practicábamos con mis amigos en el patio de mi casa. Trabajá directamente en el repositorio de GitHub **`tmonteroswinnen/chubol`**, que ya está clonado y abierto en esta sesión. No necesito instrucciones para crear ni clonar el repositorio: necesito que inspecciones lo que hay, implementes el juego, lo ejecutes y lo pruebes.

Asumí el trabajo de desarrollo del juego, integración de arte y verificación visual. Hablame en español. No te quedes en una propuesta, un documento de diseño o una pantalla de presentación: avanzá hasta tener una primera versión realmente jugable, señalando con precisión cualquier impedimento real.

## 1. Prioridad principal: tiene que verse como la imagen

**La fidelidad gráfica a la referencia es el requisito más importante. Quiero que la cancha y la escena se vean iguales a la imagen adjunta.**

La referencia visual definitiva es la última versión **arcade en pixel art, con estética parecida a NBA Jam de los años noventa**, anterior a la reinterpretación hiperrealista. La versión hiperrealista fue una exploración aparte: **no es la dirección de arte del videojuego**. Quiero que el juego se vea como nuestra ilustración CHUBOL estilo NBA Jam, con todos los cambios ya acordados.

La dirección de arte debe mantener:

- Sprites 2D detallados, sombreado con volumen y estética de arcade deportivo de los noventa, con un toque de sprites digitalizados como NBA Jam.
- Pixel art rico y legible, con el mismo nivel de detalle de la referencia. No reducirlo a muñecos de pocos píxeles, dibujos infantiles o un estilo 8-bit genérico.
- Colores vivos: verdes del pasto y los cipreses, ladrillo rojizo, cielo azul y título naranja/amarillo.
- Bordes nítidos y densidad de píxel consistente entre fondo, personajes, perro, pelota y objetos. No mezclar recortes fotográficos con sprites ni aplicar desenfoque para disimular assets.
- Perspectiva elevada en tres cuartos y presentación arcade de cancha completa.
- Animación ágil, expresiva y fácil de leer, conservando los cuerpos delgados/normales que pedí. La inspiración NBA Jam no autoriza a volver a personajes musculosos.
- Identidad propia de CHUBOL: mismo patio, aro de cadenas, perro, chico de River y licuadora como trofeo.

NBA Jam es la referencia de lenguaje visual y energía. **Las mecánicas siguen siendo las de CHUBOL**: no agregues tapones, volcadas, turbo, fuego, power-ups o reglas NBA por asociación con ese juego.

No interpretes “parecido” como permiso para hacer otra cancha, cambiar la perspectiva, reemplazar a los personajes por muñecos, crear una escena low poly o armar un prototipo con círculos y rectángulos. Tampoco sirve mostrar la imagen completa y simular que es un juego mediante botones: tienen que existir personajes independientes, una pelota independiente y una mecánica jugable.

Entiendo que, cuando los personajes se muevan, los fotogramas serán distintos de la referencia estática. La exigencia de “igual” se refiere a composición, cámara, escenario, personajes, materiales, escala, iluminación, colores y calidad visual. Implementá además una escena de comparación que reproduzca las posiciones de la referencia para poder evaluar esa fidelidad.

No prometas identidad píxel a píxel si no la podés demostrar. Si faltan recursos artísticos, tratá eso como una dependencia concreta de producción; no lo escondas sustituyendo el estilo.

## 2. Referencias que debés abrir antes de diseñar

Las referencias se encuentran en estas rutas relativas al repositorio:

| Archivo | Función |
| --- | --- |
| `references/chubol-nba-jam.png` | Referencia visual principal: última imagen arcade de CHUBOL, con cuatro adultos delgados, chico de River, perro de pelo corto y alambrado. Imagen de 1536 × 1024, relación 3:2. Gobierna composición, cámara, personajes, paleta, densidad de píxel y acabado. |
| `references/chubol-croquis.jpg` | Croquis original de la cancha. Sirve para interpretar posiciones de tiro y elementos del lugar, especialmente los que alguna figura tape en la imagen final. Giralo mentalmente 90 grados en sentido antihorario para leerlo. |
| `references/chubol-perro.png` | Referencia de apariencia del perro. Conservá sus rasgos, con el pelo corto solicitado para el juego. |

Abrí e inspeccioná las imágenes realmente. No alcanza con leer sus nombres. Si las rutas cambiaron, buscá esos archivos dentro del checkout. Si alguna referencia no está disponible, decime exactamente cuál falta; no inventes haberla visto.

Orden para resolver diferencias:

1. Mis instrucciones explícitas de este mensaje y cualquier corrección posterior.
2. La imagen arcade `chubol-nba-jam.png` para el aspecto visual; no la versión hiperrealista.
3. El croquis para las posiciones y valores de tiro.
4. La foto del perro para sus rasgos.
5. Tus decisiones técnicas, que deben respetar todo lo anterior.

No uses versiones antiguas para restaurar cosas que ya se eliminaron, como las casas, la pared de atrás, los marcadores superiores o el cartel de amigos.

## 3. Primero inspeccioná el proyecto

Antes de modificar archivos:

- Leé las instrucciones existentes del repositorio, incluyendo `CLAUDE.md`, `AGENTS.md`, README y documentos relevantes, si existen.
- Revisá estructura, estado de Git, rama actual, tecnologías, scripts, dependencias, lockfile y recursos gráficos disponibles.
- Respetá cambios locales y código útil existente. No reinicies el proyecto ni reemplaces archivos de instrucciones a ciegas.
- Reutilizá el gestor de paquetes y la arquitectura existentes si son adecuados.
- Si el repositorio está vacío, inicializá una estructura pequeña y clara para un juego web.
- No asumas que tenés generación de imágenes, edición generativa, Blender, un navegador automatizado o servicios externos: verificá qué herramientas están disponibles de verdad.

Después de esa inspección, comunicá brevemente qué encontraste, qué enfoque visual elegís y cuál es el primer resultado que vas a implementar. Continuá trabajando sin esperar confirmaciones para decisiones técnicas rutinarias.

## 4. Escenario: especificación visual obligatoria

### Cámara y composición

- Vista elevada en tres cuartos, fija, igual a la referencia; la cancha completa debe entrar en escena.
- Aro y tablero a la izquierda; espacio de juego extendiéndose hacia la derecha.
- Pared baja y arbustos en primer plano; cipreses y camino de tierra al fondo.
- Conservá la relación 3:2 del arte. En otras pantallas, adaptá con márgenes, sin estirar la imagen ni recortar el aro, el perro o el trofeo.
- No agregues cámara orbital, rotación libre, perspectiva cenital ni desplazamiento que muestre partes del mundo no definidas por la referencia.
- Conservá el título **CHUBOL**, grande, naranja/amarillo con contorno oscuro y acabado pixel art, en la parte superior central. Debe mantener su identidad de logo arcade y no convertirse en una tipografía web genérica.

### Cancha, aro y límites

| Elemento | Aspecto y ubicación que debés conservar |
| --- | --- |
| Superficie | Pasto natural representado en pixel art detallado, ligeramente irregular, con variaciones y zonas gastadas. Nunca parquet, cemento o asfalto. |
| Líneas | Blancas, de apariencia pintada sobre el pasto, con desgaste natural. Rectángulo de la llave, extremo redondeado y arco exterior como en la referencia. |
| Puntajes sobre el piso | Ubicaciones con valores 2, 3, 4, 5, 6, 7 y 8. El 7 puede estar tapado en la imagen; el croquis permite ubicarlo. |
| Aro | Un solo aro, a la izquierda. Aro metálico y red de cadenas metálicas, con eslabones reconocibles. |
| Tablero | Rectangular, de tablones de madera rústica y envejecida, con marca blanca sencilla. No vidrio ni acrílico moderno. |
| Soporte | Estructura simple de madera, con aspecto casero, como en la imagen. |
| Pared izquierda | Ladrillo visto bajo, aproximadamente 30 cm de altura. |
| Pared del frente | Ladrillo visto bajo, aproximadamente 50 cm de altura, con arbustos por fuera. |
| Fondo | No hay pared de ladrillos en el fondo. |

Las alturas de paredes provienen de la descripción del lugar. El largo, ancho y altura real del aro no se proporcionaron: calibrá proporciones visuales sin presentar medidas inventadas como datos históricos.

### Fondo y entorno

- Tres cipreses principales anchos y frondosos, en las posiciones de la imagen. Conservá el resto de la vegetación de fondo sin sumar nuevos árboles protagonistas.
- Entre esos cipreses y la calle: alambrado de campo, con postes de madera y alambres horizontales finos. Debe verse a través de los espacios entre árboles.
- Detrás del alambrado: una sola calle de tierra **recta y paralela al lateral largo de la cancha**. No se curva al llegar a la derecha.
- Sin casas, edificios, autos, tribunas, instalaciones deportivas profesionales ni mobiliario nuevo.
- Luz diurna cálida, sombras consistentes y materiales naturales. Conservá la atmósfera de un patio argentino.
- Mantené los pequeños elementos existentes: regadera, pelota de fútbol en el frente y cajón de madera de la derecha con “CHUBOL SIEMPRE”. La pelota de fútbol es decoración; no es una segunda pelota de juego.

### Cuatro amigos adultos

Exactamente cuatro adultos dentro de la cancha. De piel clara y contextura normal, delgados, sin musculatura exagerada. No son jugadores profesionales ni caricaturas musculosas. Mantener sus diferencias y vestimenta:

| Personaje | Vestimenta | Posición de referencia |
| --- | --- | --- |
| A | Musculosa gris y shorts violetas | Izquierda, dentro de la llave. |
| B | Musculosa blanca con sol amarillo y shorts azules | Zona posterior central. |
| C | Musculosa roja, shorts negros y vincha roja | Centro-derecha, sosteniendo la pelota. |
| D | Musculosa negra y shorts verdes | Primer plano derecho, visto desde atrás. |

Esas posiciones son las del encuadre de comparación; en el juego podrán cambiar para tirar. Mantener escala, identidad visual, caras, ropa e iluminación al animarlos. Evitar que se transformen en otras personas entre fotogramas.

No se permiten tapones: no crees animaciones ni acciones de bloquear el lanzamiento de otro. Los personajes esperan o se desplazan a su posición, sin escenas de choque, marcaje encima del tirador o disputa física. Para el primer prototipo, el lanzamiento se realiza de pie; no hace falta incorporar saltos o volcadas.

### Chico de River y perro

- Un chico de **13 años**, más bajo y de proporciones adolescentes, mira desde el costado derecho junto al perro. Es espectador, no un quinto participante.
- Equipo completo de River Plate: camiseta blanca con banda roja diagonal y escudo, shorts negros, medias largas blancas con detalles rojos y botines.
- El perro debe parecerse a su foto: mestizo de aspecto pastor, orejas triangulares erguidas, hocico alargado oscuro, pelaje marrón oscuro/negro con zonas atigradas, pecho blanco o crema y puntas blancas en las patas delanteras.
- **Pelo corto, liso y pegado al cuerpo**, también en cuello y cola. No convertirlo en un pastor de pelo largo ni en un labrador de orejas caídas.
- Mantenerlos juntos y visibles a la derecha. Sus animaciones ambientales pueden ser mínimas y no deben interferir en tiros o puntajes.
- Total de personas de la escena: cuatro adultos más el chico, cinco. Un solo perro.

### El trofeo

En el extremo derecho hay una mesa de madera con **una licuadora eléctrica y frutas al lado**. Ese era nuestro trofeo y es un detalle esencial.

- Licuadora con base roja y crema, vaso transparente y tapa, como en la imagen.
- Bananas, naranjas y manzanas sobre la misma mesa.
- No reemplazar por copa, medalla, cofre, moneda o trofeo deportivo genérico.
- En la celebración final, destacar esta mesa sin cambiar la cámara principal ni inventar otro escenario.
- No recuperar el cartel de madera que decía “Buenos amigos, mejores partidos”.

## 5. Estrategia gráfica: conservar el arte y hacerlo jugable

Elegí la técnica en función de la fidelidad, no por preferencia de motor. Mi enfoque preferido para esta primera versión es **2.5D con cámara fija**: escenario arcade en pixel art preparado por capas, elementos separados, sprites de personajes animados y pelota con posición y altura simuladas.

El motor 2D debe mostrar arte del nivel de la referencia, no gráficos básicos por comodidad. La imagen, las texturas y los sprites deben tener el mismo lenguaje visual, sombreado y tamaño de píxel. Elegí resolución lógica y filtrado a partir del archivo real; evitá suavizado borroso, escalados distintos entre capas y reducir el detalle arbitrariamente para que parezca “retro”. Si usás nearest-neighbor, verificá que conserva el aspecto de la referencia en los tamaños de pantalla probados.

No reconstruyas todo con primitivas 3D si eso deteriora el parecido. Una implementación 3D completa solo tendría sentido si ya existe una base adecuada y podés demostrar el mismo acabado visual sin convertir esta primera versión en un proyecto mucho mayor.

### Preparación de recursos

Antes de duplicar personajes sobre la imagen, resolvé cómo separar el escenario de los elementos móviles:

1. Conservá los archivos de referencia originales intactos.
2. Prepará una **placa limpia del fondo**, sin los cuatro jugadores ni la pelota de básquet y sin sus sombras fijas. Reconstruí coherentemente el pasto y las líneas que estaban ocultos.
3. Si el perro o el chico van a animarse, también deben separarse del fondo y removerse sus siluetas y sombras originales. Si permanecen estáticos en la primera versión, documentá esa decisión y no superpongas copias.
4. Separá el título y los elementos de primer plano cuando sea necesario para composición y oclusión.
5. Prepará personajes con transparencia real y animaciones coherentes. Un recorte rectangular con fondo pegado, un muñeco estirado o una imagen estática deslizándose no equivalen a una animación terminada.
6. Prepará la pelota como objeto independiente, con tamaño y sombra coherentes con la perspectiva.
7. Separá las partes del aro que deban quedar delante y detrás de la pelota para que un enceste se vea correctamente.

Inventario mínimo orientativo, adaptándolo a la estructura existente:

| Recurso | Requisitos |
| --- | --- |
| Fondo limpio | Misma cámara, luz, encuadre y tamaño lógico que la referencia. Sin jugadores duplicados ni sombras residuales. |
| Máscara de primer plano | Pared, arbustos y obstáculos que oculten correctamente pies o pelota. |
| Aro/tablero | Capas suficientes para oclusión y una pequeña reacción de las cadenas al encestar. |
| Logo | Recorte limpio de CHUBOL, sin deformar letras. |
| Cuatro personajes | Identidad y ropa constantes; reposo, desplazamiento, sostener pelota, preparar tiro, lanzar, terminar tiro y reacción breve. |
| Pelota | Sprite detallado con volumen en el mismo estilo arcade, escala, rotación y sombra separadas. |
| Perro/chico | Recursos separados solo si se animan; respetar sus posiciones y aspecto. |
| Trofeo | La mesa y licuadora originales, separadas únicamente si lo necesita la celebración. |

Para animaciones: definí pivote a la altura de los pies, escala, fotogramas, direcciones necesarias y uniones de bucles. Evitá parpadeos de cara/ropa, cambios de talla, bordes blancos, rectángulos opacos y deslizamiento de pies. No espejes texto o escudos de forma incorrecta para ahorrar direcciones.

Creá un manifiesto de assets con archivo, uso, dimensiones, pivote, estado de producción y procedencia. No asumas que una sola imagen permite recuperar automáticamente las partes del cuerpo que no se ven ni generar una marcha convincente.

### Si no tenés herramientas para producir los assets

Verificá primero los recursos del repo y las herramientas disponibles. Si no podés hacer una edición o animación del nivel necesario:

- Explicá exactamente qué recurso falta y por qué impide alcanzar la referencia.
- Prepará `docs/ASSET_REQUESTS.md` con nombre de archivo esperado, dimensiones, transparencia, poses/direcciones, invariantes visuales y un prompt de producción preciso por recurso.
- Separá los pedidos: fondo limpio, personajes, animaciones y máscaras. No pidas “todo el juego” como una sola imagen.
- Continuá con física, reglas, carga de assets, composición, controles y pruebas que no dependan del recurso faltante.
- Cualquier recurso técnico provisional debe vivir en un modo de desarrollo identificado; no lo presentes como el arte final ni lo conviertas silenciosamente en la versión por defecto.
- Podés mostrar la referencia intacta en una vista de comparación o presentación, pero no afirmar que esa vista es el juego implementado.

No inventes haber generado imágenes, utilizado una API o comprobado animaciones si no ocurrió. No contrates servicios pagos ni supongas credenciales disponibles.

## 6. Reglas confirmadas y cuestiones pendientes

**Confirmado por mí:**

- Se llama CHUBOL y nace de un juego real entre amigos en esta cancha de pasto.
- Se usa un solo aro.
- Embocar desde diferentes lugares vale distintos puntos.
- No se pueden hacer tapones.
- La licuadora y las frutas son el trofeo.
- Quiero los cuatro amigos representados en el videojuego y el chico como espectador.

**Todavía no está confirmado:**

- Si “de a dos” significaba dos participantes, parejas de dos u otra organización. Que la imagen tenga cuatro adultos no resuelve esa regla.
- Si se tiraba por turnos, cómo cambiaba la posesión, si había pases o rebotes disputados.
- Si los valores corresponden a marcas de tiro concretas o a regiones completas.
- Cómo se ganaba, cuántos puntos o lanzamientos había y qué ocurría con empates.

No rellenes esos huecos con reglas de NBA, streetball o NBA Jam. En tu primera actualización, agrupá las dudas en un máximo de tres preguntas breves:

1. ¿La partida era individual o por parejas, y cómo se alternaban los tiros o la pelota?
2. ¿Los números eran lugares concretos para tirar o zonas completas de la cancha?
3. ¿Cómo se ganaba y qué pasaba con un tiro errado, un rebote o un empate?

Mientras no responda, seguí desarrollando con las hipótesis de prototipo de la siguiente sección. Registralas como **provisionales**, sin presentarlas como las reglas históricas de CHUBOL. Cuando conteste, ajustá configuración y lógica sin rehacer el juego.

### Ubicaciones de puntaje

| Puntos | Posición según el croquis |
| --- | --- |
| 2 | Dentro de la llave, cerca del aro. |
| 3 | Cerca del aro, hacia el lateral del fondo/cipreses. |
| 4 | Cerca del aro, hacia el lateral de la pared del frente. |
| 5 | Extremo redondeado de la llave, en la posición de tiro libre. |
| 6 | Extremo del arco exterior próximo a la pared del frente. |
| 7 | Extremo del arco exterior hacia los cipreses. |
| 8 | Más lejos del aro, por fuera de la parte central del arco exterior, hacia la derecha. |

No conviertas automáticamente todo lo que está detrás del arco en 3 puntos. No inventes un punto de 1: las marcas de medidas del croquis no son valores de tiro.

Hasta confirmar si son zonas, representá estas siete ubicaciones como puntos de tiro con un radio de tolerancia configurable. Fuera de ellos, el modo provisional pide acercarse a una marca para tirar. No inventes una partición completa de la cancha ni puntajes interpolados por distancia.

Guardá posiciones y tolerancias como datos editables, calibrados visualmente sobre la referencia. La marca 7 debe existir aunque un personaje la tape en el encuadre inicial.

## 7. Primera versión jugable y reglas provisionales

La entrega inicial debe incluir un circuito completo: entrar, elegir modo, mover o ubicar al tirador, lanzar, acertar o fallar, recibir feedback, ver el puntaje y volver a jugar.

### Modo práctica

- Un jugador controlado por la persona usuaria; los otros tres amigos permanecen visibles esperando.
- Permite practicar en las siete ubicaciones.
- Después de cada tiro, muestra resultado y puntaje obtenido y permite volver a tirar.
- Sin límite de tiempo ni necesidad de inventar condiciones de victoria.
- Sirve para validar que la cancha, la física y los puntos funcionan.

### Desafío local por turnos — hipótesis explícita para el prototipo

Si todavía no aclaré las reglas históricas, implementá un desafío local sencillo para 2 a 4 participantes que comparten el mismo equipo, por turnos. Los cuatro adultos siguen presentes; con menos participantes, los restantes esperan como ambientación.

- Por defecto, 5 tiros por participante, modificable en configuración.
- Se alterna después de cada intento, entre o no entre la pelota.
- Los aciertos suman el valor de la ubicación de lanzamiento; los fallos suman cero.
- Gana quien acumule más puntos tras completar la misma cantidad de tiros.
- Si empatan, una ronda extra para quienes empataron; cada uno tiene igual cantidad de oportunidades antes de decidir el resultado.
- Esto es un reglamento **provisional para poder probar el videojuego**, no una afirmación sobre cómo jugábamos realmente.
- No incorpores equipos, robos, pases, reloj de posesión, faltas o reglas de rebote competitivas hasta que las confirme.

Al terminar, celebrá al ganador destacando la licuadora y las frutas. Incluí revancha y regreso al inicio. Nombres de participantes editables; no inventes nombres reales de mis amigos.

No hace falta multiplayer online, cuentas, backend, chat, ranking global, tienda, monetización ni varias canchas para esta primera entrega.

## 8. Controles y sensación de juego

Prioridad: navegador de escritorio, con teclado y mouse. También contemplá controles táctiles sencillos en orientación horizontal si no comprometen la primera entrega de escritorio.

- WASD o flechas: mover al personaje activo dentro de la zona habilitada.
- Click o toque en una marca: caminar hasta esa posición, si implementás esa alternativa.
- Mantener espacio o un botón de tiro: preparar/cargar el lanzamiento; soltar: ejecutar.
- La puntería puede asistirse hacia el aro en la primera versión; la precisión o fuerza debe depender de la ejecución del usuario y de la distancia.
- Esc: pausa y menú.
- Control accesible para sonido y reinicio.
- Evitá que la barra espaciadora desplace la página mientras se juega y que el input del juego interfiera con campos donde se escriben nombres.

Diseñá una mecánica simple de entender y satisfactoria. Usá una barra de carga/timing discreta y coherente con la estética, visible solamente cuando corresponde. Un tiro bien ejecutado debe tener un resultado predecible; no conviertas el juego en una moneda al aire.

En este primer modo por turnos, el personaje activo puede moverse con la pelota antes del tiro; es una decisión de prototipo, no una regla histórica confirmada. Los demás no lo bloquean ni le roban la pelota.

Los jugadores no deben salir caminando sobre la pared, atravesar el tablero, pisar la mesa, entrar al camino o superponerse sin control. Mantener al perro y al chico fuera del espacio de lanzamiento. Reposicioná a los que esperan si hace falta, sin convertirlos en defensores.

## 9. Física, perspectiva y puntaje correcto

Separá coordenadas del mundo de píxeles de pantalla. El pasto es un plano; la pelota tiene además altura.

### Proyección

- Calibrá una transformación entre cancha y pantalla usando puntos reconocibles de la referencia.
- Usá una transformación proyectiva o una cámara equivalente para el plano del suelo, y una proyección de altura consistente con el aro y las verticales.
- Una homografía del suelo por sí sola no define la altura de la pelota: resolvé esa dimensión explícitamente.
- La escala del personaje y la pelota debe variar coherentemente con la profundidad, si la cámara lo requiere.
- Conservá anclaje de pies al suelo, sombras de contacto y orientación hacia el aro.
- Resolvé oclusiones por profundidad y máscaras: pared delante de pies cuando corresponde, pelota delante/detrás del aro según posición, sin ordenar todo solo por la coordenada vertical de la pelota elevada.
- Convertí correctamente el input a coordenadas de juego con márgenes, escalado y pantallas de alta densidad.

### Pelota y enceste

- Trayectoria balística con gravedad y velocidades consistentes, independiente de la tasa de renderizado.
- La preparación del tiro y el input determinan las condiciones de lanzamiento; el resultado debe coincidir con la trayectoria que se ve.
- Tamaño y centro del aro coherentes con la imagen. No basta con acercar la pelota a un círculo de pantalla para sumar puntos.
- Contá enceste cuando la pelota atraviesa de arriba hacia abajo la abertura útil del aro, teniendo en cuenta su radio.
- Evitá encestes desde abajo, dobles conteos o puntos por pasar cerca.
- Guardá el valor de la ubicación en el momento de soltar la pelota. No lo recalcules cuando el personaje se mueve después o cuando cae la pelota.
- Usá un identificador de tiro y una resolución única por intento.
- Implementá respuesta razonable a aro, tablero y suelo. Podés simplificar contactos, pero sin rebotes visualmente imposibles ni atravesar el tablero.
- Usá pasos fijos o una integración robusta; considerá cruces entre pasos para no perder colisiones cuando la pelota va rápido.
- Tras un fallo o un acierto, recuperá la pelota de manera breve y legible, y prepará el siguiente intento. Un mecanismo simple de reinicio es suficiente; no hace falta perseguirla durante mucho tiempo.

### Feedback

- Sonido corto y metálico de cadenas al encestar, sincronizado con el paso por el aro.
- Sonidos discretos para madera, rebotes y pasos sobre pasto, si hay recursos disponibles.
- Feedback breve del valor conseguido: por ejemplo “+5”, sin tapar la escena con efectos gigantes.
- Celebración sobria de los amigos y reacción mínima del espectador/perro.
- Sonido activado a partir de una interacción y opción de silenciar. El juego debe seguir funcionando si no hay audio.

## 10. Interfaz y presentación

El escenario debe ocupar casi toda la pantalla. La interfaz acompaña al juego; no debe parecer un dashboard ni una landing page con tarjetas.

- Inicio sencillo sobre la misma cancha: título CHUBOL, jugar, práctica, reglas y sonido.
- En partida, información mínima: turno actual, puntos, tiros restantes y pausa.
- No restaurar los paneles enormes “Jugador 1 / Jugador 2” ni barras TURBO en las esquinas superiores; fueron eliminados intencionalmente de la referencia.
- Si hace falta un marcador funcional, ubicá una franja discreta fuera del área importante del arte o un pequeño panel que no tape elementos. Separá HUD y mundo.
- Indicaciones de controles breves y en español.
- No muestres nombres de motores, herramientas de IA, coordenadas, consola o advertencias de desarrollo al jugador normal.
- Incluí un modo de escena limpia/captura para ocultar el HUD y comparar con la referencia.
- Mantené botones utilizables, foco visible, contraste suficiente y opciones que no dependan solamente del color.

## 11. Arquitectura sugerida

Si el repo no tiene un stack útil, mi preferencia inicial es **TypeScript + Vite + Phaser**, usando imágenes y animaciones de alta calidad para la presentación 2.5D. No es una orden de migrar un proyecto existente: justificá la decisión con la inspección real del repo y los assets disponibles.

Usá versiones estables compatibles, verificadas al implementar, y un solo lockfile. No fijes versiones que estés recordando de memoria ni agregues dependencias innecesarias.

Separá responsabilidades:

- Escenas: carga, inicio, partida, resultado y comparación visual.
- Dominio: participantes, reglas, turnos, tiros y puntajes.
- Simulación: pelota, colisiones y proyección.
- Presentación: personajes, animaciones, sombras, máscaras, efectos y HUD.
- Configuración: posiciones de tiro, calibración, reglas provisionales, controles y parámetros físicos.
- Assets: manifiesto y carga centralizada.

Ejemplo orientativo de organización; adaptalo al repo, no crees archivos vacíos para cumplir un árbol:

```text
references/
public/assets/
  backgrounds/
  characters/
  props/
  audio/
  ui/
src/
  game/
    scenes/
    entities/
    systems/
    rendering/
    input/
    config/
  domain/
  ui/
tests/
docs/
```

La lógica de puntos y turnos debe poder probarse sin levantar el renderer. Evitá un único archivo gigantesco que mezcle dibujo, física, inputs y reglas.

Implementá una máquina de estados explícita, ajustable a las reglas definitivas. Como punto de partida: inicio → preparación de turno → ubicación → carga → pelota en vuelo → resolución → siguiente turno o resultado. La pausa debe suspender física e input de juego sin perder estado.

Los nombres concretos de estados, archivos y clases son decisiones tuyas. Lo importante es evitar dobles tiros, doble puntaje, cambios de turno durante un vuelo y estados sin salida.

Objetivo de rendimiento: animación fluida en un navegador de escritorio razonable, apuntando a 60 FPS y midiendo en el entorno real. No lo declares cumplido sin medir. Cargá recursos con feedback, evitá texturas de tamaño innecesario y no bases toda la lógica en la frecuencia de frames.

No pongas claves ni servicios secretos en el frontend. Para esta primera versión, el juego debe poder ejecutarse localmente sin backend ni cuentas.

## 12. Orden de implementación

### A. Inspección y contrato visual

- Inspeccioná repo, referencias y herramientas.
- Documentá brevemente el estilo y las invariantes en `docs/VISUAL_SPEC.md`.
- Registrá reglas confirmadas, hipótesis y respuestas pendientes en `docs/RULES.md`.
- Elegí la técnica de render y registrá la razón en `docs/ARCHITECTURE.md`.
- Hacé inventario de assets; identificá faltantes antes de prometer calidad visual.

### B. Primera escena fiel

- Montá la cámara, el fondo y el encuadre exacto.
- Resolvé capas, escala, máscara frontal y ubicación del aro.
- Mostrá una captura real del renderer junto a la referencia o una comparación equivalente.
- Corregí desvíos visibles antes de expandir mecánicas.
- Si todavía mostrás la referencia como imagen intacta, identificala como visor de referencia, no como escena reconstruida ni como juego.

### C. Un tiro completo

- Integrá un personaje independiente, pelota independiente y una ubicación de tiro.
- Preparación, lanzamiento, trayectoria, contacto, enceste/fallo y feedback.
- Verificá especialmente que no quede la copia del jugador pegada al fondo y que la pelota pase correctamente por el aro.

### D. Juego completo inicial

- Incorporá las siete ubicaciones y sus puntajes.
- Integrá los cuatro amigos y sus estados.
- Terminá práctica y desafío local provisional, o el reglamento definitivo si ya lo confirmé.
- Inicio, pausa, final, celebración del trofeo, revancha y ajustes básicos.

### E. Verificación y entrega

- Ejecutá build, validaciones de tipos y las pruebas pertinentes.
- Probá el flujo en navegador y revisá consola y carga de recursos.
- Capturá juego real y escena de comparación; corregí problemas visuales y funcionales.
- Dejá instrucciones mínimas para iniciar, jugar y seguir desarrollando.

Los hitos sirven para trabajar en orden, no para detenerte automáticamente a pedir autorización entre uno y otro. Continuá mientras puedas avanzar con la información y herramientas disponibles. Si hay un impedimento artístico, avanzá las partes independientes y describí con exactitud lo pendiente.

## 13. Verificación necesaria

### Pruebas de comportamiento

- Un enceste desde cada una de las siete posiciones suma respectivamente 2, 3, 4, 5, 6, 7 y 8. En una sesión de práctica, uno desde cada lugar suma **35**.
- Un fallo suma cero.
- Cada intento suma como máximo una vez.
- Pasar por debajo del aro o por fuera de la abertura no cuenta.
- El puntaje queda vinculado al lugar de salida, aunque después se mueva el jugador.
- Cambiar el tamaño de la ventana no cambia la ubicación lógica del tiro ni su resultado.
- La pelota resuelve correctamente a distintas tasas de renderizado.
- Pausar/reanudar no duplica eventos ni hace saltar la pelota.
- El cambio de turno, final de partida y desempate respetan la configuración provisional o las reglas que confirme.
- Reiniciar limpia marcador, pelota, temporizadores y listeners.

### Prueba del flujo real

Abrir → iniciar práctica → ir a una marca → cargar y lanzar → observar resultado → repetir → salir → iniciar desafío → completar turnos → ver ganador y trofeo → revancha.

Si el entorno tiene automatización de navegador, usala. Si no la tiene, realizá las verificaciones disponibles y explicá cuáles no pudiste ejecutar. No reportes pruebas como aprobadas solo porque escribiste el código o un test.

### Comparación visual

- Captura a la resolución de referencia, 1536 × 1024, con HUD oculto y estado inicial determinista.
- Misma cámara, posiciones y escala que la imagen.
- Comparación lado a lado y, si sirve, superposición o diferencia por regiones.
- Excluí de una medición automática únicamente elementos que deban variar; no ocultes cambios grandes para obtener una métrica favorable.
- Revisá fondo, aro, paredes, cipreses, calle, alambrado, mesa, perro, chico y cada adulto.
- Verificá bordes de recortes, transparencias, sombras residuales, pies flotando, escala con profundidad y duplicación de elementos.
- Compará también durante movimiento y lanzamiento; un fotograma quieto lindo no demuestra que las animaciones funcionen.

No uses como “captura del juego” el archivo original de referencia. La evidencia tiene que provenir de la aplicación ejecutándose.

## 14. Condiciones para considerar terminada la primera entrega

- El repo contiene una aplicación que arranca con comandos documentados y funciona en navegador.
- Hay un juego completo, no solamente un mockup, una imagen interactiva o una demo de física aislada.
- La cancha y la presentación conservan la referencia arcade estilo NBA Jam: mismo pixel art detallado, encuadre, paleta y personajes. No se usa el acabado hiperrealista.
- Los cuatro adultos son normales/delgados y están implementados como entidades independientes cuando deben moverse.
- No hay tapones ni mecánicas de bloqueo.
- Están el chico de River, el perro de pelo corto, el alambrado y la calle recta.
- La licuadora y las frutas siguen siendo el trofeo.
- Las siete ubicaciones tienen los valores correctos y la lógica de enceste no duplica puntos.
- Existe un flujo de práctica y una partida local completa, con reglamento provisional identificado si todavía no respondí las preguntas.
- No hay errores de consola, recursos rotos ni reinicios que acumulen listeners.
- Hay capturas reales y verificación funcional.
- Las diferencias visuales restantes y dependencias de arte están descritas honestamente; si son sustanciales, la fidelidad visual sigue pendiente aunque el código funcione.

No consideres que compilar equivale a terminar. Tampoco que una implementación funcional con placeholders satisface el requisito gráfico.

## 15. Entrega y continuidad

Al finalizar, dejame:

1. Comandos exactos para instalar, arrancar, compilar y ejecutar las verificaciones disponibles, usando el gestor de paquetes real del repo.
2. Controles y explicación breve de los modos implementados.
3. Capturas reales del juego y de la comparación visual.
4. Lista corta de cambios principales, reglas provisionales y diferencias visuales pendientes.
5. Rutas concretas de cualquier asset que deba producirse o reemplazarse, con sus especificaciones.
6. Estado claro del trabajo en Git y notas suficientes para continuar en otra sesión.

Esta tarea es de implementación local en el repo existente. No implica publicar un sitio, desplegar servicios ni modificar la visibilidad del repositorio. No publiques el juego por tu cuenta.

Como documentación técnica de apoyo, consultá las fuentes oficiales correspondientes a las versiones elegidas. Para la opción Phaser, revisá [texturas, frames y atlas](https://docs.phaser.io/phaser/concepts/textures) al integrar los assets y [escalado con conservación de aspecto](https://docs.phaser.io/phaser/concepts/scale-manager) al adaptar el lienzo. Esas capacidades no sustituyen la producción del arte.

**Empezá ahora: inspeccioná el repo y las tres referencias, identificá los recursos que existen y los que faltan, planteá las tres dudas de reglas sin frenar el trabajo independiente, y construí la primera escena fiel antes de expandir el juego. La prioridad es que CHUBOL sea reconocible como esta cancha concreta y que después pueda jugarse de verdad.**
