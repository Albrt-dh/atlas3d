# Documentación técnica maestra — Atlas 3D de Medicina (EXANI-II · UAM/UAN)

> **Propósito de este documento.** Es la "memoria técnica" completa del proyecto. Si el chat original se pierde, cualquier versión de Claude (u otro desarrollador) debe poder leer este archivo y continuar el trabajo **sin romper nada de lo ya construido**. Aquí se registra qué pidió el usuario, qué se decidió y por qué, cómo está construido, qué se necesita para que funcione y en qué fase va el plan.
>
> **Proyecto hermano:** `Dashboard_UAM_UAN.html` (documentado en `Documentacion_Tecnica_Dashboard.md`). El Atlas 3D hereda su estilo visual, su convención de variables CSS y su forma de guardar el estado, para que en el futuro puedan integrarse.

---

## 0. Protocolo para retomar en una conversación nueva

Si eres una versión de Claude leyendo esto sin el historial:

1. Pide al usuario (si no los subió): este documento, el `index.html` actual del Atlas, y el archivo de datos o modelo del módulo que se va a tocar.
2. Revisa la **sección 12 (Bitácora de estado)** para saber en qué fase va el proyecto y qué está pendiente.
3. Respeta las **Reglas inviolables (sección 3)**. La más importante: el Atlas es una **PWA (app web instalable)** que debe funcionar **sin internet después de la primera carga**, tanto en computadora como en celular o tableta.
4. **Edita, no reescribas.** Usa cambios puntuales sobre el archivo existente. Nunca regeneres el `index.html` completo desde cero si solo se pide agregar un módulo.
5. Al terminar un cambio, **actualiza la bitácora (sección 12)** y entrega también este documento actualizado.

---

## 1. Qué pidió el usuario (requerimientos originales)

**Objetivo:** un dashboard en HTML para estudiar el examen de admisión a Medicina, enfocado en **modelos 3D interactivos**, al estilo de las apps comerciales de anatomía (Complete Anatomy, Visible Body).

**Requisitos explícitos:**

- Modelos **claros y precisos**, vistos "como una escultura": que se puedan revisar, rotar, estudiar e interactuar con ellos.
- **Que no sean lentos ni consuman mucha RAM.**
- Estilo de dashboard similar al `Dashboard_UAM_UAN` anterior.
- Construcción **gradual**, por fases, sobre bases sólidas.
- Orientación previa sobre cómo verlos y qué se puede hacer.
- El usuario se adapta a las herramientas que se le indiquen.

**Temario a cubrir:**

| Ámbito | Temas |
|---|---|
| Anatomía y fisiología | Sistema nervioso · Sistema endocrino · Aparato digestivo · Sistema inmunológico · Sistema linfático · Sistema tegumentario · Sistema musculoesquelético · Aparato cardiovascular · Aparato respiratorio · Aparato urinario · Aparato reproductor |
| Biología celular, microbiología y genética | Organelos celulares y sus funciones · Metabolismo y respiración celular · Genética y mecanismos de la herencia · Microbiología y parasitología médica |
| Bioquímica, biología molecular y farmacología | Transporte membranal · Biomoléculas |

---

## 2. Decisiones de diseño clave (y por qué)

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Dos tipos de módulo:** *anatómico* (malla real GLB) y *procedural* (generado con código). | Los órganos necesitan mallas reales para verse como escultura; células, membranas, ADN y moléculas se generan con más precisión y casi sin peso por código. |
| D2 | **Fuente anatómica: Z-Anatomy / BodyParts3D** (licencia CC BY-SA). | Son atlas libres, segmentados por estructura y con nombres anatómicos. Los modelos de apps comerciales no se pueden usar legalmente. |
| D3 | **Los modelos se guardan como archivos `.glb` normales** en `modelos/` y se cargan con `GLTFLoader`. | Al ser PWA servida por HTTPS no hay restricción de `file://`. (Decisión anterior, ya descartada: base64 dentro de `.js`, que pesaba 33 % más.) |
| D4 | **Three.js moderno (r170, versión fija `0.170.0`) con ES modules**, resuelto con `<script type="importmap">` desde jsDelivr y guardado por el service worker en la primera carga. | Código moderno y mantenible. Se usa jsDelivr porque el entorno de desarrollo de Claude no tiene internet para copiar la librería a `lib/`; el service worker la guarda, así que la app sigue funcionando sin conexión. Mejora futura opcional: copiarla a `lib/three/` y cambiar solo el importmap. |
| D5 | **Compresión Meshopt (`EXT_meshopt_compression`) + cuantización.** | Reduce los modelos de 4 a 10 veces. El decodificador viene incluido en Three.js (`examples/jsm/libs/meshopt_decoder.module.js`), sin WASM externo. Es clave para que el celular no se quede sin memoria. |
| D6 | **Render bajo demanda + carga perezosa + liberación al cambiar de módulo.** | Cumple el requisito de "rápido y poca RAM". |
| D7 | **Mismas variables CSS y convenciones que el dashboard anterior** (`--ink`, `--card`, `--bg`, `data-theme`). | Coherencia visual y posible integración futura. |
| D8 | **Contenido de estudio (nombres, funciones, preguntas) separado de la geometría.** | Permite corregir o ampliar textos sin tocar los modelos, y viceversa. |
| D9 | **Nomenclatura: español + latín (Terminologia Anatomica).** | Es la que aparece en los reactivos y en los libros de texto. |
| D10 | **Distribución como PWA alojada en GitHub Pages** (gratis). | Un solo código para computadora, Android, iPad y iPhone; se instala como app; funciona sin internet tras la primera carga; las actualizaciones llegan solas; el usuario nunca monta un servidor. Se evaluaron Tauri (ligera, solo escritorio) y Electron (pesada, 150–300 MB de RAM extra). |
| D11 | **Tauri como empaque opcional futuro** para un instalable de escritorio. | Usa exactamente el mismo código web; solo se agrega si el usuario lo pide. |
| D12 | **Toda la carga de archivos aislada en la capa `Recursos`.** | Si el empaque cambia (PWA → Tauri), solo se toca esa capa. |

