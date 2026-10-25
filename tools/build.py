#!/usr/bin/env python3
"""Builds every page of the site from one shared header/footer.
Run from the project root:  python3 tools/build.py
Text pairs: English is the default; data-pt holds the Portuguese version.
<span class="lw" data-tr="...">word</span> marks a word for Learning mode."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = '<span class="pre">Professor</span> João Assis<span class="dot">.</span>'   # shown top-left on every page
SITE_NAME = 'Professor João Assis'     # used in page titles

NAV = [('students/', 'Students', 'Alunos'), ('laboratory/', 'Laboratory', 'Laboratório'),
       ('projects/', 'Projects', 'Projetos'), ('about/', 'About me', 'Sobre mim')]


def lw(word, tr):
    return f'<span class="lw" data-tr="{tr}">{word}</span>'


def page(path, title_en, title_pt, desc, body, current=None, css=(), scripts=(), footer_extra='', wave=True, hidden=False):
    depth = path.count('/')
    root = '/' if path == '404.html' else '../' * depth   # the 404 page can be shown at any address
    nav = '\n      '.join(
        f'<a href="{root}{href}" data-pt="{pt}"{" aria-current=\"page\"" if current == href else ""}>{en}</a>'
        for href, en, pt in NAV)
    css_links = ''.join(f'\n<link rel="stylesheet" href="{root}assets/{c}">' for c in css)
    js = ''.join(f'\n<script src="{s if s.startswith("http") or s.startswith("./") else root + s}"></script>' for s in scripts)
    robots = '\n<meta name="robots" content="noindex, nofollow">' if hidden else ''
    wave_html = '\n<div class="wave" aria-hidden="true"><canvas></canvas></div>' if wave else ''
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title data-pt="{title_pt}">{title_en}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#08090b">{robots}
<meta property="og:title" content="{title_en}">
<meta property="og:description" content="{desc}">
<link rel="icon" href="{root}assets/favicon.svg" type="image/svg+xml">
<script>try{{if(localStorage.getItem('joao-lang')==='pt'){{document.documentElement.classList.add('pt-wait');setTimeout(function(){{document.documentElement.classList.remove('pt-wait')}},1500)}}}}catch(e){{}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="{root}assets/site.css">{css_links}
</head>
<body>
<a class="skip" href="#main" data-pt="Pular para o conteúdo">Skip to content</a>
<div class="wrap">
  <header class="bar">
    <a class="mark" href="{root}" aria-label="{SITE_NAME}, home" data-pt-aria="{SITE_NAME}, início">{BRAND}</a>
    <nav aria-label="Main" data-pt-aria="Principal">
      {nav}
    </nav>
    <div class="lang">
      <button type="button" class="learn-btn" id="learnBtn" aria-pressed="false" title="Underline harder words and show them in Portuguese"><i></i>Learning mode</button>
      <button type="button" class="lang-btn" id="langBtn" lang="pt-BR">Ver em português</button>
    </div>
  </header>
  <p class="learn-hint">Learning mode is on: tap or point at the underlined words to see them in Portuguese.</p>
</div>{wave_html}
{body}
<footer class="site"><div class="wrap">
  <span data-pt="Criado e dirigido por J.P. · Cuiabá, MT">Designed and directed by J.P. · Cuiabá, MT</span>{footer_extra}
</div></footer>
<script src="{root}assets/site.js"></script>{js}
</body>
</html>
'''
    out = ROOT / path / 'index.html' if not path.endswith('.html') else ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print('built', out.relative_to(ROOT))


# ---------------------------------------------------------------- home
CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/><path d="M9 10.5h6M9 13.5h4"/></svg>'

def contact(kicker_id):
    return f'''<section class="contact" aria-labelledby="{kicker_id}">
    <div>
      <p class="kicker" id="{kicker_id}" data-pt="Fale comigo">Get in touch</p>
      <h2 data-pt="Aulas particulares">{lw('Private lessons', 'aulas particulares')}</h2>
      <p data-pt="Ofereço aulas particulares de inglês, com conteúdo adaptado aos objetivos e ao ritmo de cada aluno. Para conversar sobre horários e valores, envie-me uma mensagem pelo WhatsApp.">I {lw('offer', 'ofereço')} private English lessons, {lw('adapted', 'adaptadas')} to each student's {lw('goals', 'objetivos')} and {lw('pace', 'ritmo')}. To talk about times and {lw('prices', 'valores')}, send me a message on WhatsApp.</p>
    </div>
    <div class="contact-act">
      <a class="btn wa" data-wa href="#" target="_blank" rel="noopener">{CHAT_ICON}<span data-pt="Chamar no WhatsApp">Message me on WhatsApp</span></a>
    </div>
  </section>'''


HOME = f'''
<div id="boot" hidden aria-hidden="true">
  <div class="bootbox">
    <div class="who">{BRAND}</div>
    <ul class="bootlines" id="bootLines"></ul>
    <div class="track"><i id="bootBar"></i></div>
    <div class="pct"><span id="bootMsg">loading</span><span id="bootPct">0%</span></div>
  </div>
</div>

<div class="catch-wrap" id="noteWrap" hidden>
  <div class="note" role="dialog" aria-modal="true" aria-labelledby="noteKicker">
    <p class="note-kicker" id="noteKicker">Message in a bottle</p>
    <p class="note-en" id="noteEn"></p>
    <p class="note-pt" id="notePt"></p>
    <div class="note-foot"><span>— J.</span><button type="button" id="noteClose" data-pt="Fechar">Close</button></div>
  </div>
</div>

<div class="catch-wrap" id="catchWrap" hidden>
  <div class="catch" role="dialog" aria-modal="true" aria-labelledby="catchTitle">
    <div class="catch-head">
      <div><p class="kicker">My catch</p><h2 id="catchTitle" data-pt="Palavras pescadas">Words you caught</h2></div>
      <button type="button" class="x" id="catchClose" aria-label="Close" data-pt-aria="Fechar">×</button>
    </div>
    <p class="catch-sub" id="catchSub"></p>
    <ul class="catch-list" id="catchList"></ul>
    <p class="catch-tip" data-pt="Clique no anão para pescar mais palavras. Tem um tesouro escondido no fundo do mar.">Click the dwarf to fish for more words. There is a treasure hidden at the bottom of the sea.</p>
  </div>
</div>

<div class="hero">
  <canvas id="sea" role="img" aria-label="ASCII beach: a dwarf fishes while the tide comes and goes" data-pt-aria="Praia em ASCII: um anão pesca enquanto a maré vai e vem"></canvas>
  <button type="button" id="dwarfBtn" class="dwarf-hit" aria-label="Click the dwarf to fish" data-pt-aria="Clique no anão para ele pescar" title="Click to fish" data-pt-title="Clique para pescar"></button>
  <button type="button" id="bottleBtn" class="dwarf-hit" hidden aria-label="Open the message in the bottle" data-pt-aria="Abrir a mensagem na garrafa" title="Open the bottle" data-pt-title="Abrir a garrafa"></button>
  <button type="button" id="basketBtn" class="dwarf-hit" aria-label="See the words you caught" data-pt-aria="Ver as palavras pescadas" title="See the words you caught" data-pt-title="Ver as palavras pescadas"></button>
  <div class="sky">
    <button type="button" class="snd" id="sndBtn" aria-pressed="false" title="Sound" data-pt-title="Som"><svg viewBox="0 0 16 16" aria-hidden="true"><path class="spk" d="M2 6h3l4-3v10l-4-3H2z"/><path class="w1" d="M11 6.2a2.6 2.6 0 0 1 0 3.6"/><path class="w2" d="M12.8 4.4a5.2 5.2 0 0 1 0 7.2"/><path class="x" d="M11 6l4 4m0-4-4 4"/></svg><span data-pt="som">sound</span></button>
    <i class="sep" aria-hidden="true"></i>
    <div class="sky-t" role="group" aria-label="Time of day in the scene" data-pt-aria="Hora do dia na cena">
    <button type="button" data-sky="auto" aria-pressed="true">auto</button>
    <button type="button" data-sky="day" aria-pressed="false">day</button>
    <button type="button" data-sky="night" aria-pressed="false">night</button>
    </div>
  </div>
  <div class="wotd"><b>ocean</b><i>/ˈoʊʃən/</i><span>oceano</span></div>
</div>

<main class="wrap home" id="main">
  <div class="intro">
    <p class="hi" data-pt="<em>Hi!</em> Eu sou o João."><em>Hi!</em> I'm João.</p>
    <h1 data-pt="Professor de inglês <span>em Cuiabá.</span>">English teacher <span>in Cuiabá.</span></h1>
    <p class="lead" data-pt="Dou aula para crianças, adolescentes e adultos e crio jogos e apps que deixam o inglês mais fácil de praticar. Aqui você encontra atividades, joguinhos e os meus projetos.">I teach {lw('kids', 'crianças')}, {lw('teenagers', 'adolescentes')} and {lw('adults', 'adultos')}, and I {lw('build', 'construo, crio')} small games and apps that make English {lw('easier', 'mais fácil')} to {lw('practice', 'praticar')}. Here you can {lw('find', 'encontrar')} activities, games and my projects.</p>
  </div>

  <section aria-labelledby="k-index">
    <p class="kicker" id="k-index" data-pt="Explore">Explore</p>
    <ul class="index">
      <li><a href="students/"><strong data-pt="Alunos">Students</strong><span data-pt="Atividades, guias de estudo e trabalhos, separados por escola e série.">Activities, study guides and projects, {lw('organized', 'organizados')} by school and {lw('grade', 'série, ano escolar')}.</span><b class="arw" aria-hidden="true">→</b></a></li>
      <li><a href="laboratory/"><strong data-pt="Laboratório">Laboratory</strong><span data-pt="Pequenos experimentos para praticar inglês, como aplicativos e jogos.">Small {lw('experiments', 'experimentos')} to practice English, like apps and games.</span><b class="arw" aria-hidden="true">→</b></a></li>
      <li><a href="projects/"><strong data-pt="Projetos">Projects</strong><span data-pt="Coisas maiores que eu construí: jogos, mapas e ferramentas para a escola.">Bigger things I've {lw('built', 'construí')}: games, maps and {lw('tools', 'ferramentas')} for school.</span><b class="arw" aria-hidden="true">→</b></a></li>
      <li><a href="about/"><strong data-pt="Sobre mim">About me</strong><span data-pt="Quem eu sou e a minha visão de ensino.">Who I am and how I see teaching.</span><b class="arw" aria-hidden="true">→</b></a></li>
    </ul>
  </section>
  {contact('k-contact')}
</main>
'''

# ---------------------------------------------------------------- students hub
STUDENTS = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <p class="kicker" data-pt="Para os meus alunos">For my students</p>
    <h1 data-pt="Alunos">Students</h1>
    <p class="lead" data-pt="Materiais para os meus alunos, separados por escola. Escolha a sua escola para encontrar a sua série.">Materials for my students, {lw('organized', 'organizados')} by school. {lw('Choose', 'Escolha')} your school to find your {lw('grade', 'série, ano escolar')}.</p>
  </div>
  <ul class="index">
    <li><a href="sao-benedito/"><strong>Colégio São Benedito</strong><span data-pt="Fundamental II e Ensino Médio · do 6º ano à 3ª série">Middle and high school · 6º ano to 3ª série</span><b class="arw" aria-hidden="true">→</b></a></li>
  </ul>
  <p class="lead" style="font-size:15px" data-pt="Estuda comigo em outro lugar? A sua página chega em breve.">Studying with me somewhere else? Your page is coming soon.</p>
</main>
'''

# ---------------------------------------------------------------- São Benedito
SB = f'''
<main class="wrap page" id="main">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="../" data-pt="Alunos">Students</a><span aria-hidden="true">/</span><span>Colégio São Benedito</span></nav>
  <div class="page-head">
    <h1>Colégio São Benedito</h1>
    <p class="lead" data-pt="Guias de estudo, materiais de apoio e o trabalho bimestral de cada série. O matutino e o vespertino usam o mesmo material.">Study {lw('guides', 'guias')}, {lw('support', 'apoio')} materials and the {lw('bimonthly', 'bimestral')} project for each {lw('grade', 'série, ano escolar')}. {lw('Morning', 'manhã (matutino)')} and {lw('afternoon', 'tarde (vespertino)')} classes use the {lw('same', 'mesmo')} material.</p>
    <div class="term-row"><span class="pill term" id="term">4th term · 2026</span><span class="pill" data-pt="Matutino e vespertino">Morning and afternoon</span></div>
  </div>

  <section class="picker" aria-labelledby="pickTitle">
    <h2 class="kicker" id="pickTitle" data-pt="Escolha a sua série">Choose your grade</h2>
    <div class="groups">
      <div class="gg"><p class="gg-label">Ensino Fundamental II</p><div class="gbtns" id="g-ef"></div></div>
      <div class="gg"><p class="gg-label">Ensino Médio</p><div class="gbtns" id="g-em"></div></div>
    </div>
  </section>

  <div id="gradeView" aria-live="polite"></div>
</main>
'''

# ---------------------------------------------------------------- laboratory
LAB = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <h1 data-pt="Laboratório">Laboratory</h1>
    <p class="lead" data-pt="Pequenos experimentos para praticar inglês: aplicativos e jogos que funcionam no celular e no computador.">Small {lw('experiments', 'experimentos')} to {lw('practice', 'praticar')} English: apps and games that work on your phone and on your computer.</p>
  </div>
  <ul class="cards">
    <li>
      <div class="top"><h3>Verbie</h3><span class="chip tool">app</span></div>
      <p data-pt="Digite uma ação e o Verbie faz. Entende inglês e português, mostra todas as formas do verbo e deixa ouvir a pronúncia.">Type an action and Verbie acts it out. It {lw('understands', 'entende')} English and Portuguese, shows every form of the verb and lets you hear it.</p>
      <a class="more" href="verbie/" data-pt="Abrir o Verbie →">Open Verbie →</a>
    </li>
    <li>
      <div class="top"><h3>Word Fishing</h3><span class="chip game">game</span></div>
      <p data-pt="Clique no anão da página inicial para pescar palavras em inglês. Dá para ouvir a pronúncia e colecionar todas, mas cuidado com a gaivota.">Click the dwarf on the home page to {lw('fish', 'pescar')} for English words. You can listen to each word and collect them all, but watch out for the {lw('seagull', 'gaivota')}.</p>
      <a class="more" href="../" data-pt="Jogar na página inicial →">Play on the home page →</a>
    </li>
  </ul>
</main>
'''

# ---------------------------------------------------------------- projects
def proj(slug, title_en, title_pt, chip, chip_pt, en, pt, cap_en, cap_pt, link=None):
    more = ''
    if link:
        more = f'\n        <a class="more" href="{link[0]}" target="_blank" rel="noopener" data-pt="{link[2]}">{link[1]}</a>'
    return f"""    <article class="project" id="{slug}">
      <button type="button" class="shot" data-full="img/{slug}.webp" aria-label="Enlarge preview: {title_en}" data-pt-aria="Ampliar prévia: {title_pt}">
        <img src="img/{slug}.webp" alt="" loading="lazy" width="1280" height="800">
        <span class="zoom" aria-hidden="true">⤢</span>
      </button>
      <div class="pbody">
        <div class="top"><h2 data-pt="{title_pt}">{title_en}</h2><span class="chip {chip}" data-pt="{chip_pt}">{chip}</span></div>
        <p data-pt="{pt}">{en}</p>
        <p class="cap" data-pt="{cap_pt}">{cap_en}</p>{more}
      </div>
    </article>"""

PROJECTS = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <h1 data-pt="Projetos">Projects</h1>
    <p class="lead" data-pt="Soluções educacionais e ferramentas que desenvolvi para a sala de aula, para a gestão escolar e para a minha cidade.">Educational {lw('solutions', 'soluções')} and tools I have {lw('developed', 'desenvolvi')} for the classroom, for school management and for my city.</p>
  </div>
  <div class="projects">
{proj('heat-map', 'Cuiabá heat map', 'Mapa de calor de Cuiabá', 'map', 'mapa',
      f"An interactive map that shows the hottest parts of Cuiabá and Várzea Grande using {lw('satellite', 'satélite')} images, with {lw('layers', 'camadas')} for trees, buildings and how the heat has changed since the 1980s. The next step adds MapBiomas {lw('land-use', 'uso da terra')} data from 1985 to today, so we can compare where the city grew and where nature {lw('disappeared', 'desapareceu')} with where it is hottest now. In class, environmental education becomes an {lw('investigation', 'investigação')}: students find their home and school on the map, ask why some {lw('neighborhoods', 'bairros')} are hotter, and suggest where to plant trees, using real data from their own city.",
      'Mapa interativo que identifica as áreas mais quentes de Cuiabá e Várzea Grande a partir de imagens de satélite, com camadas de arborização, áreas construídas e da evolução do calor desde a década de 1980. A próxima etapa incorpora os dados do MapBiomas sobre uso e cobertura da terra de 1985 até hoje, permitindo relacionar o crescimento urbano e a perda de vegetação ao aumento da temperatura. Em sala, a educação ambiental se converte em investigação: os alunos localizam a própria casa e a escola, levantam hipóteses sobre por que alguns bairros esquentam mais e propõem onde plantar árvores ou criar sombra, a partir de dados reais da própria cidade.',
      'Screenshot of the live map.', 'Captura do mapa em funcionamento.',
      ('https://cuiaba-heat.projects.earthengine.app/view/calordecuiaba', 'Open the map →', 'Abrir o mapa →'))}
{proj('school-management', 'School management system', 'Sistema de gestão escolar', 'tool', 'ferramenta',
      f"A system to manage a school's {lw('academic records', 'registros acadêmicos')}. Teachers and coordinators sign in with their own accounts, each with the right {lw('access', 'acesso')}. Teachers enter grades and {lw('absences', 'faltas')}; the system calculates the averages, shows who needs extra support and builds the {lw('report cards', 'boletins')}, ready to export as PDF or Excel. It also keeps class lists, student records and the team's lesson plans in one place.",
      'Sistema para a gestão dos registros acadêmicos de uma escola. Professores e coordenação acessam com login individual, cada um com as permissões adequadas à sua função. Os professores lançam notas e faltas; o sistema calcula as médias, sinaliza quem precisa de recuperação e gera os boletins, prontos para exportação em PDF e Excel. Reúne ainda o cadastro de turmas e alunos e os planejamentos de toda a equipe em um só lugar.',
      'Preview with sample data.', 'Prévia com dados fictícios.')}
{proj('lesson-guide-school', 'Lesson guide · middle and high school', 'Guia de aula · Fundamental II e Ensino Médio', 'tool', 'ferramenta',
      f"A planner for the whole school term, lesson by lesson: topic, book pages, {lw('homework', 'tarefa de casa')} and a plan B for students without their material. It {lw('reminds', 'lembra')} me which homework to check in each class, records homework for each student, {lw('tracks', 'acompanha')} make-up tests and gathers the term grades.",
      'Planejador do bimestre completo, aula a aula: tema, páginas do material, tarefa de casa e um plano B para o aluno sem material. O guia indica qual tarefa deve ser cobrada em cada aula, registra a entrega por aluno, acompanha as segundas chamadas e consolida as notas do bimestre.',
      'Preview with sample data.', 'Prévia com dados fictícios.')}
{proj('lesson-guide-bilingual', 'Lesson guide · bilingual program for children', 'Guia de aula · programa bilíngue infantil', 'tool', 'ferramenta',
      f"A step-by-step guide to use during class on a tablet: warm-up, activities, songs and wrap-up, one step at a time, with the audio tracks ready to play. A {lw('preparation', 'preparo')} tab shows, days in {lw('advance', 'antecedência')}, what each lesson needs, like paint, flashcards or a mystery box.",
      'Roteiro para uso em sala, no tablet: aquecimento, atividades, músicas e encerramento, um passo de cada vez, com as faixas de áudio prontas para tocar. Uma aba de preparo antecipa, com dias de antecedência, o que cada aula exige, como tinta guache, flashcards ou uma mystery box.',
      'Preview with sample data.', 'Prévia com dados fictícios.')}
  </div>
  <dialog class="lightbox" id="lightbox" aria-label="Preview" data-pt-aria="Prévia">
    <img id="lightboxImg" alt="">
    <button type="button" class="lb-close" id="lightboxClose" aria-label="Close" data-pt-aria="Fechar">×</button>
  </dialog>
</main>
'''


# ---------------------------------------------------------------- about
ABOUT = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <h1 data-pt="Sobre mim">About me</h1>
  </div>
  <div class="prose">
    <div class="me">
      <img src="img/joao.webp" width="480" height="600" alt="João Pedro de Assis" loading="eager" decoding="async">
      <div>
      <h2 data-pt="Quem eu sou">Who I am</h2>
    <p data-pt="Sou João Pedro de Assis, professor de inglês em Cuiabá, Mato Grosso. Leciono para crianças, adolescentes e adultos e desenvolvo soluções educacionais e ferramentas digitais voltadas ao aprendizado do idioma.">I'm João Pedro de Assis, an English teacher in Cuiabá, Mato Grosso. I teach children, {lw('teenagers', 'adolescentes')} and {lw('adults', 'adultos')}, and I {lw('create', 'crio, desenvolvo')} educational {lw('solutions', 'soluções')} and digital {lw('tools', 'ferramentas')} for learning English.</p>
      </div>
    </div>
    <h2 data-pt="Minha visão de ensino">My view on teaching</h2>
    <p data-pt="Acredito que o estudo de uma língua vai muito além da memorização de regras ou palavras. Aprender um novo idioma é um processo de emancipação: amplia a forma como nos comunicamos, nos posicionamos e nos relacionamos com o mundo.">I {lw('believe', 'acredito')} that learning a language goes far beyond {lw('memorizing', 'decorar, memorizar')} {lw('rules', 'regras')} and words. A new language changes the way we communicate, how we position ourselves and how we {lw('connect', 'nos relacionamos')} with the world.</p>
    <p data-pt="Ao desenvolver um novo idioma, o aluno conquista acesso a informações, culturas e perspectivas que antes pareciam distantes. A língua deixa de ser uma barreira e passa a ser uma ferramenta de expressão e de crescimento pessoal.">With a new language, you can {lw('reach', 'alcançar, acessar')} information, cultures and {lw('points of view', 'pontos de vista')} that once seemed far away. The language stops being a {lw('barrier', 'barreira')} and becomes a tool for expression and personal {lw('growth', 'crescimento')}.</p>
    <p data-pt="É dessa convicção que nascem as soluções e ferramentas que desenvolvo: quando o aluno experimenta, erra e tenta novamente, o idioma deixa de ser conteúdo escolar e passa a ser, de fato, seu. Estudar línguas é, acima de tudo, um caminho para fortalecer a própria voz no mundo.">That is where the solutions and tools I create come from: when students try, make {lw('mistakes', 'erros')} and try again, English stops being just a school subject and {lw('truly', 'de fato')} becomes theirs. Above all, learning a language is a way to {lw('strengthen', 'fortalecer')} your own voice in the world.</p>
  </div>
  {contact('k-contact')}
</main>
'''

NOT_FOUND = '''
<main class="wrap page" id="main">
  <div class="page-head">
    <p class="kicker">404</p>
    <h1 data-pt="Perdido no mar.">Lost at sea.</h1>
    <p class="lead" data-pt="Esta página não existe ou mudou de lugar.">This page doesn't exist, or it moved.</p>
  </div>
  <p><a class="btn" href="/" data-pt="Voltar para o início">Back to the home page</a></p>
</main>
'''

if __name__ == '__main__':
    desc = 'João, English teacher in Cuiabá: activities, study guides, games and projects.'
    page('', f'{SITE_NAME} · English teacher', f'{SITE_NAME} · Professor de inglês', desc, HOME, css=('home.css',),
         scripts=('assets/sfx.js', 'assets/scene.js'), wave=False,
         footer_extra='\n  <button type="button" id="replay" data-pt="Ver a abertura de novo">Replay intro</button>')
    page('students/', f'Students · {SITE_NAME}', f'Alunos · {SITE_NAME}', 'Materials for my students, by school and grade.', STUDENTS, current='students/')
    page('students/sao-benedito/', f'Colégio São Benedito · {SITE_NAME}', f'Colégio São Benedito · {SITE_NAME}',
         'Study guides, support materials and the bimonthly project for each grade at Colégio São Benedito.', SB,
         current='students/', css=('sb.css',), scripts=('./materials.js', './app.js'), hidden=True)
    page('laboratory/', f'Laboratory · {SITE_NAME}', f'Laboratório · {SITE_NAME}', 'Small experiments to practice English: apps and games.', LAB, current='laboratory/')
    # the old address keeps working
    old = ROOT / 'playground' / 'index.html'
    old.parent.mkdir(exist_ok=True)
    old.write_text('<!doctype html><meta charset="utf-8"><title>Laboratory</title><meta http-equiv="refresh" content="0; url=../laboratory/"><link rel="canonical" href="../laboratory/"><a href="../laboratory/">Laboratory</a>\n', encoding='utf-8')
    page('projects/', f'Projects · {SITE_NAME}', f'Projetos · {SITE_NAME}', 'Educational solutions and tools for the classroom, school management and the city.', PROJECTS, current='projects/', css=('projects.css',), scripts=('assets/projects.js',))
    page('about/', f'About me · {SITE_NAME}', f'Sobre mim · {SITE_NAME}', 'Who I am and how I teach.', ABOUT, current='about/')
    page('404.html', f'Lost at sea · {SITE_NAME}', f'Perdido no mar · {SITE_NAME}', 'Page not found.', NOT_FOUND)
