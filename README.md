# LaboratorIA — Piensa. Crea. Automatiza.

Curso interactivo de **Inteligencia Artificial para adolescentes**. No enseña a
memorizar botones de apps que cambian cada mes: enseña **una forma de pensar**
frente a cualquier IA — qué pedir, cómo revisarlo con sentido común y cómo
ajustar. Esa lógica no caduca.

Es una aplicación web **sin backend, sin build y sin dependencias externas**:
son archivos estáticos que corren en cualquier navegador o hosting. Funciona
**offline** y se puede **instalar como app** (PWA) en celular, tablet o
computador.

---

## ✨ Qué incluye

- **5 semanas de curso** con misión, "por qué importa", herramientas, y dos
  rutas de aprendizaje que enseñan lo mismo con distinto envoltorio:
  - **Ruta Rayo ⚡** — sprints cortos de 10-20 min, con cronómetro, puntos
    ("Chispas") y niveles. Pensada para ritmo ágil / TDAH.
  - **Ruta Faro 🔭** — sesiones de 45-60 min con un **Cuaderno de IA** para
    reflexionar.
- **Método PIENSA** y **detector de alucinaciones** presentes en todo el curso.
- **Multi-perfil**: cada hijo/estudiante tiene su propio progreso, Chispas,
  logros y Cuaderno, guardados en el dispositivo.
- **Progreso persistente** (localStorage) + **copia de seguridad** por código
  para mover el avance a otro dispositivo.
- **Logros**, **racha de días** y **certificado imprimible** al terminar.
- **Cronómetro global** con alarma sonora y notificación, que sigue corriendo
  aunque cambies de pestaña.
- **Tema claro/oscuro**, accesible y responsive.
- **PWA**: instalable y con funcionamiento sin conexión.

---

## 🚀 Cómo usarlo

### En local
Al ser archivos estáticos, necesita servirse por HTTP (el Service Worker no
funciona con `file://`). Cualquiera de estas opciones sirve:

```bash
# Python (ya instalado en casi todos lados)
python3 -m http.server 8000
# luego abre http://localhost:8000

# o con Node
npx serve .
```

### Publicarlo en internet (gratis)
Como no hay build, puedes subir la carpeta tal cual a:

- **GitHub Pages** — Settings → Pages → *Deploy from a branch* → rama y carpeta
  `/ (root)`.
- **Netlify / Cloudflare Pages / Vercel** — arrastra la carpeta o conecta el
  repo. Sin comando de build; carpeta de publicación = raíz.

---

## 🎨 Personalizar / revender (white-label)

**Todo lo visible se cambia desde un único archivo: [`js/config.js`](js/config.js).**
Sin tocar código puedes ajustar:

| Qué | Dónde |
|-----|-------|
| Nombre del curso, lema, textos del inicio | `brand` |
| Color de acento | `brand.primaryColor` |
| Palabra del adulto responsable ("papá" → "tu tutor", etc.) | `guardian` |
| Pie de página y créditos | `footer` |
| Perfiles sugeridos al arrancar | `suggestedProfiles` |
| Firma y emisor del certificado | `certificate` |
| Activar/desactivar PWA, racha, certificado, multi-perfil | `features` |

> La versión de la familia usa "papá" y textos personalizados. Para vender a un
> tercero (otra familia, colegio o academia), copia `config.js`, cambia marca y
> la palabra del adulto responsable a algo neutro, y listo.

El **contenido pedagógico** del curso (semanas, actividades, glosario, fuentes)
vive en [`js/data.js`](js/data.js) — es la fuente única, editable si quieres
adaptar el temario.

---

## 🗂️ Estructura

```
index.html               Estructura y cabecera
css/style.css            Estilos (design tokens + componentes)
js/config.js             ⚙️ Marca y opciones (white-label)
js/data.js               📚 Contenido del curso (fuente única)
js/icons.js              Iconos SVG inline (sin CDN, offline)
js/app.js                Lógica: perfiles, progreso, timer, PWA, certificado
manifest.webmanifest     Metadatos PWA
sw.js                    Service Worker (offline)
icons/                   Iconos de la app (PWA / apple-touch)
```

---

## 🔒 Privacidad

No hay servidor ni analítica. **Todo el progreso se guarda solo en el navegador
del dispositivo** (`localStorage`). Nada se envía a internet salvo cuando el
estudiante abre, por su cuenta, los enlaces a las herramientas de IA.

---

## 📄 Licencia

Ver [`LICENSE`](LICENSE). Todos los derechos reservados — el contenido y el
código son propiedad del autor; no se permite su redistribución o reventa sin
autorización.