---

## 3. Reglas inviolables

1. **Funcionamiento sin conexión:** todo archivo que la app necesite (HTML, JS, librerías, modelos, datos) se sirve desde el propio sitio y lo guarda el service worker (`sw.js`). Única excepción permitida: Three.js desde jsDelivr con versión fija y Google Fonts, ambos guardados por el service worker (ver D4). Cada archivo nuevo se agrega al registro de caché del service worker y se incrementa su versión.
2. **Rutas relativas siempre** (`./modelos/x.glb`), porque GitHub Pages sirve el sitio dentro de una subcarpeta (`usuario.github.io/atlas3d/`).
3. **Colores siempre con `var(--algo)`.** Nunca colores fijos en la UI, para no romper el modo oscuro.
4. **Todo módulo cumple el contrato de la sección 5.3** (`cargar` / `liberar`). Al cambiar de módulo, todo lo del anterior se libera de la GPU y la RAM.
5. **Presupuesto de rendimiento (sección 7) obligatorio.** Un modelo que lo exceda se vuelve a optimizar antes de integrarse.
6. **Nunca inventar contenido médico.** Las descripciones salen de fuentes de estudio (material del dashboard, libros de texto). Si no hay dato confiable, el campo queda vacío y marcado `"pendiente": true`.
7. **Créditos de licencia visibles** en la pantalla "Acerca de" (CC BY-SA exige atribución).
8. **El estado del usuario** se guarda en `localStorage` con prefijo `atlas3d-`, envuelto siempre en `try/catch`.

---

## 4. Requisitos para que funcione (lo que necesita el usuario)

### 4.1 Para **usar** el Atlas (solo estudiar)

- **Navegador:** Chrome o Edge en computadora y Android; Safari en iPhone/iPad.
- **Equipo:** cualquier laptop con gráficos integrados de los últimos ~6 años, o un celular de gama media de los últimos ~4 años. Meta: menos de 500 MB de RAM con un sistema cargado.
- **Primera vez:** abrir la dirección de GitHub Pages con internet y elegir "Instalar app" (Chrome/Edge: ícono en la barra de direcciones; iPhone: Compartir → "Agregar a inicio").
- **Después:** abrir desde el ícono; funciona sin internet. Los módulos se descargan la primera vez que se abren (o todos a la vez con el botón "Descargar todo para usar sin conexión").

### 4.2 Para **producir** los modelos anatómicos (una sola vez por sistema)

El contenedor donde trabaja Claude **no tiene acceso a internet**, así que el usuario hace las descargas y la conversión siguiendo los guiones que Claude le entrega.

| Herramienta | Para qué | Notas |
|---|---|---|
| **Blender 4.x** (gratis) | Abrir el atlas Z-Anatomy, separar por sistema, renombrar estructuras y reducir polígonos. | Claude entrega un script de Python (`herramientas/exportar_sistemas.py`) que automatiza casi todo. |
| **Node.js LTS** (gratis) | Ejecutar `gltf-transform`, el optimizador de modelos. | Instalar y luego ejecutar `npm install -g @gltf-transform/cli`. |
| **Z-Anatomy** | Fuente de las mallas. | Descargar desde el sitio oficial de Z-Anatomy o su repositorio público. Es un archivo `.blend` de varios GB. |
| **Espacio en disco** | ~10 GB libres. | Para el `.blend` original y los archivos intermedios. |

**Alternativa sin Blender:** el usuario puede subir al chat archivos `.glb`/`.obj` ya descargados (por ejemplo, de BodyParts3D o Sketchfab con licencia CC). Claude intentará optimizarlos dentro del contenedor si las herramientas están disponibles ahí; si no, entrega los comandos para que el usuario los corra.

### 4.3 Para **desarrollar** (Claude en el chat)

- Claude escribe todo el código (HTML, CSS, JS), los scripts de Blender, Python y Node, y los archivos de datos.
- Los módulos procedurales (célula, membrana, ADN, moléculas, microbios) no requieren nada del usuario.
- Claude entrega cada versión como una carpeta comprimida (`.zip`) lista para subir.

### 4.4 Para **publicar** (el usuario, una sola vez + cada actualización)

- **Cuenta gratuita de GitHub.**
- Crear un repositorio público llamado `atlas3d`, activar GitHub Pages (Settings → Pages → rama `main`, carpeta raíz).
- Para actualizar: en la web de GitHub, "Add file → Upload files", arrastrar el contenido del `.zip` y confirmar. Sin comandos.
- Límites de GitHub a respetar: 100 MB por archivo (los modelos optimizados pesan ≤ 3 MB) y ~1 GB por sitio.
- **Pruebas antes de publicar (opcional):** con Node.js instalado, `npx serve` dentro de la carpeta y abrir `http://localhost:3000`.

---

## 5. Arquitectura

### 5.1 Estructura de carpetas

