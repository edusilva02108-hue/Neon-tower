// ============================================
//  TORRE NEON - jogo de um toque feito em p5.js
//  Toque / clique / espaço para soltar o bloco.
//  Quanto mais preciso, mais combos e bônus!
// ============================================

// ---------- CONFIGURAÇÃO DE MONETIZAÇÃO (edite aqui) ----------
const CONFIG = {
  linkApoio: "https://SEU-LINK-DE-APOIO-AQUI", // Pix (link), Apoia.se, Ko-fi, Buy Me a Coffee...
  anuncioACada: 3,        // mostra anúncio de tela cheia a cada X partidas
  pontosParaContinuar: 5, // pontuação mínima para oferecer "continuar vendo anúncio"
};

// Gancho de anúncios: troque o conteúdo pelo SDK que você usar
// (Google AdSense/AdMob, Poki, CrazyGames, GameMonetize...).
// tipo: "intersticial" ou "recompensado". Chame aoTerminar() quando o anúncio acabar.
function mostrarAnuncio(tipo, aoTerminar) {
  if (window.chamarAnuncio) {
    window.chamarAnuncio(tipo, aoTerminar); // defina isso no index.html com o SDK
  } else {
    aoTerminar(); // sem SDK ainda: segue o jogo normalmente
  }
}

let partidas = 0;
let usouContinuar = false;

let estado = "menu"; // menu | jogando | fim
let torre = [];      // blocos já empilhados
let atual;           // bloco em movimento
let caidos = [];     // pedaços cortados caindo
let particulas = [];
let aneis = [];
let pontos = 0;
let recorde = 0;
let combo = 0;
let camY = 0;
let tremor = 0;
let ultimoToque = 0;
let esc = 1;         // escala conforme o tamanho da tela
let alturaBloco, larguraBase;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  textFont("Trebuchet MS");
  try { recorde = parseInt(localStorage.getItem("torreNeonRecorde")) || 0; } catch (e) {}
  ajustarEscala();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  ajustarEscala();
}

function ajustarEscala() {
  esc = constrain(min(width, height * 0.7) / 400, 0.6, 2);
  alturaBloco = 30 * esc;
  larguraBase = min(width * 0.6, 280 * esc);
}

// ---------- Início de partida ----------
function novaPartida() {
  torre = [];
  caidos = [];
  particulas = [];
  aneis = [];
  pontos = 0;
  combo = 0;
  camY = 0;
  usouContinuar = false;
  torre.push({ x: width / 2 - larguraBase / 2, w: larguraBase, matiz: 200 });
  criarBloco();
  estado = "jogando";
}

function criarBloco() {
  const topo = torre[torre.length - 1];
  const dir = random() < 0.5 ? 1 : -1;
  atual = {
    x: dir === 1 ? 0 : width - topo.w,
    w: topo.w,
    dir: dir,
    matiz: (200 + torre.length * 9) % 360,
  };
}

// ---------- Loop principal ----------
function draw() {
  desenharFundo();

  push();
  if (tremor > 0) {
    translate(random(-tremor, tremor), random(-tremor, tremor));
    tremor *= 0.85;
    if (tremor < 0.3) tremor = 0;
  }

  if (estado === "jogando") atualizarJogo();
  camY = lerp(camY, max(0, (torre.length - 5) * alturaBloco), 0.08);

  desenharTorre();
  desenharCaidos();
  desenharParticulas();
  pop();

  desenharInterface();
}

function atualizarJogo() {
  // velocidade aumenta com a pontuação
  const vel = (2.8 + pontos * 0.1) * esc;
  atual.x += atual.dir * min(vel, 11 * esc);
  if (atual.x <= 0) { atual.x = 0; atual.dir = 1; }
  if (atual.x + atual.w >= width) { atual.x = width - atual.w; atual.dir = -1; }
}

