// Temario completo. "fase" indica en qué fase del plan se construye cada tema.
export const AMBITOS = [
  { id: 'anatomia', titulo: 'Anatomía y fisiología', icono: 'corazon' },
  { id: 'celular', titulo: 'Biología celular, microbiología y genética', icono: 'celula' },
  { id: 'bioquimica', titulo: 'Bioquímica, biología molecular y farmacología', icono: 'molecula' },
];

export const TEMAS = [
  { id: 'nervioso', ambito: 'anatomia', titulo: 'Sistema nervioso', fase: 4 },
  { id: 'neurona', ambito: 'anatomia', titulo: 'Neurona y sinapsis', fase: 2 },
  { id: 'endocrino', ambito: 'anatomia', titulo: 'Sistema endocrino', fase: 4 },
  { id: 'eje_hipofisis', ambito: 'anatomia', titulo: 'Eje hipotálamo-hipófisis', fase: 2 },
  { id: 'digestivo', ambito: 'anatomia', titulo: 'Aparato digestivo', fase: 4 },
  { id: 'inmune_linfatico', ambito: 'anatomia', titulo: 'Sistemas inmunológico y linfático', fase: 4 },
  { id: 'sangre_inmune', ambito: 'anatomia', titulo: 'Células sanguíneas y anticuerpos', fase: 2 },
  { id: 'tegumentario', ambito: 'anatomia', titulo: 'Sistema tegumentario (piel)', fase: 2 },
  { id: 'musculoesqueletico', ambito: 'anatomia', titulo: 'Sistema musculoesquelético', fase: 4 },
  { id: 'sarcomero', ambito: 'anatomia', titulo: 'Sarcómero y contracción', fase: 2 },
  { id: 'cardiovascular', ambito: 'anatomia', titulo: 'Aparato cardiovascular', fase: 3 },
  { id: 'respiratorio', ambito: 'anatomia', titulo: 'Aparato respiratorio', fase: 4 },
  { id: 'alveolo', ambito: 'anatomia', titulo: 'Alvéolo e intercambio gaseoso', fase: 2 },
  { id: 'urinario', ambito: 'anatomia', titulo: 'Aparato urinario', fase: 4 },
  { id: 'nefrona', ambito: 'anatomia', titulo: 'Nefrona y formación de orina', fase: 2 },
  { id: 'reproductor', ambito: 'anatomia', titulo: 'Aparato reproductor', fase: 4 },
  { id: 'celula', ambito: 'celular', titulo: 'Organelos celulares', fase: 0 },
  { id: 'metabolismo', ambito: 'celular', titulo: 'Metabolismo y respiración celular', fase: 2 },
  { id: 'genetica', ambito: 'celular', titulo: 'Genética y herencia', fase: 2 },
  { id: 'micro', ambito: 'celular', titulo: 'Microbiología y parasitología', fase: 2 },
  { id: 'membrana', ambito: 'bioquimica', titulo: 'Transporte membranal', fase: 2 },
  { id: 'biomoleculas', ambito: 'bioquimica', titulo: 'Biomoléculas', fase: 2 },
];
