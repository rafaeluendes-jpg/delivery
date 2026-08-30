/* ==========================================================
   O CARDÁPIO DIGITAL SÓ MOSTRA O QUE ESTÁ MARCADO NELE

   O Rafael marcou a Taxa de Entrega apenas em Delivery, na Gestão de
   Cardápio, e ela apareceu aqui do mesmo jeito — o cliente podia
   colocar "Taxa de Entrega R$ 7,00" na sacola como se fosse um sabor.
   A taxa desta página nunca veio desse produto: sai da zona de
   entrega, em linha própria do total.

   A causa era `d.cardapio||d.online||d.delivery` em noCardapio().
   Delivery é o pedido lançado na frente de caixa em modo entrega;
   cardápio digital é esta página. São canais diferentes.

   Rodar:  node teste-canais.js
   ========================================================== */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/cardapio.js', 'utf8');
function pegar(nome) {
  const i = src.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('não achei ' + nome);
  let j = src.indexOf('{', i), n = 0, f = j;
  for (; f < src.length; f++) {
    if (src[f] === '{') n++;
    else if (src[f] === '}') { n--; if (!n) { f++; break; } }
  }
  return src.slice(i, f);
}
function motor(mesa) {
  return new Function('mesa', `
    var S={mesa:mesa};
    ${pegar('modoMesa')}
    ${pegar('noCardapio')}
    return noCardapio;
  `)(mesa);
}
const noCardapio = motor(null);
const noMesa = motor({ numero: 3 });

let falhas = 0, testes = 0;
function t(nome, ok, det) {
  testes++;
  if (ok) console.log('   ok   ' + nome);
  else { falhas++; console.log('   FALHOU  ' + nome + (det !== undefined ? '  → ' + det : '')); }
}

console.log('\n── Os 10 produtos ativos da Santa Fé do Sul (cadastro de 28/08/2026)\n');

const PROD = [
  { nome: 'Taxa de Entrega',             disponivel: { pdv:false, mesa:false, totem:false, cardapio:false, delivery:true } },
  { nome: 'Gelato 500 Gramas',           disponivel: { pdv:true,  mesa:false, totem:false, cardapio:true,  delivery:true } },
  { nome: 'Gelato 1 Kg',                 disponivel: { pdv:true,  mesa:false, totem:false, cardapio:true,  delivery:true } },
  { nome: 'Batido Di Gelato 300 Gramas', disponivel: { pdv:true,  mesa:false, totem:false, cardapio:true,  delivery:true } },
  { nome: 'Batido Di Gelato 500 Gramas', disponivel: { pdv:true,  mesa:false, totem:false, cardapio:true,  delivery:true } },
  { nome: 'Copo P',                      disponivel: { pdv:true,  mesa:false, totem:false, cardapio:false, delivery:false } },
  { nome: 'Cascão 1 Bola',               disponivel: { pdv:true,  mesa:false, totem:false, cardapio:false, delivery:false } },
  { nome: 'Brownie Gourmet',             disponivel: { pdv:true,  mesa:false, totem:false, cardapio:false, delivery:false } },
  { nome: 'Borda Nutella',               disponivel: { pdv:true } },
  { nome: 'Energético',                  disponivel: {} }
];
const passam = PROD.filter(noCardapio).map(p => p.nome);

t('a Taxa de Entrega sai do cardápio', passam.indexOf('Taxa de Entrega') < 0, passam.join(' | '));
t('os quatro itens do cardápio continuam lá',
  ['Gelato 500 Gramas','Gelato 1 Kg','Batido Di Gelato 300 Gramas','Batido Di Gelato 500 Gramas']
    .every(n => passam.indexOf(n) >= 0), passam.join(' | '));
t('copo, cascão e brownie continuam só no balcão',
  ['Copo P','Cascão 1 Bola','Brownie Gourmet'].every(n => passam.indexOf(n) < 0));
t('produto sem marcação nenhuma continua aparecendo',
  passam.indexOf('Energético') >= 0);
t('no total, cinco itens — os quatro do cardápio mais o sem marcação',
  passam.length === 5, passam.length + ': ' + passam.join(' | '));

console.log('\n── O que não podia mudar\n');

t('sem o campo disponivel, o produto aparece', noCardapio({ nome: 'x' }) === true);
t('sem marcação mas com disponivel_delivery false, não aparece',
  noCardapio({ nome: 'x', disponivel: {}, disponivel_delivery: false }) === false);
t('o campo antigo "online" continua valendo como cardápio',
  noCardapio({ disponivel: { online: true } }) === true);
t('mas "online" sozinho não é frente de caixa nem entrega',
  noCardapio({ disponivel: { pdv: true } }) === false);

console.log('\n── Na mesa (QR Code) a vitrine continua sendo a do balcão\n');

t('Copo P aparece na mesa', noMesa(PROD.find(p => p.nome === 'Copo P')) === true);
t('Cascão aparece na mesa', noMesa(PROD.find(p => p.nome === 'Cascão 1 Bola')) === true);
t('a Taxa de Entrega não aparece na mesa',
  noMesa(PROD.find(p => p.nome === 'Taxa de Entrega')) === false);
t('o pote, marcado no cardápio, não some da mesa por ser de entrega',
  noMesa({ disponivel: { pdv: true, cardapio: true, delivery: true } }) === true);

console.log('\n── A linha que causava tudo saiu\n');

const nu = src.replace(/\/\*[\s\S]*?\*\//g, '');
t('noCardapio não olha mais para delivery',
  !/return !!\(d\.cardapio\|\|d\.online\|\|d\.delivery\)/.test(nu));
t('e a regra da mesa ficou intacta', /if\(modoMesa\(\)\)return !!\(d\.mesa\|\|d\.pdv\)/.test(nu));
t('a página carrega a versão nova do arquivo',
  /cardapio\.js\?v=131/.test(fs.readFileSync(__dirname + '/index.html', 'utf8')));

console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + testes + ' falharam'
                           : '✓ ' + testes + ' testes passaram') + '\n');
process.exit(falhas ? 1 : 0);
