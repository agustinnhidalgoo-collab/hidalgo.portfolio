/**
 * Contenido y datos de contacto centralizados.
 * Todo lo que aparece en la web fuera de los proyectos vive acá.
 */

const whatsappNumber = '5491170071828'; // confirmado por Agustín (+54 9 11 7007-1828)
const whatsappText = 'Hola Agustín, vi tu portfolio y me gustaría conversar.';

export const person = {
  name: 'Agustín Hidalgo',
  wordmark: 'AGUSTIN HIDALGO', // grafía del video, sin tilde
  role: 'Diseñador y comunicador visual', // CV
  year: 2026, // "2026" en el video y el CV
};

export const contact = {
  email: 'agustinn.hidalgoo@gmail.com',
  phoneDisplay: '+54 9 11 7007-1828',
  whatsappUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`,
  // Identificador tal como figura en el video (grafía «desing» respetada).
  instagramHandle: '@agustinhidalgo.desing',
  instagramUrl: 'https://www.instagram.com/agustinhidalgo.desing',
};

export const cv = {
  href: '/Agustin-Hidalgo-CV.pdf',
  file: 'Agustin-Hidalgo-CV.pdf',
  label: 'Descargar CV',
};

/** Accesos de la barra: viven solo ahí (la portada ya no los repite). «Sobre mí» abre un panel; sin JS, va a /sobre-mi. */
export const nav = [
  { label: 'Trabajos', href: '/#trabajos', panel: false },
  { label: 'Sobre mí', href: '/sobre-mi', panel: true },
  { label: 'Contacto', href: '/#contacto', panel: false },
] as const;

/** Textos del video; se corrigieron las erratas ortográficas del original.
 *  `intro` y `portfolio` ya no se muestran en la home (la propuesta los quitó); quedan por si se recuperan. */
export const copy = {
  intro: {
    before: 'El diseño es mi forma de ',
    marks: ['pensar', 'comunicar', 'resolver'],
    paragraphs: [
      {
        text: 'Entiendo el diseño como una herramienta para ',
        strong: 'construir sentido, ordenar ideas y generar experiencias visuales con identidad.',
      },
      {
        text: 'En cada proyecto busco desarrollar sistemas gráficos coherentes, donde la composición, la tipografía y la narrativa trabajen en conjunto para transformar conceptos en piezas visuales claras, contemporáneas y con intención.',
      },
    ],
  },
  manifesto: ['Creo diseño que', 'conecta, comunica', 'y permanece en la', 'memoria.'],
  portfolio: [
    'Este **portfolio** reúne una selección de proyectos desarrollados desde el interés por la **identidad visual**, la **composición** y la **construcción de sistemas gráficos con intención conceptual**.',
    'Cada trabajo explora la relación entre narrativa, estética y comunicación, combinando estructura visual, sensibilidad gráfica y dirección de arte para construir experiencias contemporáneas y coherentes.',
  ],
  about: [
    'Soy **Agustín Hidalgo**, estudiante de Comunicación Visual Gráfica y Digital en la Universidad de Belgrano, con interés en el desarrollo de identidades visuales, sistemas gráficos y proyectos donde el diseño se construye desde el concepto y la narrativa.',
    'Me interesa explorar cómo la composición, la tipografía y la dirección visual pueden transformar ideas en experiencias visuales claras, contemporáneas y con intención, combinando sensibilidad estética, estructura y comunicación.',
  ],
};

/** Extraído del CV (PDF adjunto). Sin agregados. */
export const cvData = {
  profile:
    'Estudiante de Licenciatura en Comunicación Visual, Gráfica y Digital con experiencia en creación de contenido, manejo de herramientas de diseño (Adobe Illustrator y Photoshop) y gestión de redes sociales. Experiencia laboral en atención al cliente y tareas administrativas, desarrollando habilidades en organización, comunicación y resolución de problemas. Manejo de herramientas digitales como Google Workspace y Microsoft Office. Interesado en desarrollarse en áreas de diseño, comunicación y entornos corporativos, aportando una combinación de creatividad, eficiencia operativa y trabajo en equipo.',
  experience: [
    {
      role: 'Diseñador freelance',
      org: 'Trabajo independiente',
      period: '2025 – Actualidad',
      featured: true,
      items: [
        'Diseño y desarrollo de piezas gráficas para redes sociales, comunicación y marcas.',
        'Desarrollo de identidades visuales y aplicaciones gráficas.',
        'Creación y edición de contenido digital para distintos proyectos y clientes.',
        'Adaptación de piezas para diferentes formatos y plataformas.',
        'Comunicación directa con clientes y seguimiento de proyectos.',
        'Presentación de propuestas y realización de ajustes según requerimientos.',
      ],
    },
    {
      role: 'Diseñador gráfico y editor audiovisual',
      org: 'Honorable Cámara de Diputados',
      period: '2026',
      featured: true,
      items: [
        'Diseño y desarrollo de piezas gráficas para redes sociales y comunicación institucional.',
        'Producción, edición y postproducción de contenido audiovisual para plataformas digitales.',
        'Diseño y edición de videos informativos, institucionales y de actualidad legislativa.',
        'Redacción y adaptación de copys para publicaciones, garantizando coherencia comunicacional.',
        'Realización de clipping y monitoreo de medios para la recopilación y análisis de información relevante.',
        'Colaboración en la planificación y ejecución de estrategias de comunicación digital.',
      ],
    },
    {
      role: 'Recepcionista y control de acceso',
      org: 'Racket Club – Norwalk S.A.',
      period: '2024 – 2025',
      featured: false,
      items: [
        'Atención al cliente y recepción de socios y visitantes, garantizando una experiencia de ingreso organizada y profesional.',
        'Gestión y control de accesos mediante registro de ingresos y egresos.',
        'Coordinación básica de tareas administrativas y organización del flujo de personas.',
      ],
    },
    {
      role: 'Asistente administrativo',
      org: 'Torales & Oppedisano',
      period: '2022 – 2023',
      featured: false,
      items: [
        'Gestión de tareas administrativas y organización de documentación legal.',
        'Atención al cliente y manejo de correspondencia física y digital.',
        'Coordinación y seguimiento de agendas y reuniones.',
        'Soporte en procesos internos y asistencia operativa general.',
      ],
    },
  ],
  education: {
    title: 'Licenciatura en Comunicación Visual, Gráfica y Digital',
    org: 'Universidad de Belgrano',
    period: '2024 – Actualidad',
    items: [
      'Formación en diseño gráfico, comunicación visual y desarrollo de piezas digitales.',
      'Aplicación de herramientas de diseño como Adobe Illustrator y Photoshop.',
      'Desarrollo de proyectos académicos vinculados a branding, editorial y contenido digital.',
      'Enfoque en comunicación visual estratégica y narrativa gráfica.',
    ],
  },
  courses: [
    {
      title: 'Community Manager, Copywriting y Fotografía para Redes Sociales',
      org: 'Coderhouse',
      period: '2023',
    },
  ],
  tools: [
    'Adobe Illustrator',
    'Adobe Photoshop',
    'Diseño gráfico',
    'Creación de contenido digital',
    'Edición de imágenes',
    'Redes sociales (Instagram, TikTok, Facebook, X)',
    'Copywriting',
    'Comunicación digital',
    'Google Workspace',
    'Microsoft Office (Word, Excel, PowerPoint)',
    'Gestión administrativa',
    'Atención al cliente',
  ],
  soft: [
    'Trabajo en equipo',
    'Comunicación',
    'Proactividad',
    'Organización',
    'Adaptabilidad',
    'Resolución de problemas',
    'Responsabilidad',
    'Orientación al cliente',
  ],
};
