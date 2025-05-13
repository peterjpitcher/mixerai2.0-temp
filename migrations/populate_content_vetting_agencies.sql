-- Populate content_vetting_agencies table

-- United Kingdom
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Food Standards Agency (FSA)', 'Oversees food safety and hygiene across the supply chain.', 'GB', 1),
  ('Department for Environment, Food and Rural Affairs (DEFRA)', 'Regulates food labelling, composition, and environmental impact.', 'GB', 2),
  ('Trading Standards', 'Enforces laws on weights, measures, labelling, and food fraud.', 'GB', 3),
  ('Advertising Standards Authority (ASA)', 'Regulates food advertising, especially health/nutritional claims.', 'GB', 4),
  ('UK Health Security Agency (UKHSA)', 'Monitors food-related public health risks.', 'GB', 5),
  ('Environment Agency', 'Ensures compliance with environmental laws at manufacturing sites.', 'GB', 6),
  ('Health and Safety Executive (HSE)', 'Ensures safe working conditions in food manufacturing plants.', 'GB', 7),
  ('British Retail Consortium (BRCGS)', 'Provides food safety and quality certification used in retail trade.', 'GB', 8);

-- United States
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Food and Drug Administration (FDA)', 'Main regulator for food safety, labelling, and compliance.', 'US', 1),
  ('United States Department of Agriculture (USDA)', 'Regulates meat, poultry, and egg products.', 'US', 2),
  ('Federal Trade Commission (FTC)', 'Oversees food advertising, consumer protection, and marketing claims.', 'US', 3),
  ('Food Safety and Inspection Service (FSIS)', 'Conducts inspections of facilities handling USDA-regulated products.', 'US', 4),
  ('Centers for Disease Control and Prevention (CDC)', 'Monitors and responds to foodborne illnesses.', 'US', 5),
  ('Environmental Protection Agency (EPA)', 'Regulates pesticides and environmental impacts of food production.', 'US', 6),
  ('Occupational Safety and Health Administration (OSHA)', 'Regulates safety in food production environments.', 'US', 7),
  ('Alcohol and Tobacco Tax and Trade Bureau (TTB)', 'Regulates alcoholic ingredients and labelling.', 'US', 8);

-- Australia
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Food Standards Australia New Zealand (FSANZ)', 'Develops food standards for safety, nutrition, and labelling.', 'AU', 1),
  ('Department of Agriculture, Fisheries and Forestry (DAFF)', 'Oversees food exports, imports, and quarantine.', 'AU', 2),
  ('Australian Competition and Consumer Commission (ACCC)', 'Enforces laws around misleading food marketing and claims.', 'AU', 3),
  ('State Food Authorities (e.g., NSW Food Authority)', 'Implement national food laws locally.', 'AU', 4),
  ('Australian Quarantine and Inspection Service (AQIS)', 'Handles inspections at the border for biosecurity.', 'AU', 5),
  ('Therapeutic Goods Administration (TGA)', 'Regulates food products with therapeutic claims (e.g., supplements).', 'AU', 6),
  ('Safe Work Australia', 'Covers workplace safety across industries, including food.', 'AU', 7),
  ('Australian Packaging Covenant Organisation (APCO)', 'Focuses on sustainable packaging, increasingly relevant to food brands.', 'AU', 8);

-- Bangladesh
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('বাংলাদেশ নিরাপদ খাদ্য কর্তৃপক্ষ (Bangladesh Food Safety Authority – BFSA)', 'National authority for food safety and hygiene.', 'BD', 1),
  ('বাংলাদেশ স্ট্যান্ডার্ডস অ্যান্ড টেস্টিং ইনস্টিটিউশন (BSTI)', 'Regulates food standards, labelling, weights, and measures.', 'BD', 2),
  ('জাতীয় ভোক্তা অধিকার সংরক্ষণ অধিদপ্তর (DNCRP)', 'Consumer rights protection, including food marketing practices.', 'BD', 3),
  ('পরিবেশ অধিদপ্তর (DoE)', 'Monitors environmental compliance in manufacturing.', 'BD', 4),
  ('জনস্বাস্থ্য ইনস্টিটিউট (NIPSOM/IPH)', 'Oversees foodborne disease surveillance and lab testing.', 'BD', 5),
  ('শ্রম ও কর্মসংস্থান মন্ত্রণালয় (Ministry of Labour and Employment)', 'Governs workplace safety, including factories.', 'BD', 6),
  ('স্বাস্থ্য ও পরিবার কল্যাণ মন্ত্রণালয় (Ministry of Health and Family Welfare)', 'Public health implications of food production.', 'BD', 7),
  ('বাণিজ্য মন্ত্রণালয় (Ministry of Commerce)', 'Oversees food imports, exports, and trade policy.', 'BD', 8);

