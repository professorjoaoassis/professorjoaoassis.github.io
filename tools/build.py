#!/usr/bin/env python3
"""Builds every page of the site from one shared header/footer.
Run from the project root:  python3 tools/build.py
Text pairs: English is the default; data-pt holds the Portuguese version.
<span class="lw" data-tr="...">word</span> marks a word for Learning mode."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRAND = '<span class="pre">Professor</span> João Assis<span class="dot">.</span>'   # shown top-left on every page
SITE_NAME = 'Professor João Assis'     # used in page titles

NAV = [('students/', 'Students', 'Alunos'), ('playground/', 'Playground', 'Playground'),
       ('projects/', 'Projects', 'Projetos'), ('about/', 'About me', 'Sobre mim')]


def lw(word, tr):
    return f'<span class="lw" data-tr="{tr}">{word}</span>'


def page(path, title_en, title_pt, desc, body, current=None, css=(), scripts=(), footer_extra='', wave=True):
    depth = path.count('/')
    root = '/' if path == '404.html' else '../' * depth   # the 404 page can be shown at any address
    nav = '\n      '.join(
        f'<a href="{root}{href}" data-pt="{pt}"{" aria-current=\"page\"" if current == href else ""}>{en}</a>'
        for href, en, pt in NAV)
    css_links = ''.join(f'\n<link rel="stylesheet" href="{root}assets/{c}">' for c in css)
    js = ''.join(f'\n<script src="{s if s.startswith("http") or s.startswith("./") else root + s}"></script>' for s in scripts)
    wave_html = '\n<div class="wave" aria-hidden="true"><canvas></canvas></div>' if wave else ''
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title data-pt="{title_pt}">{title_en}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#08090b">
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
  <span data-pt="Criado e dirigido por João · Cuiabá, MT">Designed and directed by João · Cuiabá, MT</span>{footer_extra}
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
  <div class="sky" role="group" aria-label="Time of day in the scene" data-pt-aria="Hora do dia na cena">
    <button type="button" data-sky="auto" aria-pressed="true">auto</button>
    <button type="button" data-sky="day" aria-pressed="false">day</button>
    <button type="button" data-sky="night" aria-pressed="false">night</button>
  </div>
  <div class="wotd"><b>flood</b><i>/flʌd/</i><span>enchente</span></div>
</div>

<main class="wrap home" id="main">
  <div class="intro">
    <p class="hi" data-pt="<em>Hi!</em> Eu sou o João."><em>Hi!</em> I'm João.</p>
    <h1 data-pt="Professor de inglês <span>em Cuiabá.</span>">English teacher <span>in Cuiabá.</span></h1>
    <p class="lead" data-pt="Dou aula para crianças e adolescentes e crio jogos e apps que deixam o inglês mais fácil de praticar. Aqui você encontra atividades, joguinhos e os meus projetos.">I teach {lw('kids', 'crianças')} and {lw('teenagers', 'adolescentes')}, and I {lw('build', 'construo, crio')} small games and apps that make English {lw('easier', 'mais fácil')} to {lw('practice', 'praticar')}. Here you can {lw('find', 'encontrar')} activities, games and my projects.</p>
    <a class="sb-callout" href="students/sao-benedito/"><b>Colégio São Benedito</b><span data-pt="Os guias de estudo e o trabalho bimestral estão aqui.">Study guides and the bimonthly project are here.</span><b class="arw" aria-hidden="true">→</b></a>
  </div>

  <section aria-labelledby="k-index">
    <p class="kicker" id="k-index" data-pt="Explore">Explore</p>
    <ul class="index">
      <li><a href="students/"><strong data-pt="Alunos">Students</strong><span data-pt="Atividades, guias de estudo e trabalhos, separados por escola e série.">Activities, study guides and projects, {lw('organized', 'organizados')} by school and {lw('grade', 'série, ano escolar')}.</span><b class="arw" aria-hidden="true">→</b></a></li>
      <li><a href="playground/"><strong>Playground</strong><span data-pt="Joguinhos e apps para praticar inglês no navegador.">Small games and apps to practice English in your {lw('browser', 'navegador')}.</span><b class="arw" aria-hidden="true">→</b></a></li>
      <li><a href="projects/"><strong data-pt="Projetos">Projects</strong><span data-pt="Coisas maiores que eu construí: jogos, mapas e ferramentas para a escola.">Bigger things I've {lw('built', 'construí')}: games, maps and {lw('tools', 'ferramentas')} for school.</span><b class="arw" aria-hidden="true">→</b></a></li>
      <li><a href="about/"><strong data-pt="Sobre mim">About me</strong><span data-pt="Quem eu sou, como eu ensino e como eu fiz este site.">Who I am, how I teach, and how I made this site.</span><b class="arw" aria-hidden="true">→</b></a></li>
    </ul>
  </section>
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

# ---------------------------------------------------------------- playground
PLAY = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <h1>Playground</h1>
    <p class="lead" data-pt="Joguinhos para praticar inglês brincando. Funcionam no celular e no computador.">Small games to {lw('practice', 'praticar')} English while you play. They work on your phone and on your computer.</p>
  </div>
  <ul class="cards">
    <li>
      <div class="top"><h3>Word Fishing</h3><span class="chip game">game</span></div>
      <p data-pt="Clique no anão da página inicial para pescar palavras em inglês. Dá para ouvir a pronúncia e colecionar as 12, mas cuidado com a gaivota.">Click the dwarf on the home page to {lw('fish', 'pescar')} for English words. You can listen to each word and collect all 12, but watch out for the {lw('seagull', 'gaivota')}.</p>
      <a class="more" href="../" data-pt="Jogar na página inicial →">Play on the home page →</a>
    </li>
  </ul>
  <p class="lead" style="font-size:15px" data-pt="Mais jogos estão a caminho.">More games are on the way.</p>
</main>
'''

# ---------------------------------------------------------------- projects
def proj(name, chip, en, pt):
    return f'''    <li>
      <div class="top"><h3>{name}</h3><span class="chip {chip}">{chip}</span></div>
      <p data-pt="{pt}">{en}</p>
      <p class="chip" style="--c:var(--sand)" data-pt="em andamento">in progress</p>
    </li>'''

PROJECTS = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <h1 data-pt="Projetos">Projects</h1>
    <p class="lead" data-pt="Coisas maiores que eu construí ou estou construindo: jogos, mapas e ferramentas para a escola.">Bigger things I've {lw('built', 'construí')} or I'm still building: games, maps and {lw('tools', 'ferramentas')} for school.</p>
  </div>
  <ul class="cards">
{proj('Pedal to the Spot', 'game', 'A bike game along the beach in Santos, made with a friend.', 'Um jogo de bike pela orla de Santos, feito com um amigo.')}
{proj('Cuiabá heat map', 'map', 'The hottest parts of the city, mapped with satellite data.', 'As regiões mais quentes da cidade, mapeadas com dados de satélite.')}
{proj('Grades &amp; report cards', 'tool', 'A free app for grades and report cards, made for a bilingual school.', 'Um app gratuito de notas e boletins, feito para uma escola bilíngue.')}
{proj('Lesson guide', 'tool', 'An interactive planner to organize the lessons and tasks of a school term.', 'Um planejador interativo para organizar as aulas e tarefas do bimestre.')}
  </ul>
</main>
'''

# ---------------------------------------------------------------- about
ABOUT = f'''
<main class="wrap page" id="main">
  <div class="page-head">
    <h1 data-pt="Sobre mim">About me</h1>
  </div>
  <div class="prose">
    <p data-pt="Oi! Eu sou o João, professor de inglês em Cuiabá, Mato Grosso. Dou aula no Colégio São Benedito, para o Fundamental II e o Ensino Médio, e num programa bilíngue para crianças pequenas.">Hi! I'm João, an English teacher in Cuiabá, Mato Grosso. I teach at Colégio São Benedito, in middle and high school, and in a {lw('bilingual', 'bilíngue')} program for young children.</p>
    <h2 data-pt="Como eu ensino">How I teach</h2>
    <p data-pt="Eu acredito que a gente aprende melhor brincando. Por isso uso jogos e histórias nas aulas e adapto o conteúdo ao nível de cada turma, com palavras simples e passos pequenos.">I {lw('believe', 'acredito')} people learn better when they play. That's why I use games and stories in my classes, and I {lw('adapt', 'adapto')} each lesson to the level of the class, with simple words and small steps.</p>
    <h2 data-pt="Como eu fiz este site">How I made this site</h2>
    <p data-pt="Eu desenhei este site e decidi cada detalhe, da praia em ASCII ao anão pescador, inspirado no jogo Dwarf Fortress. O código foi escrito com a ajuda do Claude, um assistente de inteligência artificial.">I {lw('designed', 'projetei')} this site and chose every {lw('detail', 'detalhe')}, from the ASCII beach to the fishing dwarf, {lw('inspired', 'inspirado')} by the game Dwarf Fortress. The code was written with help from Claude, an AI {lw('assistant', 'assistente')}.</p>
  </div>
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
         scripts=('assets/scene.js',), wave=False,
         footer_extra='\n  <button type="button" id="replay" data-pt="Ver a abertura de novo">Replay intro</button>')
    page('students/', f'Students · {SITE_NAME}', f'Alunos · {SITE_NAME}', 'Materials for my students, by school and grade.', STUDENTS, current='students/')
    page('students/sao-benedito/', f'Colégio São Benedito · {SITE_NAME}', f'Colégio São Benedito · {SITE_NAME}',
         'Study guides, support materials and the bimonthly project for each grade at Colégio São Benedito.', SB,
         current='students/', css=('sb.css',), scripts=('./materials.js', './app.js'))
    page('playground/', f'Playground · {SITE_NAME}', f'Playground · {SITE_NAME}', 'Small games to practice English.', PLAY, current='playground/')
    page('projects/', f'Projects · {SITE_NAME}', f'Projetos · {SITE_NAME}', 'Games, maps and tools for school.', PROJECTS, current='projects/')
    page('about/', f'About me · {SITE_NAME}', f'Sobre mim · {SITE_NAME}', 'Who I am and how I teach.', ABOUT, current='about/')
    page('404.html', f'Lost at sea · {SITE_NAME}', f'Perdido no mar · {SITE_NAME}', 'Page not found.', NOT_FOUND)
