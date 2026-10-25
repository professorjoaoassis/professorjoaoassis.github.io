/*
  Colégio São Benedito · materials list
  ------------------------------------
  To publish a material:
    1. Put the file in  files/<grade>/   (for example files/8ano/trabalho-bimestral.pdf)
    2. Add one entry to "materials" below.

  grade  : '6ano' '7ano' '8ano' '9ano' '1em' '2em' '3em', a list like ['8ano', '9ano'], or 'all'
  kind   : 'project' (trabalho bimestral) · 'guide' (guia de estudo) · 'support' (material de apoio)
  title  : what students will see
  desc   : one short line (optional)
  file   : path inside this folder, e.g. 'files/8ano/guia-unit-5.pdf'
  url    : use instead of "file" for an outside link (Google Drive, YouTube, Canva…)
  posted : 'YYYY-MM-DD'
  due    : 'YYYY-MM-DD' (only for projects, optional)
*/
window.SB = {
  term: { en: '4th term · 2026', pt: '4º bimestre · 2026' },
  grades: [
    { id: '6ano', label: '6º ano', group: 'ef' },
    { id: '7ano', label: '7º ano', group: 'ef' },
    { id: '8ano', label: '8º ano', group: 'ef' },
    { id: '9ano', label: '9º ano', group: 'ef' },
    { id: '1em', label: '1ª série', group: 'em' },
    { id: '2em', label: '2ª série', group: 'em' },
    { id: '3em', label: '3ª série', group: 'em' }
  ],
  materials: [
    // { grade: '8ano', kind: 'project', title: 'Trabalho bimestral: My City', desc: 'Leia as instruções com atenção.', file: 'files/8ano/trabalho-bimestral.pdf', posted: '2026-10-27', due: '2026-11-10' },
  ]
};