-- Brazil
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Agência Nacional de Vigilância Sanitária (ANVISA)', 'Regulates food safety, labelling, and hygiene.', 'BR', 1),
  ('Ministério da Agricultura, Pecuária e Abastecimento (MAPA)', 'Oversees food production, animal products, and inspection.', 'BR', 2),
  ('Instituto Nacional de Metrologia, Qualidade e Tecnologia (INMETRO)', 'Controls packaging, measurements, and product compliance.', 'BR', 3),
  ('Conselho Nacional de Autorregulamentação Publicitária (CONAR)', 'Regulates food advertising and marketing ethics.', 'BR', 4),
  ('Secretaria Nacional do Consumidor (SENACON)', 'Consumer protection agency handling complaints and compliance.', 'BR', 5),
  ('Instituto Brasileiro do Meio Ambiente (IBAMA)', 'Oversees environmental impact of food manufacturing.', 'BR', 6),
  ('Ministério da Saúde', 'Health guidelines and dietary policy.', 'BR', 7),
  ('Secretarias Estaduais de Saúde', 'Regional food safety and inspection responsibilities.', 'BR', 8);

-- Canada
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Canadian Food Inspection Agency (CFIA) / Agence canadienne d’inspection des aliments (ACIA)', 'Regulates food safety, labelling, and compliance.', 'CA', 1),
  ('Health Canada / Santé Canada', 'Sets food safety and nutritional guidelines, approves additives.', 'CA', 2),
  ('Competition Bureau / Bureau de la concurrence', 'Oversees food marketing, deceptive practices, and pricing.', 'CA', 3),
  ('Environment and Climate Change Canada / Environnement et Changement climatique Canada', 'Monitors environmental impact of manufacturing.', 'CA', 4),
  ('Canadian Grain Commission', 'Relevant for cereal/grain quality and grading.', 'CA', 5),
  ('Employment and Social Development Canada (ESDC)', 'Ensures safe labour practices in food factories.', 'CA', 6),
  ('Standards Council of Canada / Conseil canadien des normes', 'Coordinates standardisation and certification.', 'CA', 7),
  ('Provincial Health Authorities', 'Enforce local food handling and sales laws.', 'CA', 8);

-- China
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('国家市场监督管理总局 (SAMR – State Administration for Market Regulation)', 'Oversees food safety, advertising, and fair competition.', 'CN', 1),
  ('国家卫生健康委员会 (NHC – National Health Commission)', 'Regulates nutrition, health claims, and public health.', 'CN', 2),
  ('中国海关总署 (GACC – General Administration of Customs)', 'Oversees import/export and labelling compliance.', 'CN', 3),
  ('农业农村部 (MOA – Ministry of Agriculture and Rural Affairs)', 'Food production standards and quality of agricultural products.', 'CN', 4),
  ('生态环境部 (MEE – Ministry of Ecology and Environment)', 'Controls pollution and environmental impact of factories.', 'CN', 5),
  ('工业和信息化部 (MIIT – Ministry of Industry and Information Technology)', 'Regulates food manufacturing technologies.', 'CN', 6),
  ('国家知识产权局 (CNIPA – China National Intellectual Property Administration)', 'Protects packaging, trademarks, and brand assets.', 'CN', 7),
  ('国家标准化管理委员会 (SAC – Standardization Administration of China)', 'Governs GB food standards for production and sales.', 'CN', 8);

-- Denmark
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Fødevarestyrelsen (Danish Veterinary and Food Administration)', 'Main authority for food safety and inspections.', 'DK', 1),
  ('Sundhedsstyrelsen (Danish Health Authority)', 'Handles nutrition guidance and public health.', 'DK', 2),
  ('Miljøstyrelsen (Danish Environmental Protection Agency)', 'Regulates emissions and waste in food production.', 'DK', 3),
  ('Forbrugerombudsmanden (Consumer Ombudsman)', 'Regulates food advertising and consumer protection.', 'DK', 4),
  ('Erhvervsstyrelsen (Danish Business Authority)', 'Oversees product labelling and business compliance.', 'DK', 5),
  ('Arbejdstilsynet (Danish Working Environment Authority)', 'Regulates workplace safety in factories.', 'DK', 6),
  ('Landbrugsstyrelsen (Danish Agricultural Agency)', 'Responsible for farming practices and subsidies.', 'DK', 7),
  ('Dansk Standard', 'Coordinates food-related technical standards (e.g., ISO, HACCP).', 'DK', 8);

-- Egypt
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('الهيئة القومية لسلامة الغذاء (NFSA – National Food Safety Authority)', 'Main regulator for food safety and inspection.', 'EG', 1),
  ('وزارة الصحة والسكان (Ministry of Health and Population)', 'Oversees public health, foodborne diseases, and nutrition.', 'EG', 2),
  ('جهاز حماية المستهلك (Consumer Protection Agency)', 'Regulates food advertising and consumer rights.', 'EG', 3),
  ('الهيئة العامة للرقابة على الصادرات والواردات (GOEIC)', 'Controls import/export and compliance certification.', 'EG', 4),
  ('وزارة التموين والتجارة الداخلية (Ministry of Supply and Internal Trade)', 'Oversees food distribution and retail regulation.', 'EG', 5),
  ('وزارة الزراعة واستصلاح الأراضي (Ministry of Agriculture and Land Reclamation)', 'Regulates raw materials and agricultural production.', 'EG', 6),
  ('جهاز تنمية المشروعات الصغيرة والمتوسطة', 'Provides oversight for food SMEs and marketing compliance.', 'EG', 7),
  ('الهيئة العامة للمواصفات والجودة (EOS – Egyptian Organization for Standardization)', 'Handles labelling and technical standards.', 'EG', 8);

