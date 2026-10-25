/*
  Colégio São Benedito · materials list
  ------------------------------------
  To publish a material:
  1. Put the file in files/<grade>/ (for example files/8ano/trabalho-bimestral.pdf)
  2. Add one entry to "materials" below.

  grade  : '6ano' '7ano' '8ano' '9ano' '1em' '2em' '3em', a list like ['8ano', '9ano'], or 'all'
  kind   : 'project' (trabalho bimestral) · 'guide' (guia de estudo) · 'support' (material de apoio)
  title  : what students will see
  desc   : one short line (optional)
  file   : path inside this folder, e.g. 'files/8ano/guia-unit-5.pdf'
  url    : use instead of "file" for an outside link (Google Drive, YouTube, Canva…)
  posted : 'YYYY-MM-DD'
  due    : 'YYYY-MM-DD'  (only for projects, optional)
*/
window.SB = {
  term: { en: '4th term · 2026', pt: '4º bimestre · 2026' },
  grades: [
    { id: '6ano', label: '6º ano',   group: 'ef' },
    { id: '7ano', label: '7º ano',   group: 'ef' },
    { id: '8ano', label: '8º ano',   group: 'ef' },
    { id: '9ano', label: '9º ano',   group: 'ef' },
    { id: '1em',  label: '1ª série', group: 'em' },
    { id: '2em',  label: '2ª série', group: 'em' },
    { id: '3em',  label: '3ª série', group: 'em' }
  ],
  materials: [
    // { grade: '8ano', kind: 'project', title: 'Trabalho bimestral: My City', desc: 'Leia as instruções com atenção.', file: 'files/8ano/trabalho-bimestral.pdf', posted: '2026-10-27', due: '2026-11-10' },
    { grade: '6ano', kind: 'project', title: 'Lista de exercícios: Fun and Games', desc: 'Leisure activities, present continuous, toys, sports e numbers.', file: 'files/6ano/lista-de-exercicios-4bim.pdf', posted: '2026-10-25' },
    { grade: '7ano', kind: 'project', title: 'Trabalho bimestral: Ideas Factory', desc: 'Pesquisa e texto sobre a adolescência de uma personalidade mundial.', file: 'files/7ano/trabalho-bimestral-4bim.pdf', posted: '2026-10-25' },
    { grade: '8ano', kind: 'project', title: 'Trabalho bimestral: Who am I? e Planning ahead', desc: 'Documentos de viagem, future with will, question words e planejamento de viagens.', file: 'files/8ano/trabalho-bimestral-4bim.pdf', posted: '2026-10-25' },
    { grade: '9ano', kind: 'project', title: 'Trabalho bimestral: tag questions, phrasal verbs e tempos verbais', desc: 'Revisão de simple present, present continuous, simple past, present perfect e future.', file: 'files/9ano/trabalho-bimestral-4bim.pdf', posted: '2026-10-25' },
    { grade: '1em',  kind: 'project', title: 'Trabalho bimestral: What kind of consumer are you?', desc: 'Consumo responsável, present perfect e present perfect x simple past.', file: 'files/1em/trabalho-bimestral-4bim.pdf', posted: '2026-10-25' },
    { grade: '2em',  kind: 'project', title: 'Trabalho bimestral: Advertising e reported speech', desc: 'Publicidade, persuasão, anúncios enganosos e discurso indireto.', file: 'files/2em/trabalho-bimestral-4bim.pdf', posted: '2026-10-25' },
    { grade: '3em',  kind: 'project', title: 'Lista de exercícios: conjunctions, reported speech e phrasal verbs', desc: 'Com questões de interpretação de texto no estilo vestibular.', file: 'files/3em/lista-de-exercicios-4bim.pdf', posted: '2026-10-25' },
  ]
};
