/* ==========================================================
   CARDAPIO — LOJA DESLIGADA NAO RECEBE PEDIDO

   O Rafael, em 01/09/2026: "esse botao nao pode ser so de enfeite. Se
   estiver desligado, o cardapio digital e o robo tem que parar de
   funcionar. E tem de falar que a loja esta desligada."

   O cardapio tinha dois furos:

   1. A CONFIGURACAO E LIDA UMA VEZ, quando a pagina abre. Quem deixou o
      cardapio aberto no celular e montou a sacola devagar continuava com
      a pagina de uma loja ja desligada, e o pedido entrava assim mesmo —
      caia no sino do PDV com a loja fechada.

   2. A LOJA GUARDADA NO CELULAR VOLTAVA COMO ABERTA. A regra do banco so
      entrega `cardapio_config` com `ativo=true` para quem nao esta
      logado, entao loja desligada chega SEM configuracao. A vitrine ja
      sabia disso; `abertoAgora` nao: com `c` vazio, `c.ativo` era
      `undefined` e a funcao caia no `return true` do fim.
   ========================================================== */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/cardapio.js', 'utf8');
let falhas = 0, testes = 0;
function t(nome, ok, det) {
  testes++;
  if (ok) console.log('   ok   ' + nome);
  else { falhas++; console.log('   FALHOU  ' + nome + (det !== undefined ? '  → ' + det : '')); }
}
function corpo(nome) {
  const marca = 'function ' + nome + '(';
  let i = src.indexOf(marca);
  if (i < 0) throw new Error('não achei ' + nome);
  if (src.slice(Math.max(0, i - 6), i) === 'async ') i -= 6;
  let j = src.indexOf('{', i), n = 0, f = j;
  while (f < src.length) {
    if (src[f] === '{') n++;
    else if (src[f] === '}') { n--; if (!n) { f++; break; } }
    f++;
  }
  return src.slice(i, f);
}
function carregar(nomes, amb) {
  const cod = nomes.map(corpo).join('\n');
  const feito = new Function('amb', 'with(amb){' + cod + '\nreturn {' + nomes.join(',') + '};}')(amb);
  Object.assign(amb, feito);
  return feito;
}

console.log('\n── Loja sem configuração é loja desligada\n');
{
  const amb = { D: { cfg: { L1: { ativo: true } } }, S: { loja: { id: 'L1' } } };
  const f = carregar(['lojaDesligada', 'cfgLoja', 'abertoAgora', 'abertoDaLoja'], amb);
  t('loja com configuração e sem horário fica aberta', f.abertoAgora() === true);
  amb.S.loja = { id: 'L2' };
  t('loja SEM configuração está desligada', f.lojaDesligada() === true);
  t('e por isso não aparece como aberta', f.abertoAgora() === false);
  amb.D.cfg.L2 = { ativo: false };
  t('ativo=false também é desligada', f.abertoAgora() === false);
  t('na vitrine, loja sem configuração não fica "aberto agora"',
    f.abertoDaLoja({ id: 'L3' }) === false);
}

console.log('\n── O envio confere a loja na hora, não no carregamento\n');
{
  let consultou = 0, resposta = { data: [{ sucursal_id: 'L1', ativo: true }] };
  const amb = {
    D: { cfg: { L1: { ativo: true } } }, S: { loja: { id: 'L1' } },
    sb: { from: () => ({ select: () => ({ eq: () => ({ limit: async () => { consultou++; return resposta; } }) }) }) }
  };
  const f = carregar(['lojaDesligada', 'lojaAindaAtende'], amb);
  const pronto = (async () => {
    t('com a loja ligada, o envio segue', (await f.lojaAindaAtende()) === true);
    t('e ele perguntou ao banco', consultou === 1, consultou);
    resposta = { data: [] };                     /* o banco esconde a loja desligada */
    t('com a loja desligada, o envio é recusado', (await f.lojaAindaAtende()) === false);
    t('e a configuração local é limpa', amb.D.cfg.L1 === undefined);
    resposta = { data: [{ sucursal_id: 'L1', ativo: false }] };
    t('ativo=false também recusa', (await f.lojaAindaAtende()) === false);
    resposta = { error: { message: 'sem rede' } };
    t('falha de rede NÃO vira recusa — o cliente não perde o pedido por causa da internet',
      (await f.lojaAindaAtende()) === true);
  })();
  pronto.then(() => {
    console.log('\n── O que o cliente lê\n');
    t('o cardápio diz "a loja está desligada"',
      /A loja está desligada agora/.test(src));
    t('e diz que a sacola fica guardada',
      /Sua sacola fica guardada aqui/.test(src));
    t('o texto de fora de horário continua existindo, separado',
      /A loja está fechada agora\. Você pode montar o pedido/.test(src));
    t('o envio do delivery passa pela conferência',
      /async function enviarPedido\(taxa,tot\)\{[\s\S]{0,220}lojaAindaAtende/.test(src));
    t('o envio da mesa também',
      /async function enviarPedidoMesa\(tot\)\{[\s\S]{0,400}lojaAindaAtende/.test(src));
    t('a loja guardada no celular só volta se ainda atender',
      /if\(l&&!lojaDesligada\(l\.id\)\)\{S\.loja=l/.test(src));
    console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + testes + ' falharam'
                               : '✓ ' + testes + ' testes passaram') + '\n');
    process.exit(falhas ? 1 : 0);
  });
}