// ---------- Ação do jogador ----------
function soltarBloco() {
  const topo = torre[torre.length - 1];
  const esquerda = max(topo.x, atual.x);
  const direita = min(topo.x + topo.w, atual.x + atual.w);
  const sobra = direita - esquerda;

  // errou completamente
  if (sobra <= 0) {
    criarCaido(atual.x, atual.w, atual.matiz, torre.length);
    fimDeJogo();
    return;
  }

  const diferenca = abs(atual.x - topo.x);
  const perfeito = diferenca < 6 * esc;

  if (perfeito) {
    // encaixe perfeito: mantém e recupera um pouco de largura
    combo++;
    atual.x = topo.x;
    atual.w = min(topo.w + (combo > 3 ? 4 * esc : 0), larguraBase);
    pontos += 2 + min(combo, 5);
    aneis.push({ x: atual.x + atual.w / 2, nivel: torre.length, r: 10, a: 1, matiz: atual.matiz });
    explosao(atual.x + atual.w / 2, torre.length, atual.matiz, 18);
  } else {
    combo = 0;
    pontos += 1;
    // corta o pedaço que sobrou
    if (atual.x < topo.x) {
      criarCaido(atual.x, topo.x - atual.x, atual.matiz, torre.length);
    } else {
      criarCaido(direita, atual.x + atual.w - direita, atual.matiz, torre.length);
    }
    atual.x = esquerda;
    atual.w = sobra;
    tremor = 4 * esc;
  }

  torre.push({ x: atual.x, w: atual.w, matiz: atual.matiz });
  criarBloco();
}

function criarCaido(x, w, matiz, nivel) {
  caidos.push({ x: x, w: w, matiz: matiz, nivel: nivel, vy: 0, giro: random(-0.03, 0.03), rot: 0 });
}

function fimDeJogo() {
  estado = "fim";
  partidas++;
  tremor = 14 * esc;
  explosao(width / 2, torre.length, atual.matiz, 40);
  if (pontos > recorde) {
    recorde = pontos;
    try { localStorage.setItem("torreNeonRecorde", recorde); } catch (e) {}
  }
}

// ---------- Efeitos ----------
function explosao(x, nivel, matiz, qtd) {
  for (let i = 0; i < qtd; i++) {
    particulas.push({
      x: x, nivel: nivel,
      yOff: 0,
      vx: random(-4, 4) * esc, vy: random(-7, -1) * esc,
      vida: 1, matiz: matiz, t: random(3, 7) * esc,
    });
  }
}

// ---------- Desenho ----------
function yDoNivel(nivel) {
  return height * 0.78 - (nivel + 1) * alturaBloco + camY;
}

function desenharFundo() {
  const m = (200 + torre.length * 9) % 360;
  for (let y = 0; y < height; y += 4) {
    const t = y / height;
    fill((m + t * 60) % 360, 70, 22 - t * 14 + 8, 1);
    noStroke();
    rect(0, y, width, 4);
  }
}

function desenharBloco(x, y, w, matiz, brilho) {
  noStroke();
  fill(matiz, 70, brilho, 1);
  rect(x, y, w, alturaBloco - 2, 4 * esc);
  fill(matiz, 40, min(100, brilho + 15), 1);
  rect(x, y, w, 5 * esc, 4 * esc); // brilho no topo
}

function desenharTorre() {
  for (let i = 0; i < torre.length; i++) {
    const b = torre[i];
    const y = yDoNivel(i);
    if (y > height || y < -alturaBloco) continue;
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = color(b.matiz, 80, 100).toString();
    desenharBloco(b.x, y, b.w, b.matiz, 90);
    drawingContext.shadowBlur = 0;
  }
  if (estado === "jogando") {
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = color(atual.matiz, 80, 100).toString();
    desenharBloco(atual.x, yDoNivel(torre.length), atual.w, atual.matiz, 100);
    drawingContext.shadowBlur = 0;
  }
}

function desenharCaidos() {
  for (let i = caidos.length - 1; i >= 0; i--) {
    const c = caidos[i];
    c.vy += 0.7 * esc;
    c.nivel -= c.vy / alturaBloco;
    c.rot += c.giro;
    const y = yDoNivel(c.nivel);
    if (y > height + 100) { caidos.splice(i, 1); continue; }
    push();
    translate(c.x + c.w / 2, y + alturaBloco / 2);
    rotate(c.rot);
    desenharBloco(-c.w / 2, -alturaBloco / 2, c.w, c.matiz, 80);
    pop();
  }
}

function desenharParticulas() {
  // anéis de encaixe perfeito
  for (let i = aneis.length - 1; i >= 0; i--) {
    const a = aneis[i];
    a.r += 5 * esc;
    a.a -= 0.04;
    if (a.a <= 0) { aneis.splice(i, 1); continue; }
    noFill();
    stroke(a.matiz, 40, 100, a.a);
    strokeWeight(3 * esc);
    ellipse(a.x, yDoNivel(a.nivel) + alturaBloco / 2, a.r * 2.4, a.r * 0.8);
  }
  // faíscas
  noStroke();
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.vx;
    p.yOff += p.vy;
    p.vy += 0.3 * esc;
    p.vida -= 0.02;
    if (p.vida <= 0) { particulas.splice(i, 1); continue; }
    fill(p.matiz, 50, 100, p.vida);
    circle(p.x, yDoNivel(p.nivel) + p.yOff, p.t * p.vida);
  }
}

