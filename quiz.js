/* Quiz público. O advogado responde e vai direto para a conclusão.
   A leitura comercial não aparece aqui: fica no painel interno. */

import { PERGUNTAS, calcular } from './scoring.js';
import { db } from './db.js';
import { capturarOrigem, origemAtual } from './origem.js';

capturarOrigem();

let i = 0;
const respostas = [];

const $ = s => document.querySelector(s);
const palco = $('#palco');
const barra = $('#barra span');

const progresso = () => { barra.style.width = (i / PERGUNTAS.length) * 100 + '%'; };

function telaIntro() {
  barra.style.width = '0%';
  palco.innerHTML = `
    <div class="step intro">
      <span class="eyebrow">Diagnóstico do escritório</span>
      <h1>Seu escritório cresce ou só te consome?</h1>
      <p>Seis perguntas sobre como ele funciona hoje: faturamento, equipe, o que te trava e o quanto isso é urgente. Leva menos de um minuto e não pede cadastro para começar.</p>

      <div class="entrega">
        <span class="eyebrow">No final você recebe</span>
        <ol class="passos">
          <li><span>1</span><p><strong>Uma Sessão Estratégica.</strong> Trinta minutos com um especialista do nosso time para diagnosticar seu gargalo e desenhar o próximo passo, sem custo.</p></li>
          <li><span>2</span><p><strong>Materiais gratuitos.</strong> O mesmo conteúdo de gestão que usamos com quem já está dentro, liberado na hora.</p></li>
        </ol>
      </div>

      <button class="btn chanfro" id="start">Começar
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" aria-hidden="true">
          <path d="M1 5.5h12M9 1.5l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <p class="obs">Suas respostas ficam só com o nosso time comercial.</p>
    </div>`;
  document.querySelector('#start').onclick = () => { i = 0; telaPergunta(); };
}

function telaPergunta() {
  progresso();
  const q = PERGUNTAS[i];
  const compacto = q.opcoes.length > 8 ? ' compacto' : '';
  palco.innerHTML = `
    <div class="step">
      <span class="q-count">Pergunta <b>${i + 1}</b> de ${PERGUNTAS.length}</span>
      <h1 class="q-title">${q.titulo}</h1>
      ${q.ajuda ? `<p class="q-help">${q.ajuda}</p>` : '<div style="height:26px"></div>'}
      <div class="opts${compacto}" role="group" aria-label="Opções de resposta">
        ${q.opcoes.map((o, n) => `
          <button class="opt chanfro" data-n="${n}">
            <span class="key" aria-hidden="true">${n + 1}</span>
            <span>${o.txt}</span>
          </button>`).join('')}
      </div>
      <div class="nav-row">
        <button class="btn-back nav-voltar" id="voltar" ${i === 0 ? 'hidden' : ''}>← Voltar</button>
        ${q.opcoes.length <= 9 ? `<span class="hint">Use as teclas <b>1</b> a <b>${q.opcoes.length}</b></span>` : ''}
      </div>
    </div>`;

  palco.querySelectorAll('.opt').forEach(b => { b.onclick = () => escolher(Number(b.dataset.n), b); });
  const back = $('#voltar');
  if (back) back.onclick = () => { i--; respostas.pop(); telaPergunta(); };
  palco.querySelector('.opt').focus({ preventScroll: true });
}

function escolher(n, botao) {
  botao.classList.add('on');
  respostas[i] = PERGUNTAS[i].opcoes[n];
  setTimeout(() => {
    i++;
    i < PERGUNTAS.length ? telaPergunta() : finalizar();
  }, 200);
}

document.addEventListener('keydown', e => {
  if (document.querySelector('#start')) return;
  const opts = palco.querySelectorAll('.opt');
  if (!opts.length || opts.length > 9) return;
  const n = Number(e.key);
  if (n >= 1 && n <= opts.length) { e.preventDefault(); opts[n - 1].click(); }
});

async function finalizar() {
  barra.style.width = '100%';
  palco.innerHTML = '<p class="carregando">Processando suas respostas...</p>';

  const res = calcular(respostas);

  /* A resposta é gravada mesmo sem contato. Quem responde e não agenda
     aparece no painel como sem contato, o que mostra o abandono do funil. */
  const { data } = await db.criarResposta({
    score: res.total, score_base: res.base, ajuste: res.ajuste,
    classe: res.classe, degrau: res.degrau, degrau_estrutura: res.degrauEstrutura,
    qualidade: res.qualidade.nivel, area: res.area, perfil: res.perfil,
    pontos: res.pontos, detalhe: res.respostas,
    origem: origemAtual()
  });

  try {
    sessionStorage.setItem('adv_contexto_lead', JSON.stringify({
      resposta_id: data?.id || null,
      score: res.total, classe: res.classe,
      degrau: res.degrau, qualidade: res.qualidade.nivel
    }));
  } catch { /* sem storage: segue sem contexto */ }

  location.href = 'obrigado.html';
}

telaIntro();
