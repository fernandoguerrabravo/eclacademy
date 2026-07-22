export interface Lesson {
  title: string;
  duration: string;
  type: "video" | "exercise";
}

export interface CourseSection {
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: number;
  slug: string;
  title: string;
  category: string;
  icon: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  students: number;
  weeks: number;
  lessons: number;
  badge?: "bestseller" | "new" | "popular";
  whatYouLearn: string[];
  requirements: string[];
  curriculum: CourseSection[];
  // ID del curso en Evolmind para la matrícula
  evolmindCourseId: string;
}

export const courses: Course[] = [
  {
    id: 1,
    slug: "cumplimiento-aduanero",
    title: "Cumplimiento Aduanero para Amazon Sellers",
    category: "Aduanas & Logística",
    icon: "fa-boxes-packing",
    shortDescription:
      "Aprende clasificación arancelaria, documentación de importación, y cómo evitar retenciones en aduana.",
    description:
      "Este curso es la guía definitiva para sellers de Amazon en Latinoamérica que desean importar sus productos al mercado de Estados Unidos de forma legal, eficiente y sin contratiempos aduaneros. A lo largo de 8 semanas, aprenderás desde los fundamentos del comercio internacional hasta casos prácticos reales de importación.",
    price: 297,
    originalPrice: 497,
    rating: 4.8,
    reviews: 234,
    students: 512,
    weeks: 8,
    lessons: 24,
    badge: "bestseller",
    evolmindCourseId: "EVM-CUST-001",
    whatYouLearn: [
      "Clasificación arancelaria (HTS codes) para tus productos",
      "Documentación necesaria para importar a EE.UU.",
      "Cómo evitar retenciones y multas en la aduana",
      "Proceso de despacho aduanero paso a paso",
      "Selección de customs broker confiable",
      "Cálculo de aranceles, impuestos y costos ocultos",
      "Normativas CBP (Customs and Border Protection)",
      "Uso de Incoterms en comercio internacional",
    ],
    requirements: [
      "Tener un producto o marca que desees exportar a EE.UU.",
      "Conocimiento básico de ventas en Amazon (cualquier marketplace)",
      "Computadora con acceso a internet",
      "No se requiere experiencia previa en aduanas",
    ],
    curriculum: [
      {
        title: "Introducción al Comercio Internacional",
        lessons: [
          { title: "Bienvenida y objetivos del curso", duration: "12:30", type: "video" },
          { title: "Panorama del comercio LATAM → USA", duration: "35:15", type: "video" },
          { title: "Entendiendo la cadena de importación", duration: "57:20", type: "video" },
        ],
      },
      {
        title: "Clasificación Arancelaria (HTS)",
        lessons: [
          { title: "¿Qué es el sistema armonizado?", duration: "28:00", type: "video" },
          { title: "Cómo buscar tu código HTS correcto", duration: "42:15", type: "video" },
          { title: "Errores comunes en clasificación", duration: "35:45", type: "video" },
          { title: "Ejercicio práctico: Clasifica tu producto", duration: "44:00", type: "exercise" },
        ],
      },
      {
        title: "Documentación de Importación",
        lessons: [
          { title: "Commercial invoice y packing list", duration: "40:00", type: "video" },
          { title: "Bill of lading y AWB", duration: "38:30", type: "video" },
          { title: "Certificados de origen", duration: "51:30", type: "video" },
        ],
      },
      {
        title: "Customs Broker y Despacho Aduanero",
        lessons: [
          { title: "¿Necesitas un customs broker?", duration: "30:00", type: "video" },
          { title: "Proceso de despacho paso a paso", duration: "45:00", type: "video" },
          { title: "Caso práctico de despacho", duration: "45:00", type: "exercise" },
        ],
      },
    ],
  },
  {
    id: 2,
    slug: "regulaciones-fda",
    title: "Regulaciones FDA: Guía Completa",
    category: "Regulaciones",
    icon: "fa-prescription-bottle-medical",
    shortDescription:
      "Todo sobre registro de establecimientos, etiquetado, y cumplimiento FDA para productos regulados.",
    description:
      "Domina los requisitos de la FDA para alimentos, cosméticos, suplementos y dispositivos médicos que ingresan al mercado estadounidense. Aprende a registrar tu establecimiento, cumplir con el etiquetado y evitar rechazos en frontera.",
    price: 247,
    originalPrice: 397,
    rating: 4.7,
    reviews: 189,
    students: 340,
    weeks: 6,
    lessons: 18,
    evolmindCourseId: "EVM-FDA-002",
    whatYouLearn: [
      "Registro de establecimientos ante la FDA",
      "Requisitos de etiquetado para productos regulados",
      "Cumplimiento para alimentos y suplementos",
      "Regulaciones para cosméticos y dispositivos médicos",
      "Proceso de Prior Notice",
      "Cómo evitar detenciones (FDA holds)",
    ],
    requirements: [
      "Tener un producto regulado por la FDA",
      "Conocimiento básico de tu categoría de producto",
      "Computadora con acceso a internet",
    ],
    curriculum: [
      {
        title: "Introducción a la FDA",
        lessons: [
          { title: "¿Qué regula la FDA?", duration: "25:00", type: "video" },
          { title: "Categorías de productos", duration: "30:00", type: "video" },
        ],
      },
      {
        title: "Registro y Etiquetado",
        lessons: [
          { title: "Registro de establecimiento", duration: "40:00", type: "video" },
          { title: "Requisitos de etiquetado", duration: "45:00", type: "video" },
        ],
      },
    ],
  },
  {
    id: 3,
    slug: "gestion-fintech",
    title: "Gestión Fintech y Contabilidad Internacional",
    category: "Finanzas",
    icon: "fa-money-bill-transfer",
    shortDescription:
      "Pagos internacionales, impuestos en EE.UU., estructura corporativa y contabilidad para e-commerce.",
    description:
      "Maneja pagos internacionales, impuestos, y la contabilidad necesaria para operar legalmente en EE.UU. Aprende a estructurar tu empresa, minimizar comisiones y llevar tus finanzas como un profesional.",
    price: 197,
    originalPrice: 347,
    rating: 4.9,
    reviews: 156,
    students: 298,
    weeks: 5,
    lessons: 15,
    badge: "new",
    evolmindCourseId: "EVM-FIN-003",
    whatYouLearn: [
      "Estructura corporativa (LLC) en EE.UU.",
      "Manejo de pagos internacionales",
      "Reducción de comisiones bancarias",
      "Obligaciones fiscales para sellers",
      "Contabilidad para e-commerce",
      "Herramientas fintech recomendadas",
    ],
    requirements: [
      "Tener o planear un negocio de e-commerce",
      "Conocimiento básico de finanzas",
    ],
    curriculum: [
      {
        title: "Estructura Corporativa",
        lessons: [
          { title: "Formando tu LLC en EE.UU.", duration: "35:00", type: "video" },
          { title: "EIN y cuentas bancarias", duration: "30:00", type: "video" },
        ],
      },
    ],
  },
  {
    id: 4,
    slug: "cumplimiento-usda",
    title: "Cumplimiento USDA para Exportadores",
    category: "Regulaciones",
    icon: "fa-seedling",
    shortDescription:
      "Normativas fitosanitarias, certificaciones orgánicas y requisitos para productos agrícolas.",
    description:
      "Conoce las normativas del USDA para productos agrícolas, orgánicos y de origen animal que deseas exportar al mercado estadounidense.",
    price: 197,
    originalPrice: 297,
    rating: 4.6,
    reviews: 98,
    students: 187,
    weeks: 4,
    lessons: 12,
    evolmindCourseId: "EVM-USDA-004",
    whatYouLearn: [
      "Normativas fitosanitarias del USDA",
      "Certificaciones orgánicas (USDA Organic)",
      "Requisitos para productos de origen animal",
      "Permisos de importación agrícola",
    ],
    requirements: ["Tener un producto agrícola o de origen animal"],
    curriculum: [
      {
        title: "Introducción al USDA",
        lessons: [{ title: "Rol del USDA en importaciones", duration: "28:00", type: "video" }],
      },
    ],
  },
  {
    id: 5,
    slug: "logistica-internacional-fba",
    title: "Logística Internacional & FBA",
    category: "Logística",
    icon: "fa-truck-fast",
    shortDescription:
      "Cadena de suministro, freight forwarding, FBA prep y optimización de envíos internacionales.",
    description:
      "Optimiza tu cadena de suministro desde LATAM hasta los fulfillment centers de Amazon en Estados Unidos. Aprende freight forwarding, FBA prep y reducción de costos logísticos.",
    price: 297,
    originalPrice: 447,
    rating: 4.8,
    reviews: 312,
    students: 421,
    weeks: 7,
    lessons: 21,
    badge: "popular",
    evolmindCourseId: "EVM-LOG-005",
    whatYouLearn: [
      "Diseño de cadena de suministro internacional",
      "Freight forwarding y modos de transporte",
      "Preparación de inventario para FBA",
      "Optimización de costos de envío",
      "Gestión de proveedores logísticos",
    ],
    requirements: ["Tener productos listos para enviar a Amazon"],
    curriculum: [
      {
        title: "Fundamentos de Logística",
        lessons: [{ title: "Modos de transporte internacional", duration: "40:00", type: "video" }],
      },
    ],
  },
  {
    id: 6,
    slug: "tratados-libre-comercio",
    title: "Tratados de Libre Comercio & Beneficios Arancelarios",
    category: "Comercio Internacional",
    icon: "fa-file-contract",
    shortDescription:
      "Aprovecha TLC, programas preferenciales y acuerdos comerciales para maximizar tu margen.",
    description:
      "Aprovecha los TLC vigentes entre tu país y EE.UU. para reducir aranceles y maximizar tu rentabilidad. Aprende a usar programas preferenciales y acuerdos comerciales.",
    price: 147,
    originalPrice: 247,
    rating: 4.7,
    reviews: 145,
    students: 256,
    weeks: 4,
    lessons: 10,
    evolmindCourseId: "EVM-TLC-006",
    whatYouLearn: [
      "TLC vigentes entre LATAM y EE.UU.",
      "Cómo calificar para beneficios arancelarios",
      "Certificados de origen preferencial",
      "Programas GSP y otros beneficios",
    ],
    requirements: ["Tener un producto de origen latinoamericano"],
    curriculum: [
      {
        title: "Introducción a los TLC",
        lessons: [{ title: "¿Qué es un tratado de libre comercio?", duration: "30:00", type: "video" }],
      },
    ],
  },
];

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((c) => c.slug === slug);
}

export function getCourseById(id: number): Course | undefined {
  return courses.find((c) => c.id === id);
}
