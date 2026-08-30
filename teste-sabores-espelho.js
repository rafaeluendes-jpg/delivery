/* ==========================================================
   O QUE O JOIA DESLIGA TEM DE SUMIR DAQUI

   Ordem do Rafael em 30/08/2026, com todas as letras: "atualizou o
   sabor ali, atualiza no cardapio digital. Isso tem que ser lei."

   METADE JA ERA VERDADE. Esta pagina le `grupos_opcoes` e `opcoes`
   direto do banco a cada visita — sabor cadastrado no Joia aparece na
   proxima abertura do cliente, sem publicar nada aqui.

   A OUTRA METADE NAO ERA. Ela lia TUDO, sem olhar tres campos que o
   Joia grava:

     · `opcoes.ativo`         — sabor desligado continuava sendo
                                oferecido ao cliente na rua;
     · `grupos_opcoes.ativo`  — grupo desligado idem;
     · `grupos_opcoes.canais` — grupo marcado so para a frente de caixa
                                era perguntado aqui do mesmo jeito.

   O primeiro e o pior: o cliente pedia um sabor que a loja tinha
   acabado de desligar porque acabou.

   Estes testes rodam as funcoes de verdade do cardapio.js.

   Rodar:  node teste-sabores-espelho.js
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

let falhas = 0, testes = 0;
function t(nome, ok, det) {
  testes++;
  if (ok) console.log('   ok   ' + nome);
  else { falhas++; console.log('   FALHOU  ' + nome + (det !== undefined ? '  → ' + det : '')); }
}

/* os grupos como estão na loja, com um sabor desligado no meio */
const GRUPOS = [
  { id: 'grp_s1', nome: 'Sabores Gelatos 1 Sabor', ativo: true, canais: [], opcoes: [
      { nome: 'Leite Ninho Trufado Gelato', ativo: true },
      { nome: 'Maracuja Sorbet', ativo: false },      /* acabou hoje */
      { nome: 'Jolô Gelato' } ] },                     /* cadastro antigo, sem o campo */
  { id: 'grp_casc', nome: 'Cascão Adicional', ativo: true, canais: [], opcoes: [
      { nome: 'Cascão Tradicional', preco_adicional: 3, ativo: true } ] },
  { id: 'grp_pdv', nome: 'Aceita Ovomaltine', ativo: true, canais: ['pdv'], opcoes: [
      { nome: 'Ovomaltine', ativo: true } ] },
  { id: 'grp_off', nome: 'Grupo desligado', ativo: false, canais: [], opcoes: [
      { nome: 'Nunca aparece', ativo: true } ] },
  { id: 'grp_vazio', nome: 'Todas desligadas', ativo: true, canais: [], opcoes: [
      { nome: 'Sumiu', ativo: false } ] }
];

const F = new Function('D', `
  ${pegar('grupoValeAqui')}
  ${pegar('opcoesAtivas')}
  ${pegar('gruposDoProduto')}
  return {grupoValeAqui,opcoesAtivas,gruposDoProduto};
`)({ grupos: GRUPOS });

const produto = { nome: 'Gelato 500 Gramas', produto_grupos:
  GRUPOS.map(g => ({ grupo_id: g.id })) };

console.log('\n── 1. O sabor desligado no Joia some do cardápio\n');

const g1 = GRUPOS[0];
const nomes = F.opcoesAtivas(g1).map(o => o.nome);
t('o sabor desligado NÃO é oferecido ao cliente',
  nomes.indexOf('Maracuja Sorbet') < 0, nomes.join(', '));
t('os ligados continuam', nomes.indexOf('Leite Ninho Trufado Gelato') >= 0);
t('cadastro antigo, sem o campo, conta como ligado — nada some por omissão',
  nomes.indexOf('Jolô Gelato') >= 0, nomes.join(', '));
t('e sobram exatamente dois', nomes.length === 2, nomes.length);

console.log('\n── 2. O grupo também obedece\n');

const vistos = F.gruposDoProduto(produto).map(g => g.nome);
t('grupo desligado não aparece', vistos.indexOf('Grupo desligado') < 0, vistos.join(' | '));
t('grupo com TODAS as opções desligadas não aparece',
  vistos.indexOf('Todas desligadas') < 0, vistos.join(' | '));
t('grupo marcado só para a frente de caixa não é perguntado aqui',
  vistos.indexOf('Aceita Ovomaltine') < 0, vistos.join(' | '));
t('grupo sem canal escolhido vale em todos, inclusive aqui',
  vistos.indexOf('Sabores Gelatos 1 Sabor') >= 0, vistos.join(' | '));
t('e o cascão continua sendo oferecido',
  vistos.indexOf('Cascão Adicional') >= 0, vistos.join(' | '));
t('sobram os dois que a loja quer no cardápio', vistos.length === 2, vistos.join(' | '));

console.log('\n── 3. UMA porta só: desenhar e somar veem a mesma lista\n');

/* o defeito classico: filtrar ao desenhar e ler do cru ao somar. Com uma
   opcao desligada no MEIO, o indice 1 aponta para outra coisa. */
t('desenhar e somar usam a mesma função',
  (src.match(/opcoesAtivas\(g\)/g) || []).length >= 4,
  (src.match(/opcoesAtivas\(g\)/g) || []).length + ' usos');
t('não sobrou nenhuma leitura crua de g.opcoes',
  !/\(g\.opcoes\|\|\[\]\)/.test(src),
  (src.match(/\(g\.opcoes\|\|\[\]\)[^)]*/g) || []).join(' | '));
t('o índice 1 da lista filtrada é o Jolô, não o sabor desligado',
  F.opcoesAtivas(g1)[1].nome === 'Jolô Gelato', F.opcoesAtivas(g1)[1].nome);

console.log('\n── 4. O caminho continua automático\n');

t('a página lê os grupos e as opções direto do banco, a cada visita',
  /sb\.from\('grupos_opcoes'\)\.select\('\*,opcoes\(\*\)'\)/.test(src));
t('não há lista de sabores escrita à mão neste arquivo',
  !/Leite Ninho|Maracuja Sorbet|Jolô Gelato/.test(src));
/* de nada adianta corrigir o arquivo se o navegador do cliente continua
   servindo o velho do cache — foi o defeito da V195 no Joia */
const versao = +(((fs.readFileSync(__dirname + '/index.html', 'utf8')
  .match(/cardapio\.js\?v=(\d+)/)) || [0, 0])[1]);
t('a página pede a versão NOVA do arquivo, senão o cache serve a velha',
  versao >= 131, 'v=' + versao);

console.log('\n════════════════════════════════════════════════════');
console.log(falhas ? `${falhas} de ${testes} FALHARAM` : `${testes} de ${testes} testes passaram`);
console.log('════════════════════════════════════════════════════\n');
process.exit(falhas ? 1 : 0);