-- Finland
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Ruokavirasto (Finnish Food Authority)', 'Oversees food safety, inspections, and traceability.', 'FI', 1),
  ('Sosiaali- ja terveysministeriö (STM – Ministry of Social Affairs and Health)', 'Regulates public health and food-related illnesses.', 'FI', 2),
  ('Kilpailu- ja kuluttajavirasto (KKV – Finnish Competition and Consumer Authority)', 'Monitors food advertising, pricing, and consumer rights.', 'FI', 3),
  ('Ympäristöministeriö (Ministry of the Environment)', 'Oversees sustainable production and waste from food manufacturing.', 'FI', 4),
  ('Työsuojeluviranomainen (Occupational Safety Authority)', 'Ensures workplace safety in production environments.', 'FI', 5),
  ('Tulli (Finnish Customs)', 'Ensures compliance in food imports and exports.', 'FI', 6),
  ('Maa- ja metsätalousministeriö (Ministry of Agriculture and Forestry)', 'Regulates agriculture, fisheries, and food production.', 'FI', 7),
  ('Suomen Standardisoimisliitto (SFS – Finnish Standards Association)', 'Manages technical and quality standards in food processing.', 'FI', 8);

-- France
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Direction générale de l’alimentation (DGAL)', 'Sécurité sanitaire des aliments, inspections, traçabilité.', 'FR', 1),
  ('Agence nationale de sécurité sanitaire de l’alimentation (ANSES)', 'Évaluation des risques alimentaires, nutritionnels et toxicologiques.', 'FR', 2),
  ('Direction générale de la concurrence, de la consommation et de la répression des fraudes (DGCCRF)', 'Publicité alimentaire, étiquetage, pratiques commerciales.', 'FR', 3),
  ('Ministère de l’Agriculture et de la Souveraineté alimentaire', 'Réglementation sur les produits agricoles, certifications.', 'FR', 4),
  ('Autorité de régulation professionnelle de la publicité (ARPP)', 'Surveillance des allégations marketing et publicité alimentaire.', 'FR', 5),
  ('Ministère de la Santé et de la Prévention', 'Réglementation nutritionnelle et santé publique.', 'FR', 6),
  ('Agence de la transition écologique (ADEME)', 'Impact environnemental de la production alimentaire.', 'FR', 7),
  ('AFNOR (Association Française de Normalisation)', 'Normalisation des processus industriels et qualité produits.', 'FR', 8);

-- Germany
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Bundesamt für Verbraucherschutz und Lebensmittelsicherheit (BVL)', 'Bundesweite Lebensmittelsicherheit und Kontrolle.', 'DE', 1),
  ('Bundesinstitut für Risikobewertung (BfR)', 'Wissenschaftliche Risikobewertung für Lebensmittel und Gesundheit.', 'DE', 2),
  ('Bundeskartellamt', 'Kontrolle unlauterer Werbung und Preisabsprachen.', 'DE', 3),
  ('Deutsche Lebensmittelbuch-Kommission', 'Definiert Lebensmittelstandards und rechtliche Begriffsdefinitionen.', 'DE', 4),
  ('Ministerium für Ernährung und Landwirtschaft (BMEL)', 'Regelt Landwirtschaft, Lebensmittelproduktion und -verarbeitung.', 'DE', 5),
  ('Umweltbundesamt (UBA)', 'Kontrolle von Umweltauflagen in der Produktion.', 'DE', 6),
  ('Arbeitsschutzbehörden der Bundesländer', 'Arbeitssicherheit in der Lebensmittelproduktion.', 'DE', 7),
  ('Deutsches Institut für Normung (DIN)', 'Standards für Produktionsprozesse und Qualitätssicherung.', 'DE', 8);

-- Greece
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Ελληνικός Οργανισμός Γεωργικών Ασφαλίσεων (ΕΦΕΤ)', 'Κύριος φορέας για ασφάλεια τροφίμων και επιθεωρήσεις.', 'GR', 1),
  ('Υπουργείο Αγροτικής Ανάπτυξης και Τροφίμων', 'Ρυθμίζει την παραγωγή και εμπορία αγροδιατροφικών προϊόντων.', 'GR', 2),
  ('Γενική Γραμματεία Εμπορίου και Προστασίας Καταναλωτή', 'Έλεγχος εμπορικών πρακτικών και διαφήμισης.', 'GR', 3),
  ('Εθνικός Οργανισμός Φαρμάκων (ΕΟΦ)', 'Επιβλέπει τα συμπληρώματα διατροφής και ισχυρισμούς υγείας.', 'GR', 4),
  ('Συνήγορος του Καταναλωτή', 'Ρυθμίζει παραπλανητική σήμανση και προωθητικές ενέργειες.', 'GR', 5),
  ('Ελληνικός Οργανισμός Τυποποίησης (ΕΛΟΤ)', 'Ανάπτυξη προτύπων παραγωγής και ποιότητας.', 'GR', 6),
  ('Υπουργείο Υγείας', 'Δημόσια υγεία και διατροφή.', 'GR', 7),
  ('Υπουργείο Περιβάλλοντος και Ενέργειας', 'Κανονισμοί για τη ρύπανση και την αειφορία.', 'GR', 8);

