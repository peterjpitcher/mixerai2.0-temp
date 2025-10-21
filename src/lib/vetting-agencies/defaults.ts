export interface DefaultVettingAgency {
  id: string;
  name: string;
  description: string;
  priority: number;
  website?: string;
}

export type DefaultVettingAgenciesByCountry = Record<string, DefaultVettingAgency[]>;

export const DEFAULT_VETTING_AGENCIES: DefaultVettingAgenciesByCountry = {
  // United States
  US: [
    {
      id: 'fda',
      name: 'FDA (Food and Drug Administration)',
      description: 'Regulates safety of food, drugs, cosmetics, and medical devices',
      priority: 1,
      website: 'https://www.fda.gov',
    },
    {
      id: 'usda',
      name: 'USDA (U.S. Department of Agriculture)',
      description: 'Regulates organic claims, food safety, and agricultural products',
      priority: 2,
      website: 'https://www.usda.gov',
    },
    {
      id: 'ftc',
      name: 'FTC (Federal Trade Commission)',
      description: 'Enforces truth in advertising and prevents deceptive business practices',
      priority: 1,
      website: 'https://www.ftc.gov',
    },
    {
      id: 'cdc',
      name: 'CDC (Centers for Disease Control and Prevention)',
      description:
        'Provides health information and safety guidelines, particularly important for health-related content.',
      priority: 4,
    },
    {
      id: 'epa',
      name: 'EPA (Environmental Protection Agency)',
      description: 'Verifies environmental claims about products and sustainability practices',
      priority: 3,
      website: 'https://www.epa.gov',
    },
  ],

  // United Kingdom
  GB: [
    {
      id: 'fsa',
      name: 'FSA (Food Standards Agency)',
      description: 'Protects public health related to food in England, Wales and Northern Ireland',
      priority: 2,
      website: 'https://www.food.gov.uk',
    },
    {
      id: 'asa',
      name: "ASA (Advertising Standards Authority)",
      description: "UK's independent regulator of advertising across all media",
      priority: 1,
      website: 'https://www.asa.org.uk',
    },
    {
      id: 'defra',
      name: 'DEFRA (Department for Environment, Food and Rural Affairs)',
      description: 'Oversees environmental protection, food production, and rural standards.',
      priority: 3,
    },
    {
      id: 'mhra',
      name: 'MHRA (Medicines and Healthcare products Regulatory Agency)',
      description: 'Regulates medicines, medical devices, and blood components for transfusion',
      priority: 3,
      website:
        'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency',
    },
    {
      id: 'ea',
      name: 'EA (Environment Agency)',
      description:
        'Provides guidelines and regulations regarding environmental protection and sustainability claims.',
      priority: 5,
    },
  ],

  // France
  FR: [
    {
      id: 'dgccrf',
      name: 'DGCCRF (Direction Générale de la Concurrence, de la Consommation et de la Répression des Fraudes)',
      description: 'Ensures fair trade, consumer protection and product safety',
      priority: 1,
      website: 'https://www.economie.gouv.fr/dgccrf',
    },
    {
      id: 'arpp',
      name: 'ARPP (Autorité de Régulation Professionnelle de la Publicité)',
      description: 'Self-regulatory organization for advertising content in France',
      priority: 1,
      website: 'https://www.arpp.org',
    },
    {
      id: 'anses',
      name: "ANSES (Agence Nationale de Sécurité Sanitaire de l'Alimentation)",
      description: 'Ensures food safety, environmental and occupational health protection.',
      priority: 3,
    },
    {
      id: 'ansm',
      name: 'ANSM (Agence Nationale de Sécurité du Médicament et des produits de santé)',
      description: 'Regulates health products and ensures their safety',
      priority: 2,
      website: 'https://ansm.sante.fr',
    },
    {
      id: 'has',
      name: 'HAS (Haute Autorité de Santé)',
      description: 'Assesses medical products, practices, and publishes health guidelines.',
      priority: 5,
    },
  ],

  // Germany
  DE: [
    {
      id: 'bfr',
      name: 'BfR (Bundesinstitut für Risikobewertung)',
      description: 'Federal Institute for Risk Assessment that evaluates food, product, and chemical safety',
      priority: 2,
      website: 'https://www.bfr.bund.de',
    },
    {
      id: 'bvl',
      name: 'BVL (Bundesamt für Verbraucherschutz und Lebensmittelsicherheit)',
      description: 'Federal Office of Consumer Protection and Food Safety.',
      priority: 2,
    },
    {
      id: 'wettbewerbszentrale',
      name: 'Wettbewerbszentrale',
      description: 'Self-regulatory organization for fair competition and advertising',
      priority: 1,
      website: 'https://www.wettbewerbszentrale.de',
    },
    {
      id: 'baua',
      name: 'BAuA (Bundesanstalt für Arbeitsschutz und Arbeitsmedizin)',
      description: 'Federal Institute for Occupational Safety and Health that regulates product safety.',
      priority: 4,
    },
    {
      id: 'uba',
      name: 'UBA (Umweltbundesamt)',
      description:
        'German Environment Agency that provides guidelines for environmental claims and certifications.',
      priority: 5,
    },
  ],

  // Canada
  CA: [
    {
      id: 'health-canada',
      name: 'Health Canada',
      description: 'Federal department responsible for health product regulation and consumer safety communications.',
      priority: 1,
      website: 'https://www.canada.ca/en/health-canada.html',
    },
    {
      id: 'competition-bureau',
      name: 'Competition Bureau Canada',
      description: 'Enforces competition and marketing practices to prevent deceptive advertising.',
      priority: 2,
      website: 'https://www.competitionbureau.gc.ca',
    },
    {
      id: 'cfia',
      name: 'CFIA (Canadian Food Inspection Agency)',
      description: 'Regulates food safety, animal health, and plant protection.',
      priority: 2,
    },
    {
      id: 'asc',
      name: 'Ad Standards Canada (ASC)',
      description: 'Self-regulatory organization overseeing advertising standards and complaints.',
      priority: 3,
    },
  ],

  // Australia
  AU: [
    {
      id: 'accc',
      name: 'ACCC (Australian Competition and Consumer Commission)',
      description: 'Enforces competition and consumer protection laws',
      priority: 1,
      website: 'https://www.accc.gov.au',
    },
    {
      id: 'fsanz',
      name: 'FSANZ (Food Standards Australia New Zealand)',
      description: 'Develops food standards for Australia and New Zealand',
      priority: 2,
      website: 'https://www.foodstandards.gov.au',
    },
    {
      id: 'tga',
      name: 'TGA (Therapeutic Goods Administration)',
      description:
        'Regulates therapeutic goods including medicines, medical devices, and supplements',
      priority: 2,
      website: 'https://www.tga.gov.au',
    },
    {
      id: 'aana',
      name: 'AANA (Australian Association of National Advertisers)',
      description:
        'Self-regulatory body that sets standards for advertising and marketing communications.',
      priority: 4,
    },
    {
      id: 'climate-active',
      name: 'Climate Active',
      description:
        'Government-backed initiative that certifies carbon neutral claims and environmental statements.',
      priority: 5,
    },
  ],

  // New Zealand
  NZ: [
    {
      id: 'asa-nz',
      name: 'ASA (Advertising Standards Authority New Zealand)',
      description: 'Regulates advertising standards and handles complaints across all media.',
      priority: 1,
      website: 'https://www.asa.co.nz',
    },
    {
      id: 'mpi',
      name: 'MPI (Ministry for Primary Industries)',
      description: 'Oversees food safety, primary industries, and biosecurity.',
      priority: 2,
    },
    {
      id: 'medsafe',
      name: 'Medsafe',
      description: 'New Zealand Medicines and Medical Devices Safety Authority.',
      priority: 3,
    },
  ],

  // Ireland
  IE: [
    {
      id: 'fsaireland',
      name: 'FSAI (Food Safety Authority of Ireland)',
      description: 'Ensures food consumed, distributed, or produced in Ireland meets the highest standards of food safety.',
      priority: 2,
      website: 'https://www.fsai.ie',
    },
    {
      id: 'asi',
      name: 'ASAI (Advertising Standards Authority for Ireland)',
      description: 'Self-regulatory body for advertising standards in Ireland.',
      priority: 1,
    },
    {
      id: 'hse',
      name: 'HSE (Health Service Executive)',
      description: 'Provides public health guidelines and regulations, particularly for healthcare-related products.',
      priority: 3,
    },
  ],

  // Spain
  ES: [
    {
      id: 'aesan',
      name: 'AESAN (Agencia Española de Seguridad Alimentaria y Nutrición)',
      description: 'Ensures food safety and nutrition standards in Spain.',
      priority: 1,
    },
    {
      id: 'aecosan',
      name: 'AECOSAN (Agencia Española de Consumo, Seguridad Alimentaria y Nutrición)',
      description: 'Regulates consumer affairs, food safety, and nutrition.',
      priority: 2,
    },
    {
      id: 'autocontrol',
      name: 'AUTOCONTROL (Asociación para la Autorregulación de la Comunicación Comercial)',
      description: 'Self-regulatory organization overseeing advertising standards.',
      priority: 2,
    },
    {
      id: 'ministerio-sanidad',
      name: 'Ministerio de Sanidad',
      description: 'Spanish Ministry of Health overseeing health product regulations.',
      priority: 3,
    },
  ],

  // Italy
  IT: [
    {
      id: 'ministero-salute',
      name: 'Ministero della Salute',
      description: 'Italian Ministry of Health overseeing health claims and product regulations.',
      priority: 1,
      website: 'https://www.salute.gov.it',
    },
    {
      id: 'agcm',
      name: 'AGCM (Autorità Garante della Concorrenza e del Mercato)',
      description: 'Ensures fair competition and truthful advertising in Italy.',
      priority: 2,
    },
    {
      id: 'icam',
      name: 'ICAM (Istituto di Autodisciplina Pubblicitaria)',
      description: 'Self-regulatory institute responsible for advertising standards.',
      priority: 3,
    },
    {
      id: 'iss',
      name: 'ISS (Istituto Superiore di Sanità)',
      description: 'National health institute providing guidelines on health products.',
      priority: 3,
    },
  ],

  // Netherlands
  NL: [
    {
      id: 'vwa',
      name: 'NVWA (Nederlandse Voedsel- en Warenautoriteit)',
      description: 'Dutch Food and Consumer Product Safety Authority.',
      priority: 1,
    },
    {
      id: 'stichting-reclame-code',
      name: 'Stichting Reclame Code',
      description: 'Dutch Advertising Code Authority overseeing advertising standards.',
      priority: 2,
      website: 'https://www.reclamecode.nl',
    },
    {
      id: 'keuringsraad',
      name: 'Keuringsraad',
      description: 'Approves dietary supplement and health product claims for advertising.',
      priority: 3,
    },
  ],

  // Belgium
  BE: [
    {
      id: 'fagg',
      name: 'FAGG (Federaal Agentschap voor Geneesmiddelen en Gezondheidsproducten)',
      description: 'Regulates medicines and health products in Belgium.',
      priority: 1,
    },
    {
      id: 'faviq',
      name: 'FAVV (Federaal Agentschap voor de Veiligheid van de Voedselketen)',
      description: 'Ensures food safety across the supply chain.',
      priority: 2,
    },
    {
      id: 'jep',
      name: 'JEP (Jury voor Ethische Praktijken inzake Reclame)',
      description: 'Self-regulatory body handling advertising ethics and complaints.',
      priority: 3,
    },
  ],

  // Sweden
  SE: [
    {
      id: 'livsmedelsverket',
      name: 'Livsmedelsverket (Swedish Food Agency)',
      description: 'Responsible for food safety and nutrition in Sweden.',
      priority: 1,
      website: 'https://www.livsmedelsverket.se',
    },
    {
      id: 'konsumentverket',
      name: 'Konsumentverket (Swedish Consumer Agency)',
      description: 'Protects consumer rights and regulates advertising claims.',
      priority: 2,
    },
    {
      id: 'lmf',
      name: 'LMF (Läkemedelsverket)',
      description: 'Swedish Medical Products Agency overseeing medical goods and health claims.',
      priority: 3,
    },
  ],

  // Norway
  NO: [
    {
      id: 'mattilsynet',
      name: 'Mattilsynet (Norwegian Food Safety Authority)',
      description: 'Regulates food safety, animal health, and plant health.',
      priority: 1,
    },
    {
      id: 'forbrukertilsynet',
      name: 'Forbrukertilsynet (Norwegian Consumer Authority)',
      description: 'Enforces marketing and advertising laws.',
      priority: 2,
    },
    {
      id: 'helsedirektoratet',
      name: 'Helsedirektoratet (Norwegian Directorate of Health)',
      description: 'Offers guidance on health-related marketing and product claims.',
      priority: 3,
    },
  ],

  // Denmark
  DK: [
    {
      id: 'foedevare',
      name: 'Fødevarestyrelsen (Danish Veterinary and Food Administration)',
      description: 'Ensures food safety and consumer protection.',
      priority: 1,
    },
    {
      id: 'forbrugerombudsmanden',
      name: 'Forbrugerombudsmanden (Danish Consumer Ombudsman)',
      description: 'Oversees marketing laws and handles advertising complaints.',
      priority: 2,
    },
    {
      id: 'laegemiddelstyrelsen',
      name: 'Lægemiddelstyrelsen (Danish Medicines Agency)',
      description: 'Regulates pharmaceuticals and medical devices.',
      priority: 3,
    },
  ],

  // Finland
  FI: [
    {
      id: 'ruokavirasto',
      name: 'Ruokavirasto (Finnish Food Authority)',
      description: 'Oversees food safety, animal health, and plant health.',
      priority: 1,
    },
    {
      id: 'kuluttaja-asiamies',
      name: 'Kuluttaja-asiamies (Finnish Consumer Ombudsman)',
      description: 'Ensures compliance with consumer protection laws and marketing ethics.',
      priority: 2,
    },
    {
      id: 'fimea',
      name: 'Fimea (Finnish Medicines Agency)',
      description: 'Regulates medicines, medical devices, and blood products.',
      priority: 3,
    },
  ],

  // Switzerland
  CH: [
    {
      id: 'bag',
      name: 'BAG (Bundesamt für Gesundheit)',
      description: 'Swiss Federal Office of Public Health overseeing health claims and regulations.',
      priority: 1,
    },
    {
      id: 'blw',
      name: 'BLW (Bundesamt für Landwirtschaft)',
      description: 'Oversees agricultural policies and food production standards.',
      priority: 2,
    },
    {
      id: 'ska',
      name: 'Schweizerische Lauterkeitskommission',
      description: 'Swiss Fairness Commission that self-regulates advertising standards.',
      priority: 3,
    },
  ],

  // General fallback
  general: [
    {
      id: 'iso',
      name: 'ISO (International Organization for Standardization)',
      description: 'Provides international standards for quality, safety, and efficiency across industries.',
      priority: 1,
    },
    {
      id: 'codex',
      name: 'Codex Alimentarius Commission',
      description: 'Establishes international food standards, guidelines, and codes of practice.',
      priority: 2,
    },
    {
      id: 'who',
      name: 'WHO (World Health Organization)',
      description: 'Provides global health guidelines and standards for health-related products and claims.',
      priority: 3,
    },
    {
      id: 'wto',
      name: 'WTO (World Trade Organization)',
      description: 'Regulates international trade and has standards regarding commercial communications.',
      priority: 4,
    },
    {
      id: 'industry-specific',
      name: 'Industry-Specific Trade Associations',
      description: 'Various industry groups that provide self-regulatory guidelines for their sectors.',
      priority: 5,
    },
  ],
};

function sortByPriority(agencies: DefaultVettingAgency[]): DefaultVettingAgency[] {
  return [...agencies].sort((a, b) => a.priority - b.priority);
}

export function getDefaultAgenciesForCountry(countryCode?: string | null): DefaultVettingAgency[] {
  if (!countryCode) {
    return sortByPriority(DEFAULT_VETTING_AGENCIES.general);
  }

  const normalized = countryCode.trim().toUpperCase();
  const agencies =
    DEFAULT_VETTING_AGENCIES[normalized] ?? DEFAULT_VETTING_AGENCIES.general;

  return sortByPriority(agencies);
}

