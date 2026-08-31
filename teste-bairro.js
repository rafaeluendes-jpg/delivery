/* ==========================================================
   O BAIRRO E OBRIGATORIO NO CARDAPIO DIGITAL

   A lista de regioes existe para calcular a TAXA e nao tem todos os
   bairros da cidade. Quem morava fora dela escolhia "Todos os Bairros",
   e o papel da entrega saia sem dizer onde fica a rua.

   Agora sao dois campos: a regiao (quanto custa) e o bairro escrito
   (onde e). Os dois obrigatorios, e o bairro viaja no pedido.

   Rodar:  node teste-bairro.js
   ========================================================== */
const fs = require('fs');
const fonte = fs.readFileSync(__dirname + '/cardapio.js', 'utf8');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const nu = fonte.replace(/\/\*[\s\S]*?\*\//g, '');

let falhas = 0, testes = 0;
function t(nome, ok, det) {
  testes++;
  if (ok) console.log('   ok   ' + nome);
  else { falhas++; console.log('   FALHOU  ' + nome + (det !== undefined ? '  → ' + det : '')); }
}
console.log('\n── Cardápio digital — o bairro da pessoa\n');

t('existe o campo de bairro, com estrela de obrigatório',
  /<label>Bairro \*<\/label>/.test(nu));
t('é um campo de escrever, não uma lista', /<input id="cBairro"/.test(nu));
t('ele guarda o que a pessoa já tinha escrito antes',
  /id="cBairro"[\s\S]{0,20}E\(cl\.bairro\|\|''\)/.test(nu));
t('e explica o que escrever, sem jargão', /do jeito que você fala/.test(fonte));

t('a lista de regiões deixou de se chamar "Bairro" também',
  !/Bairro \/ zona/.test(nu));
t('e agora diz o que ela é: a região que decide a taxa',
  /Região da entrega \(taxa\) \*/.test(nu));

t('sem escrever o bairro, o pedido não passa',
  /if\(S\.tipo==='entrega'&&!bairro\)\{alert\('Escreva o nome do seu bairro\.'\);return;\}/.test(nu));
t('e o aviso é em português comum, sem termo técnico',
  /Escreva o nome do seu bairro\./.test(fonte));
t('a região continua obrigatória', /!zid\)\{alert\('Escolha a região da entrega\.'\)/.test(nu));
t('espaço em branco não conta como bairro preenchido',
  /var bairro=String\(\(\$\('cBairro'\)\|\|\{\}\)\.value\|\|''\)\.trim\(\)/.test(nu));

t('o bairro entra nos dados do cliente', /bairro:bairro,/.test(nu));
t('e viaja junto no pedido, dentro do endereço',
  /endereco:\{rua:cl\.rua,numero:cl\.numero,bairro:cl\.bairro\|\|'',referencia:cl\.ref\}/.test(nu));
t('a tela de conferir mostra o bairro antes de enviar',
  /cl\.bairro\?E\(cl\.bairro\)\+' — ':''/.test(nu));
t('e mostra também a região, para a taxa não virar surpresa',
  /região: '\+E\(cl\.zona\)/.test(nu));

const v = (html.match(/cardapio\.js\?v=(\d+)/) || [])[1];
t('a versão do cardápio subiu, senão o celular serve a página velha',
  Number(v) >= 132, 'v=' + v);

console.log('\n' + (falhas ? '✗ ' + falhas + ' de ' + testes + ' falharam'
                           : '✓ ' + testes + ' testes passaram') + '\n');
process.exit(falhas ? 1 : 0);
