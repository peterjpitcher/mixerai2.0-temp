// Vetting agencies organized by country code
export interface VettingAgency {
  id: string;
  name: string;
  description: string;
  priority: number; // Lower number = higher priority
  website?: string;
}

export type VettingAgenciesByCountry = {
  [countryCode: string]: VettingAgency[];
};

export const VETTING_AGENCIES: VettingAgenciesByCountry = {
  // United States
  'US': [
    {
      id: 'fda',
      name: 'FDA (Food and Drug Administration)',
      description: 'Regulates safety of food, drugs, cosmetics, and medical devices',
      priority: 1,
      website: 'https://www.fda.gov'
    },
    {
      id: 'usda',
      name: 'USDA (U.S. Department of Agriculture)',
      description: 'Regulates organic claims, food safety, and agricultural products',
      priority: 2,
      website: 'https://www.usda.gov'
    },
    {
      id: 'ftc',
      name: 'FTC (Federal Trade Commission)',
      description: 'Enforces truth in advertising and prevents deceptive business practices',
      priority: 1,
      website: 'https://www.ftc.gov'
    },
    {
      id: 'cdc',
      name: 'CDC (Centers for Disease Control and Prevention)',
      description: 'Provides health information and safety guidelines, particularly important for health-related content.',
      priority: 4
    },
    {
      id: 'epa',
      name: 'EPA (Environmental Protection Agency)',
      description: 'Verifies environmental claims about products and sustainability practices',
      priority: 3,
      website: 'https://www.epa.gov'
    }
  ],
  
  // United Kingdom
  'GB': [
    {
      id: 'fsa',
      name: 'FSA (Food Standards Agency)',
      description: 'Protects public health related to food in England, Wales and Northern Ireland',
      priority: 2,
      website: 'https://www.food.gov.uk'
    },
    {
      id: 'asa',
      name: 'ASA (Advertising Standards Authority)',
      description: 'UK\'s independent regulator of advertising across all media',
      priority: 1,
      website: 'https://www.asa.org.uk'
    },
    {
      id: 'defra',
      name: 'DEFRA (Department for Environment, Food and Rural Affairs)',
      description: 'Oversees environmental protection, food production, and rural standards.',
      priority: 3
    },
    {
      id: 'mhra',
      name: 'MHRA (Medicines and Healthcare products Regulatory Agency)',
      description: 'Regulates medicines, medical devices, and blood components for transfusion',
      priority: 3,
      website: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency'
    },
    {
      id: 'ea',
      name: 'EA (Environment Agency)',
      description: 'Provides guidelines and regulations regarding environmental protection and sustainability claims.',
      priority: 5
    }
  ],
  
  // France
  'FR': [
    {
      id: 'dgccrf',
      name: 'DGCCRF (Direction Générale de la Concurrence, de la Consommation et de la Répression des Fraudes)',
      description: 'Ensures fair trade, consumer protection and product safety',
      priority: 1,
      website: 'https://www.economie.gouv.fr/dgccrf'
    },
    {
      id: 'arpp',
      name: 'ARPP (Autorité de Régulation Professionnelle de la Publicité)',
      description: 'Self-regulatory organization for advertising content in France',
      priority: 1,
      website: 'https://www.arpp.org'
    },
    {
      id: 'anses',
      name: 'ANSES (Agence Nationale de Sécurité Sanitaire de l\'Alimentation)',
      description: 'Ensures food safety, environmental and occupational health protection.',
      priority: 3
    },
    {
      id: 'ansm',
      name: 'ANSM (Agence Nationale de Sécurité du Médicament et des produits de santé)',
      description: 'Regulates health products and ensures their safety',
      priority: 2,
      website: 'https://ansm.sante.fr'
    },
    {
      id: 'has',
      name: 'HAS (Haute Autorité de Santé)',
      description: 'Assesses medical products, practices, and publishes health guidelines.',
      priority: 5
    }
  ],
  
  // Germany
  'DE': [
    {
      id: 'bfr',
      name: 'BfR (Bundesinstitut für Risikobewertung)',
      description: 'Federal Institute for Risk Assessment that evaluates food, product, and chemical safety',
      priority: 2,
      website: 'https://www.bfr.bund.de'
    },
    {
      id: 'bvl',
      name: 'BVL (Bundesamt für Verbraucherschutz und Lebensmittelsicherheit)',
      description: 'Federal Office of Consumer Protection and Food Safety.',
      priority: 2
    },
    {
      id: 'wettbewerbszentrale',
      name: 'Wettbewerbszentrale',
      description: 'Self-regulatory organization for fair competition and advertising',
      priority: 1,
      website: 'https://www.wettbewerbszentrale.de'
    },
    {
      id: 'baua',
      name: 'BAuA (Bundesanstalt für Arbeitsschutz und Arbeitsmedizin)',
      description: 'Federal Institute for Occupational Safety and Health that regulates product safety.',
      priority: 4
    },
    {
      id: 'uba',
      name: 'UBA (Umweltbundesamt)',
      description: 'German Environment Agency that provides guidelines for environmental claims and certifications.',
      priority: 5
    }
  ],
  
  // Canada
  'CA': [
    {
      id: 'cfia',
      name: 'CFIA (Canadian Food Inspection Agency)',
      description: 'Verifies food safety and enforces regulations for food labeling',
      priority: 2,
      website: 'https://inspection.canada.ca'
    },
    {
      id: 'health-canada',
      name: 'Health Canada',
      description: 'Regulates health products, cosmetics, and health claims',
      priority: 2,
      website: 'https://www.canada.ca/en/health-canada.html'
    },
    {
      id: 'competition-bureau',
      name: 'Competition Bureau',
      description: 'Federal law enforcement agency that ensures fair marketplace competition',
      priority: 1,
      website: 'https://www.competitionbureau.gc.ca'
    },
    {
      id: 'adstandards',
      name: 'Ad Standards',
      description: 'Self-regulatory body for Canadian advertising industry',
      priority: 1,
      website: 'https://adstandards.ca'
    },
    {
      id: 'eccc',
      name: 'ECCC (Environment and Climate Change Canada)',
      description: 'Provides guidelines for environmental claims and sustainability statements.',
      priority: 5
    }
  ],
  
  // Australia
  'AU': [
    {
      id: 'accc',
      name: 'ACCC (Australian Competition and Consumer Commission)',
      description: 'Enforces competition and consumer protection laws',
      priority: 1,
      website: 'https://www.accc.gov.au'
    },
    {
      id: 'fsanz',
      name: 'FSANZ (Food Standards Australia New Zealand)',
      description: 'Develops food standards for Australia and New Zealand',
      priority: 2,
      website: 'https://www.foodstandards.gov.au'
    },
    {
      id: 'tga',
      name: 'TGA (Therapeutic Goods Administration)',
      description: 'Regulates therapeutic goods including medicines, medical devices, and supplements',
      priority: 2,
      website: 'https://www.tga.gov.au'
    },
    {
      id: 'aana',
      name: 'AANA (Australian Association of National Advertisers)',
      description: 'Self-regulatory body that sets standards for advertising and marketing communications.',
      priority: 4
    },
    {
      id: 'climate-active',
      name: 'Climate Active',
      description: 'Government-backed initiative that certifies carbon neutral claims and environmental statements.',
      priority: 5
    }
  ],
  
  // General (used when country-specific agencies aren't available)
  'general': [
    {
      id: 'iso',
      name: 'ISO (International Organization for Standardization)',
      description: 'Provides international standards for quality, safety, and efficiency across industries.',
      priority: 1
    },
    {
      id: 'codex',
      name: 'Codex Alimentarius Commission',
      description: 'Establishes international food standards, guidelines, and codes of practice.',
      priority: 2
    },
    {
      id: 'who',
      name: 'WHO (World Health Organization)',
      description: 'Provides global health guidelines and standards for health-related products and claims.',
      priority: 3
    },
    {
      id: 'wto',
      name: 'WTO (World Trade Organization)',
      description: 'Regulates international trade and has standards regarding commercial communications.',
      priority: 4
    },
    {
      id: 'industry-specific',
      name: 'Industry-Specific Trade Associations',
      description: 'Various industry groups that provide self-regulatory guidelines for their sectors.',
      priority: 5
    }
  ]
};

// Helper function to get vetting agencies for a specific country
export function getVettingAgenciesForCountry(countryCode: string): VettingAgency[] {
  // If we have specific agencies for this country, return them
  if (countryCode && VETTING_AGENCIES[countryCode]) {
    return VETTING_AGENCIES[countryCode].sort((a, b) => a.priority - b.priority);
  }
  
  // Otherwise, return the general agencies
  return VETTING_AGENCIES['general'].sort((a, b) => a.priority - b.priority);
} 