function desenharInterface() {
  textAlign(CENTER, CENTER);
  noStroke();

  if (estado !== "menu") {
    // pontuação
    fill(0, 0, 100, 0.95);
    textSize(64 * esc);
    textStyle(BOLD);
    text(pontos, width / 2, height * 0.12);
    // combo
    if (combo > 1 && estado === "jogando") {
      fill(50, 80, 100, 1);
      textSize(22 * esc);
      text("PERFEITO x" + combo, width / 2, height * 0.12 + 50 * esc);
    }
  }

  if (estado === "menu") {
    fill(0, 0, 100);
    textSize(54 * esc);
    textStyle(BOLD);
    text("TORRE NEON", width / 2, height * 0.3);
    textSize(20 * esc);
    textStyle(NORMAL);
    fill(0, 0, 100, 0.8);
    text("Toque para soltar o bloco.\nEncaixe certinho para ganhar combos!", width / 2, height * 0.42);
    botaoPulsante("TOQUE PARA JOGAR", height * 0.6);
    fill(50, 60, 100);
    textSize(18 * esc);
    text("Recorde: " + recorde, width / 2, height * 0.72);
    fill(330, 50, 100);
    textSize(16 * esc);
    text("♥ Apoie o criador", width / 2, height * 0.88);
  }

  if (estado === "fim") {
    fill(0, 0, 0, 0.55);
    rect(0, 0, width, height);
    fill(0, 0, 100);
    textSize(46 * esc);
    textStyle(BOLD);
    text("FIM DE JOGO", width / 2, height * 0.3);
    textSize(24 * esc);
    textStyle(NORMAL);
    text("Pontos: " + pontos, width / 2, height * 0.4);
    fill(50, 70, 100);
    text(pontos >= recorde && pontos > 0 ? "NOVO RECORDE!" : "Recorde: " + recorde, width / 2, height * 0.47);
    for (const b of botoesFim()) botaoPulsante(b.txt, b.y, b.cor);
  }
}

// Botões da tela de fim de jogo
function botoesFim() {
  const lista = [];
  if (!usouContinuar && pontos >= CONFIG.pontosParaContinuar) {
    lista.push({ id: "continuar", txt: "▶ CONTINUAR (ver anúncio)", cor: 50 });
  }
  lista.push({ id: "novo", txt: "JOGAR DE NOVO", cor: 150 });
  lista.push({ id: "apoio", txt: "♥ APOIAR O CRIADOR", cor: 330 });
  lista.forEach((b, i) => (b.y = height * 0.58 + i * 70 * esc));
  return lista;
}

function botaoPulsante(txt, y, cor = 150) {
  const s = 1 + sin(frameCount * 0.08) * 0.05;
  push();
  translate(width / 2, y);
  scale(s);
  fill(cor, 70, 95);
  rectMode(CENTER);
  rect(0, 0, 300 * esc, 56 * esc, 28 * esc);
  fill(0, 0, 10);
  textSize(22 * esc);
  textStyle(BOLD);
  text(txt, 0, 2);
  pop();
}

// ---------- Entrada (mouse, toque e teclado) ----------
function acao() {
  if (millis() - ultimoToque < 180) return; // evita toque duplo
  ultimoToque = millis();
  if (estado === "jogando") soltarBloco();
  else if (estado === "fim") cliqueFim();
  else cliqueMenu();
}

function abrirApoio() {
  window.open(CONFIG.linkApoio, "_blank");
}

function cliqueMenu() {
  if (mouseY > height * 0.84 && mouseY < height * 0.92) abrirApoio();
  else novaPartida();
}

function cliqueFim() {
  for (const b of botoesFim()) {
    if (abs(mouseX - width / 2) < 150 * esc && abs(mouseY - b.y) < 28 * esc) {
      if (b.id === "continuar") {
        mostrarAnuncio("recompensado", () => {
          usouContinuar = true;
          estado = "jogando";
          criarBloco(); // retoma de onde parou
        });
      } else if (b.id === "novo") {
        if (partidas % CONFIG.anuncioACada === 0) mostrarAnuncio("intersticial", novaPartida);
        else novaPartida();
      } else if (b.id === "apoio") {
        abrirApoio();
      }
      return;
    }
  }
}

function mousePressed() { acao(); return false; }
function touchStarted() { acao(); return false; }
function keyPressed() {
  if (key === " " || keyCode === ENTER || keyCode === UP_ARROW) { acao(); return false; }
}