-- India
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Food Safety and Standards Authority of India (FSSAI) / भारतीय खाद्य संरक्षा और मानक प्राधिकरण', 'Main food safety, standards, and labelling regulator.', 'IN', 1),
  ('Ministry of Health and Family Welfare / स्वास्थ्य एवं परिवार कल्याण मंत्रालय', 'Handles nutrition and food-related health policy.', 'IN', 2),
  ('Ministry of Consumer Affairs, Food and Public Distribution / उपभोक्ता मामले, खाद्य और सार्वजनिक वितरण मंत्रालय', 'Oversees consumer protection, weights and measures.', 'IN', 3),
  ('Agricultural and Processed Food Products Export Development Authority (APEDA) / कृषि एवं प्रसंस्कृत खाद्य उत्पाद निर्यात विकास प्राधिकरण', 'Regulates exports and standards for processed foods.', 'IN', 4),
  ('Bureau of Indian Standards (BIS) / भारतीय मानक ब्यूरो', 'Technical standards for manufacturing and labelling.', 'IN', 5),
  ('Ministry of Environment, Forest and Climate Change / पर्यावरण, वन और जलवायु परिवर्तन मंत्रालय', 'Environmental compliance for factories.', 'IN', 6),
  ('Advertising Standards Council of India (ASCI)', 'Monitors misleading food advertisements.', 'IN', 7),
  ('Employees' State Insurance Corporation (ESIC)', 'Worker health and safety in factories.', 'IN', 8);

-- Indonesia
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Badan Pengawas Obat dan Makanan (BPOM)', 'Otoritas utama untuk keamanan pangan dan label produk.', 'ID', 1),
  ('Kementerian Kesehatan Republik Indonesia (Kemenkes)', 'Mengatur gizi dan kesehatan masyarakat.', 'ID', 2),
  ('Kementerian Pertanian (Kementan)', 'Produksi makanan dari hasil pertanian.', 'ID', 3),
  ('Badan Standardisasi Nasional (BSN)', 'Menetapkan standar nasional untuk produk makanan.', 'ID', 4),
  ('Kementerian Perdagangan (Kemendag)', 'Mengatur peredaran, ekspor, dan iklan produk makanan.', 'ID', 5),
  ('Kementerian Lingkungan Hidup dan Kehutanan (KLHK)', 'Mengatur dampak lingkungan dari industri makanan.', 'ID', 6),
  ('Komisi Pengawas Persaingan Usaha (KPPU)', 'Mencegah praktik dagang yang tidak adil.', 'ID', 7),
  ('Asosiasi Pengiklan Indonesia (APPINA)', 'Pengawasan etik iklan makanan dan minuman.', 'ID', 8);

-- Iran
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('سازمان غذا و دارو (IFDA – Iranian Food and Drug Administration)', 'مرجع اصلی نظارت بر ایمنی غذا، برچسب‌گذاری و مجوزها.', 'IR', 1),
  ('وزارت بهداشت، درمان و آموزش پزشکی', 'مسئول بهداشت عمومی و تغذیه.', 'IR', 2),
  ('سازمان ملی استاندارد ایران (ISIRI)', 'تدوین استانداردهای تولید، ترکیب و بسته‌بندی مواد غذایی.', 'IR', 3),
  ('سازمان حمایت از مصرف‌کنندگان و تولیدکنندگان', 'نظارت بر قیمت‌گذاری و تبلیغات فریبنده.', 'IR', 4),
  ('سازمان دامپزشکی کشور', 'نظارت بر محصولات دامی و فرآورده‌های گوشتی.', 'IR', 5),
  ('سازمان حفاظت محیط زیست', 'پایش تأثیرات زیست‌محیطی تولید مواد غذایی.', 'IR', 6),
  ('وزارت جهاد کشاورزی', 'کنترل مواد اولیه و زنجیره تأمین.', 'IR', 7),
  ('سازمان تعزیرات حکومتی', 'رسیدگی به تخلفات تجاری از جمله فروش ناعادلانه یا گمراه‌کننده.', 'IR', 8);

-- Italy
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Ministero della Salute', 'Supervisione sulla sicurezza alimentare e l'etichettatura.', 'IT', 1),
  ('Istituto Superiore di Sanità (ISS)', 'Ricerca e sorveglianza su rischi sanitari legati agli alimenti.', 'IT', 2),
  ('Ministero dell'Agricoltura, della Sovranità Alimentare e delle Foreste (MASAF)', 'Regolamenta agricoltura, qualità alimentare, e filiere.', 'IT', 3),
  ('Autorità Garante della Concorrenza e del Mercato (AGCM)', 'Controlla pubblicità ingannevole e pratiche di marketing.', 'IT', 4),
  ('Comando Carabinieri per la Tutela della Salute (NAS)', 'Ispezione e repressione delle frodi alimentari.', 'IT', 5),
  ('Ministero dell'Ambiente e della Sicurezza Energetica', 'Monitoraggio ambientale di siti produttivi.', 'IT', 6),
  ('Istituto Nazionale di Ricerca per gli Alimenti e la Nutrizione (CREA Alimenti e Nutrizione)', 'Politiche nutrizionali e scientifiche.', 'IT', 7),
  ('UNI – Ente Italiano di Normazione', 'Norme tecniche per la produzione e la qualità.', 'IT', 8);

-- Japan
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('厚生労働省 (MHLW – Ministry of Health, Labour and Welfare)', '관리栄養、食品の安全性とラベリング。', 'JP', 1),
  ('食品安全委員会 (FSC – Food Safety Commission of Japan)', '食品のリスク評価。', 'JP', 2),
  ('消費者庁 (CAA – Consumer Affairs Agency)', '食品表示、広告、健康表示の規制。', 'JP', 3),
  ('農林水産省 (MAFF – Ministry of Agriculture, Forestry and Fisheries)', '農産物の基準と食品製造業の監督。', 'JP', 4),
  ('環境省', '食品製造の環境影響を監視。', 'JP', 5),
  ('独立行政法人製品評価技術基盤機構 (NITE)', '技術標準と製品の安全評価。', 'JP', 6),
  ('公正取引委員会 (JFTC)', '不当表示や取引慣行の監督。', 'JP', 7),
  ('日本産業標準調査会 (JISC)', '食品に関する国家規格の策定。', 'JP', 8);

-- Malaysia
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Kementerian Kesihatan Malaysia (KKM)', 'Kawal selia keselamatan makanan dan pelabelan.', 'MY', 1),
  ('Bahagian Keselamatan dan Kualiti Makanan (BKKM)', 'Agensi khusus dalam KKM untuk pemeriksaan makanan.', 'MY', 2),
  ('Suruhanjaya Syarikat Malaysia (SSM)', 'Pendaftaran dan pematuhan perniagaan makanan.', 'MY', 3),
  ('Kementerian Perdagangan Dalam Negeri dan Kos Sara Hidup (KPDN)', 'Pengiklanan dan perlindungan pengguna.', 'MY', 4),
  ('Jabatan Pertanian Malaysia', 'Standard pertanian dan bahan mentah.', 'MY', 5),
  ('Jabatan Alam Sekitar (DOE)', 'Pengurusan sisa dan pemantauan kilang makanan.', 'MY', 6),
  ('Lembaga Kemajuan Ikan Malaysia (LKIM)', 'Standard pemprosesan makanan laut.', 'MY', 7),
  ('Jabatan Standard Malaysia', 'Pensijilan piawaian makanan dan proses.', 'MY', 8);

-- Mexico
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Comisión Federal para la Protección contra Riesgos Sanitarios (COFEPRIS)', 'Principal autoridad sanitaria y reguladora de alimentos.', 'MX', 1),
  ('Secretaría de Salud', 'Políticas de salud pública relacionadas con la alimentación.', 'MX', 2),
  ('Procuraduría Federal del Consumidor (PROFECO)', 'Protección al consumidor, etiquetado y prácticas engañosas.', 'MX', 3),
  ('Servicio Nacional de Sanidad, Inocuidad y Calidad Agroalimentaria (SENASICA)', 'Supervisión de producción agrícola y seguridad alimentaria.', 'MX', 4),
  ('Secretaría de Agricultura y Desarrollo Rural (SADER)', 'Regula la producción y distribución agrícola.', 'MX', 5),
  ('Secretaría de Medio Ambiente y Recursos Naturales (SEMARNAT)', 'Manejo ambiental de instalaciones de producción.', 'MX', 6),
  ('Comisión Nacional de Normalización (CNN)', 'Desarrollo de normas técnicas de alimentos.', 'MX', 7),
  ('Instituto Nacional de Salud Pública (INSP)', 'Investigación en nutrición y riesgos sanitarios.', 'MX', 8);

-- New Zealand
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Ministry for Primary Industries (MPI)', 'Core agency regulating food safety, labelling, production, and exports.', 'NZ', 1),
  ('New Zealand Food Safety (a division of MPI)', 'Oversees food control plans, standards, and inspections.', 'NZ', 2),
  ('New Zealand Commerce Commission', 'Regulates marketing practices and misleading claims.', 'NZ', 3),
  ('Environmental Protection Authority (EPA)', 'Manages pesticide use and environmental controls.', 'NZ', 4),
  ('Ministry of Health (MoH)', 'Provides public health policy and nutrition guidelines.', 'NZ', 5),
  ('WorkSafe New Zealand', 'Ensures factory and worker safety in manufacturing.', 'NZ', 6),
  ('New Zealand Customs Service', 'Oversees food imports/exports and tariff compliance.', 'NZ', 7),
  ('Standards New Zealand', 'Sets and maintains technical standards, including for food processing and packaging.', 'NZ', 8);

-- Nigeria
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('National Agency for Food and Drug Administration and Control (NAFDAC)', 'Regulates food safety, labelling, and product approval.', 'NG', 1),
  ('Standards Organisation of Nigeria (SON)', 'Sets national food production and packaging standards.', 'NG', 2),
  ('Federal Ministry of Health', 'Oversees nutrition and public health.', 'NG', 3),
  ('Federal Competition and Consumer Protection Commission (FCCPC)', 'Monitors food advertising, pricing, and misleading claims.', 'NG', 4),
  ('National Environmental Standards and Regulations Enforcement Agency (NESREA)', 'Environmental monitoring of production facilities.', 'NG', 5),
  ('Nigeria Agricultural Quarantine Service (NAQS)', 'Manages import/export of agricultural commodities.', 'NG', 6),
  ('Nigeria Customs Service', 'Border control and tariff enforcement on food products.', 'NG', 7),
  ('Federal Ministry of Agriculture and Rural Development (FMARD)', 'Agricultural policy and regulation of raw ingredients.', 'NG', 8);

-- Norway
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Mattilsynet (Norwegian Food Safety Authority)', 'Hovedansvar for mattrygghet, merking og inspeksjon.', 'NO', 1),
  ('Helsedirektoratet (Norwegian Directorate of Health)', 'Ernæringsretningslinjer og folkehelsepolitikk.', 'NO', 2),
  ('Forbrukertilsynet (Consumer Authority)', 'Regulerer matreklame og villedende markedsføring.', 'NO', 3),
  ('Miljødirektoratet (Norwegian Environment Agency)', 'Overvåker utslipp og miljøpåvirkning fra næringsmiddelindustri.', 'NO', 4),
  ('Arbeidstilsynet (Labour Inspection Authority)', 'Sikkerhet og helse på arbeidsplassen.', 'NO', 5),
  ('Landbruksdirektoratet (Norwegian Agriculture Agency)', 'Regulerer primærproduksjon og råvarer.', 'NO', 6),
  ('Tollvesenet (Norwegian Customs)', 'Kontroll av import/eksport av matvarer.', 'NO', 7),
  ('Standard Norge (Standards Norway)', 'Utvikler tekniske og kvalitetssikringsstandarder.', 'NO', 8);

-- Pakistan
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Pakistan Standards and Quality Control Authority (PSQCA) / پاکستان معیار و کوالٹی کنٹرول اتھارٹی', 'Develops and enforces food standards.', 'PK', 1),
  ('Punjab Food Authority (PFA) / پنجاب فوڈ اتھارٹی', 'Provincial body regulating food safety and hygiene (influential nationally).', 'PK', 2),
  ('Ministry of National Health Services, Regulations and Coordination / وزارت صحت', 'Oversees public health and nutrition policy.', 'PK', 3),
  ('Drug Regulatory Authority of Pakistan (DRAP)', 'Regulates nutraceuticals and therapeutic food items.', 'PK', 4),
  ('Pakistan Council of Scientific and Industrial Research (PCSIR)', 'Food research and quality testing.', 'PK', 5),
  ('Ministry of Climate Change / ماحولیاتی تبدیلی کی وزارت', 'Environmental compliance and sustainability.', 'PK', 6),
  ('Competition Commission of Pakistan (CCP)', 'Oversees fair marketing and deceptive practices.', 'PK', 7),
  ('Federal Board of Revenue – Customs Wing', 'Regulates import/export of food products.', 'PK', 8);

-- Philippines
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Food and Drug Administration (FDA Philippines)', 'Regulates food safety, labelling, product registration.', 'PH', 1),
  ('Department of Health (DOH)', 'Health policies, including nutrition and dietary guidance.', 'PH', 2),
  ('Department of Trade and Industry (DTI)', 'Oversees fair trade, advertising, and product standards.', 'PH', 3),
  ('Bureau of Agriculture and Fisheries Standards (BAFS)', 'Develops food production standards.', 'PH', 4),
  ('Bureau of Customs (BOC)', 'Regulates food imports and tariff compliance.', 'PH', 5),
  ('Department of Agriculture (DA)', 'Governs food production and agricultural raw materials.', 'PH', 6),
  ('Department of Environment and Natural Resources (DENR)', 'Environmental policies affecting food manufacturing.', 'PH', 7),
  ('National Consumer Affairs Council (NCAC)', 'Oversees consumer rights and product claims enforcement.', 'PH', 8);

-- Russia
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Роспотребнадзор (Federal Service for Surveillance on Consumer Rights Protection and Human Wellbeing)', 'Контролирует безопасность пищевых продуктов, маркировку и санитарные нормы.', 'RU', 1),
  ('Россельхознадзор (Federal Service for Veterinary and Phytosanitary Surveillance)', 'Контролирует сырье, сельхозпродукцию и импорт/экспорт.', 'RU', 2),
  ('Министерство здравоохранения Российской Федерации', 'Формирует политику в области питания и общественного здравоохранения.', 'RU', 3),
  ('Федеральная антимонопольная служба (ФАС)', 'Контролирует рекламу, недобросовестную конкуренцию и маркетинговые практики.', 'RU', 4),
  ('Росстандарт (Federal Agency on Technical Regulating and Metrology)', 'Разработка и контроль стандартов ГОСТ.', 'RU', 5),
  ('Министерство сельского хозяйства РФ', 'Политика в сфере пищевой промышленности и сельского хозяйства.', 'RU', 6),
  ('Росприроднадзор (Federal Service for Supervision of Natural Resources)', 'Контроль за экологическим воздействием пищевого производства.', 'RU', 7),
  ('Таможенная служба России', 'Таможенный контроль продуктов питания и ингредиентов.', 'RU', 8);

-- Singapore
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Singapore Food Agency (SFA)', 'Main authority for food safety, labelling, imports, and licensing.', 'SG', 1),
  ('Health Promotion Board (HPB)', 'Sets nutrition guidelines and front-of-pack health claims.', 'SG', 2),
  ('Advertising Standards Authority of Singapore (ASAS)', 'Regulates food marketing and advertising ethics.', 'SG', 3),
  ('Enterprise Singapore (ESG)', 'Develops food-related quality standards and export support.', 'SG', 4),
  ('National Environment Agency (NEA)', 'Oversees environmental compliance in food manufacturing.', 'SG', 5),
  ('Workforce Singapore (WSG)', 'Covers workplace safety and training in food industries.', 'SG', 6),
  ('Singapore Customs', 'Regulates food imports/exports and declarations.', 'SG', 7),
  ('Competition and Consumer Commission of Singapore (CCCS)', 'Ensures fair competition and accurate consumer information.', 'SG', 8);

-- South Africa
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Department of Health (DOH)', 'Leads food labelling laws and public health policy.', 'ZA', 1),
  ('Department of Agriculture, Land Reform and Rural Development (DALRRD)', 'Oversees agricultural inputs and food production.', 'ZA', 2),
  ('National Regulator for Compulsory Specifications (NRCS)', 'Regulates food safety and standards.', 'ZA', 3),
  ('South African Bureau of Standards (SABS)', 'Develops national standards for food and packaging.', 'ZA', 4),
  ('Advertising Regulatory Board (ARB)', 'Regulates advertising, including nutrition and health claims.', 'ZA', 5),
  ('Department of Trade, Industry and Competition (DTIC)', 'Governs fair trade, product claims, and pricing.', 'ZA', 6),
  ('South African Revenue Service (Customs)', 'Regulates food imports and tariffs.', 'ZA', 7),
  ('Department of Employment and Labour', 'Ensures workplace safety in food manufacturing.', 'ZA', 8);

-- South Korea
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('식품의약품안전처 (MFDS – Ministry of Food and Drug Safety)', '총괄 식품 안전, 영양표시, 수입 허가.', 'KR', 1),
  ('공정거래위원회 (KFTC – Korea Fair Trade Commission)', '광고, 마케팅, 부당 표시 규제.', 'KR', 2),
  ('농림축산식품부 (MAFRA – Ministry of Agriculture, Food and Rural Affairs)', '식품 원재료와 유통 체계 감독.', 'KR', 3),
  ('환경부 (MOE – Ministry of Environment)', '식품 제조 환경 규제 및 친환경 정책.', 'KR', 4),
  ('관세청 (Korea Customs Service)', '식품 수입·수출 신고 및 검역.', 'KR', 5),
  ('식품산업협회 (Korea Food Industry Association)', '산업 표준, 홍보, 기업 협업.', 'KR', 6),
  ('한국표준협회 (KSA – Korean Standards Association)', '기술 및 안전 표준.', 'KR', 7),
  ('고용노동부 (Ministry of Employment and Labour)', '제조 시설의 안전과 노동환경.', 'KR', 8);

-- Spain
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Agencia Española de Seguridad Alimentaria y Nutrición (AESAN)', 'Supervisión de seguridad alimentaria y etiquetado.', 'ES', 1),
  ('Ministerio de Sanidad', 'Salud pública, nutrición, y regulación sanitaria.', 'ES', 2),
  ('Ministerio de Agricultura, Pesca y Alimentación (MAPA)', 'Control sobre materias primas, trazabilidad y distribución.', 'ES', 3),
  ('Agencia Española de Consumo, Seguridad Alimentaria y Nutrición (AECOSAN)', 'Protección del consumidor y normas de marketing alimentario.', 'ES', 4),
  ('Instituto Nacional de Consumo', 'Supervisión de publicidad engañosa y derechos del consumidor.', 'ES', 5),
  ('Ministerio para la Transición Ecológica y el Reto Demográfico', 'Regulación ambiental y sostenibilidad de la producción.', 'ES', 6),
  ('Agencia Estatal de Administración Tributaria (AEAT – Aduanas)', 'Control aduanero y comercio internacional de alimentos.', 'ES', 7),
  ('Asociación Española de Normalización (UNE)', 'Desarrollo de normas técnicas para calidad y procesos alimentarios.', 'ES', 8);

-- Sweden
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Livsmedelsverket (Swedish Food Agency)', 'Huvudansvarig för livsmedelssäkerhet, märkning och kontroll.', 'SE', 1),
  ('Konsumentverket (Swedish Consumer Agency)', 'Övervakar marknadsföring och vilseledande reklam.', 'SE', 2),
  ('Jordbruksverket (Swedish Board of Agriculture)', 'Reglerar råvaror och jordbruksrelaterad produktion.', 'SE', 3),
  ('Folkhälsomyndigheten (Public Health Agency of Sweden)', 'Näringsrekommendationer och hälsopolicy.', 'SE', 4),
  ('Arbetsmiljöverket (Swedish Work Environment Authority)', 'Arbetsmiljö och säkerhet inom produktion.', 'SE', 5),
  ('Naturvårdsverket (Swedish Environmental Protection Agency)', 'Övervakar miljöpåverkan från livsmedelsindustrin.', 'SE', 6),
  ('Tullverket (Swedish Customs)', 'Tillsyn av livsmedelsimport och export.', 'SE', 7),
  ('SIS – Svenska Institutet för Standarder', 'Utvecklar tekniska standarder och certifieringar.', 'SE', 8);

-- Turkey
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Tarım ve Orman Bakanlığı (Ministry of Agriculture and Forestry)', 'Gıda üretimi, etiketleme ve denetim konularında ana yetkili.', 'TR', 1),
  ('Türkiye Gıda ve İçecek Sanayi Dernekleri Federasyonu (TGDF)', 'Sektörün temsilcisi, mevzuat ve standart geliştirme.', 'TR', 2),
  ('Tüketici Hakları ve Rekabet Kurumu', 'Gıda reklamları ve tüketici koruma düzenlemeleri.', 'TR', 3),
  ('Gıda ve Kontrol Genel Müdürlüğü', 'Gıda güvenliği ve hijyen denetimleri.', 'TR', 4),
  ('Sağlık Bakanlığı', 'Beslenme politikaları ve kamu sağlığı düzenlemeleri.', 'TR', 5),
  ('Çevre, Şehircilik ve İklim Değişikliği Bakanlığı', 'Üretim tesislerinin çevresel etkileri.', 'TR', 6),
  ('Türk Standartları Enstitüsü (TSE)', 'Gıda üretimi ve ambalajlamaya yönelik teknik standartlar.', 'TR', 7),
  ('Ticaret Bakanlığı – Gümrükler Genel Müdürlüğü', 'Gıda ithalat ve ihracat denetimi.', 'TR', 8);

-- Ukraine
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Державна служба України з питань безпечності харчових продуктів та захисту споживачів (Держпродспоживслужба)', 'Основна установа з контролю якості та безпеки харчових продуктів.', 'UA', 1),
  ('Міністерство охорони здоров'я України', 'Політика у сфері харчування та здоров'я населення.', 'UA', 2),
  ('Антимонопольний комітет України', 'Регулювання реклами та недобросовісної конкуренції.', 'UA', 3),
  ('Міністерство аграрної політики та продовольства України', 'Контроль за сільськогосподарською продукцією та сировиною.', 'UA', 4),
  ('Державна екологічна інспекція України', 'Моніторинг впливу харчового виробництва на довкілля.', 'UA', 5),
  ('Державна служба України з питань праці', 'Охорона праці на харчових підприємствах.', 'UA', 6),
  ('Державна митна служба України', 'Контроль імпорту та експорту продуктів харчування.', 'UA', 7),
  ('Українське агентство зі стандартизації (УАСС)', 'Розробка технічних стандартів та сертифікації.', 'UA', 8);

-- Vietnam
INSERT INTO content_vetting_agencies (name, description, country_code, priority) VALUES
  ('Cục An toàn Thực phẩm (VFA – Vietnam Food Administration)', 'Cơ quan chính quản lý an toàn thực phẩm và kiểm tra sản phẩm.', 'VN', 1),
  ('Bộ Y tế (Ministry of Health)', 'Quản lý dinh dưỡng, sức khỏe cộng đồng và quy định nhãn mác.', 'VN', 2),
  ('Bộ Nông nghiệp và Phát triển Nông thôn (MARD)', 'Giám sát nguồn nguyên liệu và quy trình sản xuất nông sản.', 'VN', 3),
  ('Cục Quản lý Cạnh tranh và Bảo vệ Người tiêu dùng', 'Kiểm soát quảng cáo và gian lận thương mại.', 'VN', 4),
  ('Tổng cục Môi trường (VEA)', 'Giám sát tác động môi trường của các cơ sở sản xuất.', 'VN', 5),
  ('Tổng cục Tiêu chuẩn Đo lường Chất lượng (STAMEQ)', 'Xây dựng tiêu chuẩn kỹ thuật cho ngành thực phẩm.', 'VN', 6),
  ('Tổng cục Hải quan Việt Nam', 'Quản lý nhập khẩu và xuất khẩu sản phẩm thực phẩm.', 'VN', 7),
  ('Cục An toàn Lao động', 'Đảm bảo an toàn và sức khỏe tại nơi làm việc.', 'VN', 8); 