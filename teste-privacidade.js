/* ==========================================================
   CARDAPIO — AVISO DE PRIVACIDADE (LGPD, 01/10/2026)

   O Rafael: "pode colocar o aviso de privacidade". Prende que o aviso
   existe, que aparece onde o cliente digita os dados (entrega, retirada
   e mesa) e no rodape, que diz quem e responsavel, o que e pedido, para
   que, quem ve e como pedir para apagar, e que o botao de apagar limpa
   mesmo o que fica no celular.

   Rodar:  node teste-privacidade.js
   ========================================================== */
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/cardapio.js', 'utf8');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
let falhas = 0, testes = 0;
function t(nome, ok) { testes++; if (ok) console.log('   ok   ' + nome); else { falhas++; console.log('   FALHOU  ' + nome); } }
function corpo(nome) {
  const i = src.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('não achei ' + nome);
  let j = src.indexOf('{', i), n = 0, f = j;
  while (f < src.length) { if (src[f] === '{') n++; else if (src[f] === '}') { n--; if (!n) { f++; break; } } f++; }
  return src.slice(i, f);
}
const av = corpo('avisoPrivacidade');
t('diz quem é o responsável e cita a lei', /responsável pelos dados/.test(av) && /13\.709\/2018/.test(av));
t('diz o que é pedido', /O que pedimos/.test(av) && /WhatsApp/.test(av) && /endereço/.test(av));
t('diz para que serve e que não é vendido', /Para que usamos/.test(av) && /Não vendemos/.test(av));
t('diz quem vê', /Quem vê/.test(av) && /entregador/.test(av));
t('diz onde fica e por quanto tempo', /Onde fica guardado/.test(av) && /lei/.test(av));
t('diz como pedir para ver, corrigir ou apagar', /ver, corrigir ou apagar/.test(av) && /c\.whatsapp/.test(av));
t('abre por cima, sem fechar o formulário', /ov\.id='ovPriv'/.test(av) && !/\bfechar\(\)/.test(av));
const ap = corpo('apagarMeusDados');
t('apagar limpa o cliente e grava no celular', /S\.cliente=\{\}/.test(ap) && /salvarLocal\(\)/.test(ap));
t('o formulário de entrega/retirada mostra a linha', /linhaPrivacidade\(\)/.test(corpo('irDados')));
t('a mesa mostra a linha', /linhaPrivacidade\(\)/.test(corpo('irComanda')));
t('o rodapé tem o link', /avisoPrivacidade\(\)/.test(corpo('rodape')));
t('o estilo do aviso existe', /\.privTx p\{/.test(html) && /\.privLk\{/.test(html));
console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + testes + ' falharam' : '✓ ' + testes + ' testes passaram') + '\n');
process.exit(falhas ? 1 : 0);