```
atlas3d/
├── index.html                 ← estructura del dashboard
├── manifest.webmanifest       ← nombre, íconos y colores de la app instalable
├── sw.js                      ← service worker: caché sin conexión y actualizaciones
├── iconos/                    ← íconos de la app (192 y 512 px)
├── css/estilos.css            ← variables de tema heredadas del dashboard anterior
├── js/
│   ├── main.js                ← arranque
│   ├── motor.js               ← renderer, cámara, controles, render bajo demanda
│   ├── recursos.js            ← ÚNICA capa que carga archivos (fetch, GLTFLoader)
│   ├── modulos.js             ← registro y ciclo cargar/liberar
│   ├── herramientas.js        ← capas, cortes, explosión, etiquetas, buscador
│   ├── ui.js                  ← barra lateral, ficha, modo examen
│   ├── store.js               ← estado del usuario (localStorage)
│   ├── animacion.js           ← utilidades compartidas de animación de partículas
│   ├── iconos.js              ← íconos SVG en línea
│   ├── punnett.js             ← cuadro de Punnett interactivo
│   └── modulos/               ← un archivo por tema (celula.js, cardiovascular.js…)
├── (lib/three/)               ← opcional futuro; hoy Three.js r170 llega de jsDelivr (D4)
├── modelos/                   ← geometría anatómica .glb (Meshopt)
├── datos/                     ← contenido de estudio por módulo (.json)
├── herramientas/              ← solo producción, NO se sube a GitHub
│   ├── construir_vista_previa.py (junta todo en un solo HTML para revisar sin publicar)
│   ├── exportar_sistemas.py   (script de Blender)
│   └── optimizar.bat / .sh    (comandos gltf-transform)
└── DOCUMENTACION.md           ← este archivo
```

Los módulos procedurales son un archivo en `js/modulos/` (código pequeño, sin `.glb`). Sus textos van en `datos/`. La carpeta `fuentes/` con descargas originales vive solo en la computadora del usuario.

### 5.2 Capas del sistema

1. **Motor 3D (`Motor`)**: un solo `WebGLRenderer`, escena, cámara en perspectiva, `OrbitControls`, iluminación, raycaster para selección, ciclo de render bajo demanda. Se crea una vez y nunca se destruye.
2. **Registro de módulos (`Modulos`)**: catálogo de todos los temas con su contrato. Cambia el módulo activo llamando `liberar()` del anterior y `cargar()` del nuevo.
3. **Cargador de recursos (`Recursos`)**: única pieza que lee archivos. Carga `.glb` con `GLTFLoader` + `MeshoptDecoder` y `.json` con `fetch`. Si en el futuro se empaqueta con Tauri, solo cambia este archivo.
4. **Datos (`datos/*.json`)**: textos, capas y preguntas por estructura.
5. **Interfaz (`UI`)**: barra lateral de ámbitos y temas, visor central, panel de información, barra de herramientas, buscador, modo examen.
6. **Estado (`store`)**: progreso, preferencias y notas, persistido en `localStorage` con la clave `atlas3d-store`.

### 5.3 Contrato de un módulo

```js
Modulos.registrar({
  id: 'cardiovascular',                 // único, minúsculas, sin acentos
  ambito: 'anatomia',                   // 'anatomia' | 'celular' | 'bioquimica'
  titulo: 'Aparato cardiovascular',
  tipo: 'glb',                          // 'glb' | 'procedural'
  archivoModelo: './modelos/cardiovascular.glb',   // solo si tipo='glb'
  archivoDatos:  './datos/cardiovascular.json',
  camaraInicial: { pos:[0,0.2,2.4], objetivo:[0,0.1,0] },
  capas: ['corazon','arterias','venas','referencia_osea'],

  async cargar(ctx) { /* añade objetos a ctx.raiz; registra estructuras clicables */ },
  liberar(ctx)      { /* dispose() de geometrías, materiales y texturas; vacía ctx.raiz */ },
  animaciones: {    /* opcional: 'ciclo_cardiaco': {iniciar(), detener()} */ }
});
```

`ctx` incluye: `ctx.raiz` (grupo donde va todo), `ctx.motor`, `ctx.registrarEstructura(objeto3D, idEstructura)`, `ctx.pedirRender()`.

### 5.4 Formato de modelo (`modelos/*.glb`)

GLB optimizado con Meshopt + cuantización (sección 6). Los metadatos (fuente, licencia, triángulos) van en el campo `asset.extras` del GLB, escrito por el script de Blender.

Carga en `recursos.js` (resumen):

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

export async function cargarModelo(ruta, onProgreso) {
  const gltf = await loader.loadAsync(ruta, e => onProgreso?.(e.loaded / e.total));
  return gltf.scene;
}
export async function cargarDatos(ruta) {
  return (await fetch(ruta)).json();
}
```

Importmap en `index.html`:

```html
<script type="importmap">
{ "imports": {
    "three": "./lib/three/three.module.min.js",
    "three/addons/": "./lib/three/addons/" } }
</script>
```

### 5.5 Convención de nombres dentro del GLB

Cada malla (nodo) del GLB se llama con un **id de estructura**: `sistema.estructura[_lado]`, en minúsculas y sin acentos.

Ejemplos: `cardio.ventriculo_izquierdo`, `cardio.aorta_ascendente`, `resp.pulmon_derecho`, `nerv.cerebelo`.

Ese id es la llave que une la geometría con su ficha en `datos/`. El script de Blender renombra automáticamente a partir de los nombres latinos de Z-Anatomy usando una tabla de equivalencias (`herramientas/equivalencias_<sistema>.csv`).

### 5.6 Formato de archivo de datos (`datos/*.json`)

Se muestra con comentarios por claridad; el archivo real es JSON válido (sin comentarios, claves entre comillas).

```js
{
  estructuras: {
    'cardio.ventriculo_izquierdo': {
      nombre: 'Ventrículo izquierdo',
      latin: 'Ventriculus sinister',
      capa: 'corazon',
      tejido: 'musculo_cardiaco',          // define el color en modo atlas
      funcion: 'Bombea sangre oxigenada a la aorta y la circulación sistémica.',
      relaciones: 'Recibe sangre de la aurícula izquierda a través de la válvula mitral.',
      clinica: 'Su hipertrofia es típica de la hipertensión arterial crónica.',
      claveExamen: 'Es la cámara con la pared más gruesa.',
      fuente: 'Material Dashboard UAM/UAN · tema cardiovascular',
      pendiente: false
    }
  },
  preguntas: [
    { tipo: 'senala', estructura: 'cardio.ventriculo_izquierdo',
      enunciado: 'Señala la cámara que expulsa sangre hacia la aorta.' },
    { tipo: 'opcion', enunciado: '...', opciones: ['A','B','C','D'], correcta: 'B',
      estructuraRelacionada: 'cardio.valvula_mitral' }
  ],
  recorridos: [ /* rutas guiadas: lista ordenada de estructuras con texto */ ]
}
```

---

## 6. Pipeline de producción de modelos anatómicos

### 6.1 Flujo general

```
Z-Anatomy (.blend)
   │  Blender + exportar_sistemas.py
   ▼
