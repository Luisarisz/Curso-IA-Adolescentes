// ============================================================================
// LaboratorIA — Configuración de marca (white-label)
// ----------------------------------------------------------------------------
// Cambia TODO lo visible del curso desde este único archivo, sin tocar código.
// Ideal para: personalizar la versión de tu familia, o revender el curso a
// terceros (otra familia, un colegio, una academia) con su propia identidad.
//
// Consejo: haz una copia de este archivo antes de editar, por si acaso.
// ============================================================================
window.LAB_CONFIG = {
  // --- Identidad de marca --------------------------------------------------
  brand: {
    name: 'LaboratorIA',                 // Nombre del curso / producto
    tagline: 'Piensa. Crea. Automatiza.', // Lema corto (aparece bajo el logo)
    heroTitle: 'Piensa. Crea. Automatiza.',
    heroLead:
      'Un laboratorio para aprender a usar cualquier inteligencia artificial con lógica y sentido común — no memorizando prompts, sino entendiendo cómo pensar frente a ellas.',
    primaryColor: '#F5B93F',             // Color de acento principal (amarillo chispa)
  },

  // --- Palabra para el adulto responsable ----------------------------------
  // La versión familiar usa "papá". Para vender a terceros, cambia a algo
  // neutro como "tu adulto responsable", "tu tutor", "un adulto de confianza".
  guardian: {
    word: 'papá',            // se usa dentro de frases: "cuéntaselo a papá"
    wordCap: 'Papá',         // versión con mayúscula inicial
  },

  // --- Créditos y pie de página --------------------------------------------
  footer: {
    // Frase izquierda del pie. Para terceros: 'Un curso de IA para toda la familia.'
    left: 'LaboratorIA · un curso familiar hecho a la medida.',
    // Frase derecha (créditos). Déjalo vacío ('') para ocultarlo.
    creditText: 'Aprende con lógica, no con memoria',
    creditUrl: '',
  },

  // --- Encabezado del documento original (solo referencia interna) ---------
  // No se muestra en la web; queda como constancia de para quién se creó.
  meta: {
    preparedFor: 'Luis Fernando Aristizábal Zuluaga',
    place: 'Guarne, Antioquia · 2026',
  },

  // --- Perfiles sugeridos al primer arranque -------------------------------
  // Se ofrecen como "arranque rápido". El usuario puede crear los suyos.
  // route: 'rayo' (sprints cortos) | 'faro' (sesiones reflexivas).
  suggestedProfiles: [
    { name: 'Rayo', emoji: '⚡', route: 'rayo', hint: 'Sprints cortos y rápidos' },
    { name: 'Faro', emoji: '🔭', route: 'faro', hint: 'Sesiones y reflexión' },
  ],

  // --- Certificado final ----------------------------------------------------
  certificate: {
    issuer: 'LaboratorIA',
    signatureName: '', // Nombre de quien "firma" el diploma. Vacío = usa guardian.wordCap
  },

  // --- Funciones opcionales -------------------------------------------------
  features: {
    pwa: true,          // Instalable como app + funciona sin internet
    streak: true,       // Racha de días (refuerzo diario, útil en Ruta Rayo)
    certificate: true,  // Diploma descargable al completar el curso
    multiProfile: true, // Varios perfiles con progreso separado
  },
};