<sistema>_crudo.glb   (un archivo por sistema, mallas renombradas, decimado inicial)
   │  gltf-transform (optimizar.bat)
   ▼
<sistema>.glb         (soldado, sin duplicados, simplificado, cuantizado, Meshopt)
   ▼
modelos/              (listo para subir)
```

### 6.2 Qué hace el script de Blender (`exportar_sistemas.py`)

1. Recorre las colecciones del atlas (Z-Anatomy organiza por sistema).
2. Por cada sistema seleccionado: duplica las mallas, aplica modificadores, borra materiales y texturas (el color se asigna en el Atlas según el tejido), aplica un modificador *Decimate* con una proporción configurable por sistema y renombra según la tabla de equivalencias.
3. Exporta `<sistema>_crudo.glb` con normales, sin texturas, sin animaciones.
4. Genera `<sistema>_reporte.txt` con el conteo de triángulos por estructura y la lista de nombres sin equivalencia (para completar la tabla).

### 6.3 Comandos de optimización (`optimizar.bat`)

```bat
gltf-transform weld     %1_crudo.glb  tmp1.glb
gltf-transform dedup    tmp1.glb      tmp2.glb
gltf-transform simplify tmp2.glb      tmp3.glb --ratio 0.5 --error 0.0008
gltf-transform prune    tmp3.glb      tmp4.glb
gltf-transform meshopt  tmp4.glb      %1.glb
gltf-transform inspect  %1.glb
```

`meshopt` ya incluye la cuantización. El `--ratio` se ajusta por sistema hasta cumplir el presupuesto de la sección 7. El comando `inspect` sirve para verificar el conteo final.

### 6.4 Verificación visual

Antes de integrar un modelo, abrirlo en un visor glTF (por ejemplo, el de gltf-transform o el de Three.js) y revisar que no haya huecos, normales invertidas ni estructuras pequeñas deformadas por la simplificación. Si las hay, bajar la simplificación solo de esas estructuras desde Blender.

### 6.5 Orden de producción sugerido

1. Cardiovascular (el que más preguntas genera y el que mejor valida el pipeline).
2. Respiratorio
3. Digestivo
4. Urinario
5. Nervioso (encéfalo primero, después médula y nervios)
6. Musculoesquelético (esqueleto primero, después músculos)
7. Endocrino
8. Reproductor (masculino y femenino)
9. Linfático e inmunológico (comparten modelo: ganglios, bazo, timo, amígdalas, vasos linfáticos)
10. Tegumentario (corte de piel en bloque, procedural o semiprocedural, porque los atlas no lo traen en detalle microscópico)

---

## 7. Presupuesto de rendimiento

| Métrica | Límite |
|---|---|
| Triángulos por sistema cargado | ≤ 150,000 (musculoesquelético completo: ≤ 250,000) |
| Tamaño `.glb` optimizado (Meshopt) | ≤ 3 MB por sistema |
| Tamaño de la app sin modelos | ≤ 2 MB |
| Tamaño total del sitio | ≤ 60 MB |
| RAM del navegador con un sistema | < 500 MB |
| Tiempo de carga de un sistema | < 2 s en una laptop promedio |
| FPS al rotar | ≥ 50 |
| GPU en reposo | ~0 % (no se renderiza si no hay cambios) |

**Técnicas aplicadas:**

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Render bajo demanda: `pedirRender()` se llama solo en eventos de cámara, selección, animación o cambio de UI.
- Un solo material compartido por tipo de tejido (no uno por malla).
- `InstancedMesh` en módulos procedurales con muchos elementos repetidos (ribosomas, vesículas, moléculas).
- `dispose()` estricto al cambiar de módulo, y verificación con `renderer.info.memory`, que debe volver a ~0 geometrías.
- Sombras desactivadas. En su lugar, iluminación hemisférica + direccional y materiales tipo *matcap* (dan apariencia de escultura sin costo de sombras).
- En celulares (detectados por `navigator.deviceMemory` o pantalla pequeña) se usa `pixelRatio` máximo 1.5 y se desactiva el antialiasing si los FPS bajan de 40. Safari en iPhone limita la memoria por pestaña, por eso el presupuesto de 3 MB por modelo es estricto.
- Selección por raycaster sobre la malla directamente. Si un sistema pesado se vuelve lento al seleccionar, se agrega `three-mesh-bvh` (versión clásica).

---

## 8. Experiencia visual y de interacción

### 8.1 Estilos de visualización (conmutables)

- **Modo escultura**: material *matcap* de arcilla o mármol claro, uniforme, que destaca forma y relieve. Es el modo por defecto, porque el usuario pidió verlos "como una escultura".
- **Modo atlas**: colores convencionales por tejido: hueso marfil, músculo rojo, arteria rojo brillante, vena azul, nervio amarillo, linfático verde, glándula ocre, órgano hueco rosado.
- **Modo rayos X**: todo semitransparente, excepto la estructura seleccionada.

Las texturas *matcap* se generan por código en un `<canvas>` al iniciar (sin imágenes externas).

### 8.2 Herramientas del visor

| Herramienta | Comportamiento |
|---|---|
| Orbitar / zoom / desplazar | Ratón o gestos táctiles (`OrbitControls` con amortiguación). |
| Clic | Selecciona la estructura, la resalta con un contorno y abre su ficha. |
| Doble clic | Centra la cámara en la estructura con una transición suave. |
| Ocultar / aislar | Ocultar la selección, aislarla (todo lo demás oculto) o mostrar todo. |
| Capas | Interruptores por capa definida en el módulo. |
| Transparencia | Deslizador global y por estructura. |
| Planos de corte | Tres planos (sagital, coronal, transversal) con deslizador. |
| Vista explosionada | Separa las estructuras desde el centro del sistema. |
| Etiquetas | Rótulos HTML superpuestos con línea guía hacia la estructura; se pueden mostrar todos o solo el seleccionado. |
| Buscador | Escribe "mitral" y lleva a la estructura. |
| Vistas rápidas | Anterior, posterior, lateral izquierda y derecha, superior, inferior. |
| Captura | Guarda una imagen PNG de la vista actual para notas. |

### 8.3 Funciones de estudio

- **Ficha de estructura:** nombre, latín, función, relaciones, correlación clínica y "clave de examen".
- **Recorridos guiados:** secuencias paso a paso, por ejemplo "trayecto de la sangre: vena cava → aurícula derecha → válvula tricúspide → …", con cámara automática.
- **Animaciones de procesos** (en los módulos donde aplica): ciclo cardíaco, ventilación, peristalsis, filtración glomerular, potencial de acción, transporte membranal, respiración celular, mitosis y meiosis.
- **Modo examen:**
  - *Señala*: el sistema pide una estructura y el usuario hace clic en el modelo.
  - *Nombra*: se resalta una estructura y el usuario elige su nombre entre opciones.
  - *Opción múltiple*: reactivos estilo EXANI-II ligados a una estructura.
  - Al final se muestran aciertos, errores y un repaso de lo fallado.
- **Progreso:** porcentaje de estructuras vistas y dominadas por módulo.
- **Notas:** notas personales por estructura.

### 8.4 Layout del dashboard

```
┌───────────────┬──────────────────────────────────┬────────────────┐
│ Barra lateral │           Visor 3D               │ Panel de ficha │
│  · Ámbitos    │   (barra de herramientas arriba) │  · Nombre      │
│  · Temas      │                                  │  · Función     │
│  · Progreso   │                                  │  · Clínica     │
│               │   (capas / corte abajo)          │  · Notas       │
└───────────────┴──────────────────────────────────┴────────────────┘
```

En pantallas angostas, la barra lateral y el panel de ficha se vuelven cajones deslizables.

**Variables CSS heredadas del dashboard anterior:** `--bg`, `--card`, `--ink`, más las nuevas propias del visor (`--visor-fondo`, `--seleccion`, `--etiqueta`). Tema oscuro con `html[data-theme="dark"]`.

---

## 9. Módulos: catálogo y enfoque

| id | Tema | Tipo | Contenido principal |
|---|---|---|---|
| `celula` | Organelos celulares | Procedural | Célula eucariota animal y vegetal en corte: núcleo, nucléolo, RER, REL, Golgi, mitocondria, lisosoma, peroxisoma, centriolos, citoesqueleto, cloroplasto, pared, vacuola. |
| `metabolismo` ✅ | Metabolismo y respiración celular | Procedural animado | Mitocondria en corte: glucólisis (citosol), ciclo de Krebs (matriz), cadena de transporte de electrones y ATP sintasa (crestas). |
| `genetica` ✅ | Genética y herencia | Procedural | Doble hélice con pares de bases, nucleosoma, cromosoma, mitosis y meiosis animadas, cuadro de Punnett interactivo. |
| `micro` ✅ | Microbiología y parasitología | Procedural estilizado | Bacteria Gram+ y Gram− (pared comparada), virus (cápside, envoltura), hongo, protozoario, helminto; morfologías (cocos, bacilos, espirilos). |
| `membrana` ✅ | Transporte membranal | Procedural animado | Bicapa lipídica con proteínas: difusión simple, facilitada, ósmosis, bomba Na⁺/K⁺, endocitosis, exocitosis. |
| `biomoleculas` ✅ | Biomoléculas | Procedural con coordenadas reales | Glucosa, aminoácidos, enlace peptídico, triglicérido, fosfolípido, nucleótido, ATP; modelos de esferas y barras con colores CPK. |
| `nervioso` | Sistema nervioso | GLB + procedural | Encéfalo por lóbulos, cerebelo, tronco, médula; neurona y sinapsis procedural. |
| `endocrino` | Sistema endocrino | GLB | Hipófisis, tiroides, paratiroides, suprarrenales, páncreas, gónadas en contexto. |
| `digestivo` | Aparato digestivo | GLB | Tubo digestivo completo y glándulas anexas. |
| `inmune_linfatico` | Inmunológico y linfático | GLB + procedural | Órganos linfoides; células inmunes procedurales. |
| `tegumentario` | Sistema tegumentario | Procedural | Bloque de piel en corte: epidermis por estratos, dermis, hipodermis, folículo, glándulas. |
| `musculoesqueletico` | Musculoesquelético | GLB | Esqueleto completo; músculos por regiones (capa activable). |
| `cardiovascular` | Aparato cardiovascular | GLB | Corazón con cámaras y válvulas, grandes vasos; ciclo cardíaco animado. |
| `respiratorio` | Aparato respiratorio | GLB + procedural | Vías aéreas, pulmones por lóbulos; alvéolo procedural. |
| `urinario` | Aparato urinario | GLB + procedural | Riñones, uréteres, vejiga, uretra; nefrona procedural. |
| `reproductor` | Aparato reproductor | GLB | Masculino y femenino, conmutables. |

---

## 10. Plan de ejecución por fases

Cada fase tiene un entregable y unos **criterios de aceptación**. No se avanza a la siguiente fase hasta cumplirlos.

### Fase 0 — Base del motor y del dashboard
**Entregable:** carpeta `atlas3d/` con el layout completo, el motor 3D, el registro de módulos, la capa `Recursos`, el tema claro/oscuro, el `store`, el `manifest` y el service worker, y un módulo de prueba procedural (`celula`, versión inicial con 5–6 organelos clicables). Incluye guía paso a paso para crear la cuenta de GitHub y publicar.
**Aceptación:**
- Publicado en GitHub Pages; se instala como app en computadora y celular.
- Después de la primera carga, funciona en modo avión.
- Se puede rotar, hacer zoom, seleccionar y ver la ficha.
- GPU en reposo cuando no hay interacción.
- Cambiar de módulo y volver no aumenta `renderer.info.memory`.

### Fase 1 — Herramientas del visor
**Entregable:** ocultar/aislar, capas, transparencia, planos de corte, vista explosionada, etiquetas, buscador, vistas rápidas, modos escultura/atlas/rayos X.
**Aceptación:** todas las herramientas funcionan sobre el módulo `celula` y son genéricas (no dependen de él).

### Fase 2 — Biología celular y molecular completa
**Entregable:** módulos `celula` (completo), `membrana`, `biomoleculas`, `genetica`, `metabolismo`, `micro`, con fichas y animaciones.
**Aceptación:** fichas sin campos inventados; animaciones fluidas; presupuesto de rendimiento cumplido.

### Fase 3 — Pipeline anatómico + primer sistema
**Entregable:** scripts de `herramientas/` y módulo `cardiovascular` funcionando con malla real.
**Pasos del usuario:** instalar Blender, Node.js y gltf-transform; descargar Z-Anatomy; correr los scripts; subir el `reporte.txt` y el `.glb` optimizado al chat.
**Aceptación:** el modelo cumple el presupuesto; todas las estructuras tienen id y ficha; se ve correctamente en los tres modos visuales.

### Fase 4 — Resto de sistemas anatómicos
**Entregable:** un sistema por iteración, en el orden de la sección 6.5.
**Aceptación:** la misma de la fase 3 por cada sistema.

### Fase 5 — Modo examen, recorridos y progreso
**Entregable:** modos *Señala*, *Nombra* y *Opción múltiple*; recorridos guiados; estadísticas de progreso; notas.
**Aceptación:** las preguntas solo usan datos de las fichas; el progreso persiste al cerrar y abrir el navegador.

### Fase 6 — Integración y escritorio (opcional)
- Enlace desde cada tema del `Dashboard_UAM_UAN` a su módulo del Atlas, y viceversa.
- Instalable de escritorio con Tauri, si el usuario lo pide (mismo código; solo se adapta `recursos.js`). Requiere instalar Rust.

---

## 11. Cómo pedir cambios en el futuro

1. Subir este documento y el `.zip` de la versión actual (o, si es un cambio puntual, solo los archivos de `js/` y `datos/` involucrados).
2. Indicar la fase o el módulo y el cambio deseado. Ejemplos: "agrega el módulo urinario", "corrige la ficha de la válvula mitral", "el corte transversal no funciona en el modelo digestivo".
3. Para modelos nuevos: subir el `reporte.txt` generado por el script de Blender, para que Claude complete la tabla de equivalencias y las fichas.

**Nota para Claude:** no es necesario subir los `.glb` para cambios de interfaz o de datos. Solo hacen falta para depurar problemas de geometría. Al entregar cambios, incrementar la versión de caché en `sw.js` para que los dispositivos instalados reciban la actualización.

---

## 12. Bitácora de estado

| Fecha | Fase | Estado | Notas |
|---|---|---|---|
| 2026-10-03 | Planeación | ✅ Completada | Requerimientos registrados; decisiones D1–D9 tomadas; plan de 6 fases definido. |
| 2026-10-03 | Planeación | ✅ Cambio de rumbo | Se pasa de HTML con `file://` a **PWA en GitHub Pages** (D3–D5 revisadas, D10–D12 nuevas). Motivos: uso en celular, sin servidor propio, Meshopt, actualizaciones automáticas. |
| 2026-10-03 | Fase 0 | 🟡 Entregada, falta verificar | Versión 0.1.0: motor (render bajo demanda, matcap generado por código, selección, centrar con transición), registro de módulos, capa `Recursos`, `store`, tema claro/oscuro, PWA (`manifest`, `sw.js`, íconos), temario completo con fases, ficha de espécimen, herramientas básicas adelantadas de la fase 1 (vista inicial, aislar, ocultar, mostrar todo, modos escultura/atlas/rayos X) y panel de rendimiento. Módulo `celula` con 14 estructuras clicables. Claude no pudo probarlo en un navegador real (el contenedor no tiene internet ni navegador): se validó la sintaxis de todos los archivos. |
| — | Fase 0 | ⏳ Pendiente | El usuario publica en GitHub Pages con `GUIA_PUBLICACION.md` y reporta: si abre, si se instala, si funciona en modo avión y qué marca el panel de rendimiento en reposo y al girar. |
| 2026-10-03 | Fase 0 | ✅ Verificada visualmente | El usuario confirmó que la vista previa se ve bien en los tres modos. Falta medir el rendimiento y probar la instalación ya publicada. |
| 2026-10-03 | Fase 1 | 🟡 Entregada, falta verificar | Versión 0.2.0. Nuevo `js/herramientas.js` (panel genérico). Motor ampliado: `prepararModelo()` (límites del modelo y direcciones para separar), `setOpacidad()` (global, con limpieza de materiales sin uso), `setTransparente(id)` (por estructura), `setExplosion(f)`, `setCorte({eje,t,invertir})` con un plano a la vez (sagital x, coronal z, transversal y) y selección que ignora lo cortado, `vista(nombre)` con convención anatómica (anterior +z; lateral derecha = cámara en −x), `anclas()` para etiquetas, `captura(fondo)`. UI: buscador sin acentos (Enter abre la primera coincidencia), botón Semitransparente en la ficha, etiquetas con línea guía clicables, panel plegable en celular. |

| 2026-10-03 | Fase 2 | 🟡 En curso (1 de 5) | Versión 0.3.0. Módulo `membrana` (transporte membranal): bicapa instanciada (~1,000 lípidos), colesterol, glucocáliz, proteína periférica, canal iónico, acuaporina, transportador, bomba Na⁺/K⁺, zona de endocitosis; 18 fichas y 7 procesos animados (difusión simple, por canal, por acarreador, ósmosis, bomba Na⁺/K⁺, endocitosis, exocitosis). Nuevo en el motor: `animar(fn)` y `proyectar(v)`. Nuevo en módulos: `procesos` (cada uno devuelve su función para detenerse), `iniciarProceso` / `detenerProceso`. Nuevo en datos: `procesos[]` (titulo, tipo, descripcion, claveExamen, clinica) y `rotulos[]` (texto fijo en una posición 3D). Las partículas se esconden con `InstancedMesh.count = 0`, no con `visible`, porque el motor controla `visible`. Siguen: metabolismo, genética, biomoléculas, microbiología. |
| 2026-10-03 | Fase 2 | 🟡 En curso (2 de 5) | Versión 0.4.0. Nuevo `js/animacion.js` compartido (`crearAzar`, `animarFlujos` con escalas por tramo para que las partículas aparezcan o se consuman, `rutaSalida`, `rutaEntrada`); `membrana.js` ya lo usa. Módulo `metabolismo`: mitocondria en corte (membranas externa e interna, crestas, ADN y ribosomas mitocondriales), glucólisis con 5 intermediarios en el citosol, acetil-CoA y ciclo de Krebs con sus 8 intermediarios en la matriz, y detalle de la membrana interna con complejos I–IV, coenzima Q, citocromo c y ATP sintasa con rotor. 38 fichas (cada intermediario indica su enzima) y 5 procesos: glucólisis, piruvato a acetil-CoA, Krebs, cadena de electrones, quimiosmosis. Siguen: genética, biomoléculas, microbiología. |
| 2026-10-03 | Fase 2 | 🟡 En curso (3 de 5) | Versión 0.5.0. Módulo `genetica`: doble hélice de 24 pares con bases por color y cadenas antiparalelas (rótulos 5′/3′), nucleosomas (collar de perlas), cromosoma metafásico (brazos p y q, centrómero, cinetocoros, telómeros) y célula 2n = 4 con cromosomas maternos y paternos. Procesos: mitosis y meiosis por fotogramas clave (`claveEn`), con entrecruzamiento visible (segmentos intercambiados) y segregación independiente; cuadro de Punnett interactivo (uno o dos genes) en `js/punnett.js`, probado: 1:2:1, 9:3:3:1, 1:1. Nuevo: `motor.anunciar(texto)` / `ctx.anunciar` muestra la fase actual en una leyenda del visor; un proceso de datos puede tener `"widget": "punnett"`. 18 fichas. Siguen: biomoléculas y microbiología. |
| 2026-10-03 | Diseño | ✅ Rediseño de interfaz (v0.6.0) | A petición del usuario: sistema visual v2, más moderno. Temario con secciones plegables (estado guardado en `store.ambitosCerrados`), ícono por ámbito, tarjetas de tema con barra de avance y candado en temas pendientes, tarjeta "Tu avance" general. Interruptor claro/oscuro con sol y luna en la barra lateral (reemplaza el botón Tema). Barra superior como tarjeta: miga con el ámbito, herramientas con ícono (en pantallas < 1280 px solo ícono), selector Escultura/Atlas/Rayos X con pastilla deslizante (`--i`). Visor como tarjeta redondeada con transición al cambiar de módulo (`.cambiando`). Paneles flotantes con efecto de vidrio (`--vidrio` + `backdrop-filter`). En celular: velo para cerrar el temario y asa en la ficha. Nuevo `js/iconos.js` (SVG en línea; se colocan con el atributo `data-icono`). Tokens nuevos: `--card-2`, `--accent-suave`, `--sombra-1/2`, `--r-s/m/l`, `--curva`. |
| 2026-10-03 | Fase 2 | ✅ Completa (5 de 5), falta verificar en navegador | Versión 0.7.0. Módulo `biomoleculas`: galería de 7 moléculas en esferas y barras con colores CPK (glucosa β, alanina, dipéptido Gly-Ala, triglicérido con un ácido graso cis, fosfatidilcolina, dAMP, ATP); constructor de moléculas `nuevaMol()` con prueba automática de distancias y de choques en la galería; enlaces especiales con su propia ficha (peptídico, éster, N-glucosídico, fosfoanhídrido). Cada "proceso" enfoca una molécula: oculta las demás, mueve la cámara y cambia los rótulos por sus grupos funcionales. Módulo `micro`: bacilo en corte (cápsula, pared, membrana, nucleoide, plásmidos, ribosomas 70S, flagelo, pili), paredes Gram + y Gram − en capas, 7 morfologías, virus envuelto, bacteriófago, levadura con yema, hifa con septos, Giardia y un nematodo; 36 fichas; procesos: tinción de Gram (cambia colores paso a paso y activa el modo Atlas), giro del flagelo y gemación. Nuevo en el motor: `volar()`, `rotulos()`, `setColorEstructura()`, `colorEstructura()`, `fov()`, evento `modo`. Nuevo en datos: `procesosTitulo` y `procesosDetener` (textos de la barra de procesos). |
| 2026-10-03 | Anatomía microscópica | 🟡 En curso (2 de 7) | Versión 0.8.0. A petición del usuario, antes de la fase 3 se agregan módulos procedurales de anatomía microscópica que no requieren descargas, con nuevos temas en el catálogo junto a su sistema (neurona, eje_hipofisis, sangre_inmune, tegumentario, sarcomero, alveolo, nefrona). Hechos: `neurona` (neurona mielinizada completa y sinapsis química; procesos: potencial de acción saltatorio y sinapsis en 5 pasos) y `sarcomero` (actina con tropomiosina y troponina, miosina con ~250 cabezas, discos Z, línea M, titina; proceso: contracción con deslizamiento real de filamentos, bandas I y zona H que se acortan). Siguen: nefrona, alvéolo, piel, sangre e inmunidad, eje hipotálamo-hipófisis; después, el modo examen (fase 5). |
| 2026-10-03 | Anatomía microscópica | 🟡 En curso (4 de 7) | Versión 0.9.0. `nefrona`: corpúsculo renal, TCP, asa de Henle, TCD con mácula densa, túbulo colector, arteriolas y capilares peritubulares; procesos: formación de orina (cada tipo de partícula se reabsorbe en su segmento: glucosa en el TCP, agua en TCP/descendente/colector, Na⁺ en TCP/ascendente/TCD; urea y secreción llegan a la orina) y circulación renal. `alveolo`: bronquiolo con músculo liso, conducto y saco alveolar con capilares; alvéolo en corte con neumocitos I y II, cuerpos lamelares, surfactante, macrófago y capilar con eritrocitos; procesos: intercambio gaseoso y ventilación (los alvéolos se inflan). Siguen: piel, sangre e inmunidad, eje hipotálamo-hipófisis. |
| 2026-10-03 | Anatomía microscópica | ✅ Completa (7 de 7), falta verificar en navegador | Versión 0.10.0. `tegumentario` (bloque de piel con 4 estratos de epidermis, dermis papilar y reticular, hipodermis; la cara frontal z = 0 es el plano de corte y las estructuras asoman por ella; procesos: sudoración, piloerección, renovación de la epidermis). `sangre_inmune` (eritrocito bicóncavo, 5 leucocitos en corte con sus núcleos y gránulos, plaquetas, IgG con cadenas pesadas y ligeras, Fab y Fc, bisagra y puentes disulfuro, macrófago y virus; procesos: fagocitosis en 4 pasos y neutralización). `eje_hipofisis` (hipotálamo con núcleos, infundíbulo, adeno y neurohipófisis, sistema porta, tiroides, suprarrenal con riñón, gónada; procesos: ejes tiroideo, suprarrenal y gonadal con retroalimentación negativa en 4 pasos —función genérica `animarEje`— y neurohipófisis). Siguen: modo examen (fase 5). |
| 2026-10-03 | Fase 5 | 🟡 Modo examen entregado (v0.11.0), falta verificar en navegador | Nuevo `js/examen.js` (`crearExamen`): botón Practicar en la barra; 10 preguntas por ronda alternando tres tipos —señala (clic en el modelo; usa `datos.preguntas` de tipo senala si existen), nombra (estructura iluminada, 4 opciones) y opción (descripción de la ficha con el nombre enmascarado por raíz de palabra)—; retroalimentación con la clave de examen; resumen con lista para repasar; resultados guardados en `store.examenes[modulo]` = {mejor, ultimo, intentos, fecha} y mejor porcentaje visible en el temario. Durante el examen se ocultan etiquetas, tooltip y buscador (`body.en-examen`). Solo pregunta por estructuras con `motor.esSeleccionable(id)` (excluye partículas apagadas). Probado en Node con los datos de los 13 módulos: todos generan 10 preguntas. Pendiente de la fase 5: recorridos guiados y notas por estructura. |

**Pendientes abiertos:**
- Mejoras de la fase 1 que quedaron para después: tapas sólidas en la cara del corte (técnica de stencil), evitar que las etiquetas se encimen cuando haya muchas estructuras, y más de un plano de corte a la vez.
- Equipo del usuario confirmado: Windows 11, 16 GB de RAM, gráficos integrados. El presupuesto de la sección 7 se mantiene.
- Decidir si el tegumentario será 100 % procedural (recomendado).
- Confirmar que el usuario creó su cuenta de GitHub (necesario para publicar la Fase 0).

---

## 13. Créditos y licencias

- **Three.js** — MIT.
- **Z-Anatomy** — CC BY-SA 4.0.
- **BodyParts3D**, © The Database Center for Life Science (DBCLS) — CC BY-SA 2.1 Japón.
- **meshoptimizer** (decodificador incluido en Three.js) — MIT.
- **gltf-transform** — MIT (herramienta de producción, no se distribuye en el Atlas).

Uso: estudio personal. Si el Atlas se comparte, debe conservarse la atribución y la misma licencia para los modelos derivados.
