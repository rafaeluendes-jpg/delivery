/* ==========================================================
   NEXOR — Cardápio Digital
   ========================================================== */
var SB_URL='https://cevghkndzpzvnzwifhnm.supabase.co';
var SB_KEY='sb_publishable_tH04wQWnUjOUQWePZ0Bshw_RirDPUDY';
var sb=window.supabase.createClient(SB_URL,SB_KEY);

var D={lojas:[],cats:[],prods:[],grupos:[],opcoes:[],areas:[],formas:[],cfg:{}};
var S={loja:null,cat:null,sacola:[],tela:'lojas',prod:null,cliente:{},tipo:'entrega',
       mesa:null,comanda:''};

/* O QR da mesa aponta para esta mesma pagina com ?mesa=3&loja=xxx.
   E a mesma vitrine, mas em outro modo: quem esta sentado na mesa nao
   escolhe entrega, nao digita endereco e nao paga aqui — a conta e da
   mesa e fecha no caixa. */
(function lerMesaDoQR(){
  try{
    var p=new URLSearchParams(location.search);
    var m=p.get('mesa');
    if(m){S.mesa=String(m);S.tipo='mesa';}
    var l=p.get('loja')||p.get('l');
    if(l)S._lojaQR=String(l).trim();
  }catch(e){}
})();
function modoMesa(){return !!S.mesa;}

function $(id){return document.getElementById(id)}
function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){return (Number(v)||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function salvarLocal(){try{localStorage.setItem('jolo_card',JSON.stringify({
  loja:S.loja?S.loja.id:null,sacola:S.sacola,cliente:S.cliente}))}catch(e){}}
function lerLocal(){try{return JSON.parse(localStorage.getItem('jolo_card')||'{}')}catch(e){return {}}}

/* ---------- carga ---------- */
async function carregar(){
  try{
    var r=await Promise.all([
      sb.from('sucursais').select('*').eq('ativa',true),
      sb.from('categorias').select('*').order('ordem'),
      sb.from('produtos').select('*,produto_grupos(grupo_id)').order('ordem'),
      sb.from('grupos_opcoes').select('*,opcoes(*)').order('ordem'),
      sb.from('areas_entrega').select('*,areas_zonas(*)'),
      sb.from('formas_pagamento').select('*'),
      sb.from('cardapio_config').select('*')
    ]);
    D.lojas=r[0].data||[]; D.cats=r[1].data||[]; D.prods=r[2].data||[];
    D.grupos=r[3].data||[]; D.areas=r[4].data||[]; D.formas=r[5].data||[];
    (r[6].data||[]).forEach(function(c){D.cfg[c.sucursal_id||'geral']=c});
    var lc=lerLocal();
    if(lc.sacola)S.sacola=lc.sacola;
    if(lc.cliente)S.cliente=lc.cliente;
    /* ==========================================================
       UM LINK POR LOJA

       ?loja= aceita o codigo interno, mas ninguem divulga um codigo
       desses num cartao. Aceita tambem o apelido e o proprio nome, sem
       acento e sem espaco: ?loja=santafe abre direto Santa Fe do Sul,
       ?loja=jales abre Jales. Quem entra por esse link nao passa pela
       tela de escolher loja — mas continua podendo trocar, pelo seletor
       do topo, se pedir de outra unidade.
       ========================================================== */
    if(S._lojaQR){var lq=acharLojaPorApelido(S._lojaQR);
      if(lq){S.loja=lq;S.tela='menu';aplicarMarca();}}
    if(!S.loja&&modoMesa()&&D.lojas.length===1){
      S.loja=D.lojas[0];S.tela='menu';aplicarMarca();}
    if(!S.loja&&lc.loja){var l=D.lojas.find(function(x){return x.id===lc.loja});
      if(l){S.loja=l;S.tela='menu';aplicarMarca();}}
    render();
  }catch(e){
    $('app').innerHTML='<div class="carregando">Não consegui carregar o cardápio agora.<br>'+
      '<button class="btnL" style="max-width:220px;margin:16px auto" onclick="location.reload()">Tentar de novo</button></div>';
  }
}
/* ==========================================================
   A VITRINE PRECISA DE UMA CARA, MESMO SEM LOJA ESCOLHIDA

   Na tela de escolher a loja ainda nao ha loja, entao cfgLoja() devolvia
   {} e a capa e a logo caiam nas imagens de exemplo do repositorio —
   img/capa.jpg. Quem tinha acabado de subir a propria capa no sistema
   via outra foto na abertura e achava, com razao, que nao tinha salvo.

   Sem loja escolhida vale a marca da rede: a configuracao da matriz, ou,
   na falta dela, a primeira que tiver imagem.
   ========================================================== */
function chaveLoja(t){
  return String(t||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]/g,'');
}
function acharLojaPorApelido(t){
  var k=chaveLoja(t);
  var l=D.lojas||[];
  return l.find(function(x){return x.id===t})
      || l.find(function(x){return x.ref_local===t})
      || l.find(function(x){return chaveLoja(x.apelido)===k&&k})
      || l.find(function(x){return chaveLoja(x.nome)===k&&k})
      || l.find(function(x){return k&&chaveLoja(x.nome).indexOf(k)>=0})
      || null;
}
function cfgRede(){
  var m=(D.lojas||[]).find(function(l){return l.matriz});
  if(m&&D.cfg[m.id])return D.cfg[m.id];
  var k=Object.keys(D.cfg||{}).find(function(id){
    var c=D.cfg[id]; return c&&(c.capa||c.logo||c.titulo);
  });
  return (k&&D.cfg[k])||D.cfg.geral||{};
}
function cfgLoja(){
  if(!S.loja)return cfgRede();
  return D.cfg[S.loja.id]||D.cfg.geral||{};
}
function nomeLoja(){
  var c=cfgLoja();
  if(!S.loja)return c.titulo||'Cardápio Digital';
  return c.titulo||S.loja.nome;
}
function sloganLoja(){ return cfgLoja().slogan||''; }
function logoLoja(){ return cfgLoja().logo||'img/logo.jpg'; }
function capaLoja(){ return cfgLoja().capa||'img/capa.jpg'; }
/* na lista, cada cartao mostra o horario DA LOJA dele, nao o da aberta */
function abertoDaLoja(l){
  var c=D.cfg[l.id]||{};
  if(c.ativo===false)return false;
  var h=c.horarios;
  if(!h||!h.length)return true;
  var ag=new Date(), d=ag.getDay(), m=ag.getHours()*60+ag.getMinutes();
  return h.some(function(x){
    if(Number(x.dia)!==d||x.fechado)return false;
    var a=(x.abre||'00:00').split(':'), f=(x.fecha||'23:59').split(':');
    var ini=+a[0]*60+ +a[1], fim=+f[0]*60+ +f[1];
    if(fim<ini)fim+=1440;
    return m>=ini&&m<=fim;
  });
}
function abertoAgora(){
  var c=cfgLoja();
  if(c.ativo===false)return false;
  var h=c.horarios;
  if(!h||!h.length)return true;
  var ag=new Date(), d=ag.getDay(), m=ag.getHours()*60+ag.getMinutes();
  return h.some(function(x){
    if(Number(x.dia)!==d||x.fechado)return false;
    var a=(x.abre||'00:00').split(':'), f=(x.fecha||'23:59').split(':');
    var ini=+a[0]*60+ +a[1], fim=+f[0]*60+ +f[1];
    if(fim<ini)fim+=1440;
    return m>=ini&&m<=fim;
  });
}
/* ---------- telas ---------- */
function render(){
  if(S.tela==='lojas')return telaLojas();
  telaMenu();
  pintarFaixaMesa();
}
/* quem esta na mesa precisa ver que o pedido vai para AQUELA mesa */
function pintarFaixaMesa(){
  var v=document.getElementById('faixaMesa');
  if(v)v.remove();
  if(!modoMesa())return;
  var d=document.createElement('div');
  d.id='faixaMesa';
  d.style.cssText='position:sticky;top:66px;z-index:45;background:var(--verde);color:#fff;'+
   'padding:9px 24px;font-size:14px;font-weight:600;text-align:center;letter-spacing:.02em';
  d.textContent='MESA '+S.mesa+(S.comanda?' — comanda de '+S.comanda:'')+
   ' · o pagamento é no caixa';
  var app=document.getElementById('app');
  if(app&&app.firstChild)app.insertBefore(d,app.firstChild.nextSibling);
  else if(app)app.appendChild(d);
}
/* ==========================================================
   LOJA COM O CARDAPIO DESLIGADO NAO APARECE PARA O CLIENTE

   Antes, a unidade com "Cardapio no ar" desmarcado continuava na lista,
   so que com a etiqueta "fechado". Nao e a mesma coisa: a matriz nao
   vende para o consumidor e nao deve nem aparecer. Fechado e a loja que
   existe e esta fora do horario; desligado e a que nao atende por aqui.
   ========================================================== */
/* ==========================================================
   O PEDIDO PRECISA CAIR NA EMPRESA CERTA

   O codigo da empresa estava fixo no arquivo — 'ffe70bae-...', de outra
   rede. O pedido entrava numa empresa que nao e a dona da loja e nunca
   aparecia no PDV: o sino nao tocava e o cliente ficava esperando.
   Agora sai da propria loja escolhida, que ja vem do banco com o
   loja_id dela.
   ========================================================== */
function lojaDaEmpresa(){
  return (S.loja&&S.loja.loja_id)||
         ((D.lojas||[])[0]||{}).loja_id||null;
}
function lojasNaVitrine(){
  /* A regra do banco so devolve configuracao com ativo=true para quem nao
     esta logado. Entao, aqui fora, loja desligada chega SEM configuracao —
     e nao adianta olhar c.ativo, porque `c` nem existe. Aparece quem tem
     configuracao visivel; sem ela, a loja nao atende por aqui. */
  return (D.lojas||[]).filter(function(l){ return !!D.cfg[l.id]; });
}
function telaLojas(){
  var lojas=lojasNaVitrine();
  $('app').innerHTML=topo()+capa()+
   '<div class="telaLojas">'+
    '<div class="tl-h"><h2>Onde você quer pedir?</h2>'+
    '<p>Escolha a loja mais perto de você</p></div>'+
    (lojas.length?'<div class="lojasG">'+lojas.map(function(l){
      var c=D.cfg[l.id]||{};
      var ab=abertoDaLoja(l);
      return '<button class="lojaC" onclick="escolherLoja(\''+l.id+'\')">'+
       '<div class="lojaIc">'+IC.loja+'</div>'+
       '<b>'+E(l.nome)+'</b>'+
       '<span class="end">'+E(l.cidade||'')+(l.uf?' · '+E(l.uf):'')+'</span>'+
       '<div class="rod"><span class="pill'+(ab?'':' off')+'">'+(ab?'aberto agora':'fechado')+'</span>'+
       (c.tempo_entrega?'<span style="font-size:12.5px;color:var(--ink-3)">'+E(c.tempo_entrega)+'</span>':'')+
       '<span class="seta">→</span></div>'+
      '</button>';}).join('')+'</div>'
     :'<div class="vazio">'+IC.loja+'<br>Nenhuma loja disponível no momento.</div>')+
   '</div>'+rodape();
}
var IC={
 loja:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="24" height="24"><path d="M3 9l1.5-5h15L21 9M3 9h18M3 9v11h18V9M9 20v-6h6v6"/></svg>',
 gelato:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 10a4 4 0 0 1 8 0M7.5 10h9L12 22 7.5 10z"/><path d="M8.6 13.5h6.8M9.6 16.5h4.8"/></svg>',
 sacola:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="18" height="18"><path d="M6 7h12l-1 13H7L6 7zM9 7V5a3 3 0 0 1 6 0v2"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="38" height="38"><path d="M4 12.5l5.5 5.5L20 7"/></svg>'
};
function topo(){
  var qt=S.sacola.reduce(function(a,i){return a+i.qtd},0);
  var vl=S.sacola.reduce(function(a,i){return a+i.total},0);
  var ab=S.loja?abertoAgora():true;
  var c=cfgLoja();
  return '<div class="topo"><div class="topoIn">'+
   '<div class="marca">'+(logoLoja()?'<img src="'+logoLoja()+'" alt="">':'')+
    '<div><b>'+E(nomeLoja())+'</b>'+
    (sloganLoja()?'<span>'+E(sloganLoja())+'</span>':'')+'</div></div>'+
   (S.loja?'<div class="statusP"><span class="pt'+(ab?'':' off')+'"></span>'+
     (ab?'Aberto':'Fechado')+(c.tempo_entrega?' · '+E(c.tempo_entrega):'')+'</div>':'')+
   '<div style="flex:1"></div>'+
   (S.loja?'<button class="lojaSel" onclick="S.tela=\'lojas\';render()">'+
     E(S.loja.apelido||S.loja.nome)+' <span style="opacity:.5">▾</span></button>':'')+
   (qt?'<button class="btSac" onclick="abrirSacola()">'+IC.sacola+
     '<span class="n">'+qt+'</span> R$ '+money(vl)+'</button>':'')+
  '</div></div>';
}
function capa(){
  var c=cfgLoja();
  /* ==========================================================
     A LOGO JA ESTA NO TOPO

     O bloco branco com a logo no meio da capa tapava justamente o
     produto da foto, e repetia a marca que ja aparece na barra de cima.
     Ficou so o nome e a frase, sobre a foto.
     ========================================================== */
  return '<div class="hero"><img src="'+capaLoja()+'" alt="">'+
   '<div class="heroIn">'+
   '<h1>'+E(nomeLoja())+'</h1><p>'+E(sloganLoja())+'</p>'+
   (S.loja?'<div class="heroTags">'+
     (c.tempo_entrega?'<span class="heroTag">entrega em '+E(c.tempo_entrega)+'</span>':'')+
     (Number(c.pedido_minimo)?'<span class="heroTag">mínimo R$ '+money(c.pedido_minimo)+'</span>':'')+
     (c.aceita_retirada!==false?'<span class="heroTag">retirada na loja</span>':'')+
    '</div>':'')+
   '</div></div>';
}
function rodape(){
  var c=cfgLoja();
  return '<div class="rodape">'+(logoLoja()?'<img src="'+logoLoja()+'" alt="">':'')+
   '<b>'+E(nomeLoja())+'</b>'+
   E(sloganLoja())+'<br>'+
   (c.endereco?E(c.endereco)+'<br>':'')+
   (c.instagram?E(c.instagram)+'<br>':'')+
   (S.loja?E(S.loja.nome)+(S.loja.cidade?' · '+E(S.loja.cidade):'')+'<br>':'')+
   (c.whatsapp?'WhatsApp '+E(c.whatsapp)+'<br>':'')+
   '<br><span style="opacity:.55;font-size:11px">pedidos por Joia</span></div>';
}
function aplicarMarca(){
  var c=cfgLoja();
  var r=document.documentElement.style;
  if(c.cor_principal){
    r.setProperty('--verde',c.cor_principal);
    r.setProperty('--verde-c',c.cor_principal);
    r.setProperty('--verde-e',escurecer(c.cor_principal,22));
    r.setProperty('--verde-cl',clarear(c.cor_principal,22));
  }
  if(c.cor_fundo){
    r.setProperty('--creme',c.cor_fundo);
    r.setProperty('--creme-2',escurecer(c.cor_fundo,5));
  }
  var t=c.titulo||(S.loja?S.loja.nome:'')||'Cardápio';
  document.title=t+' — Delivery';
}
function hex(c){var m=String(c||'').replace('#','');
  if(m.length===3)m=m[0]+m[0]+m[1]+m[1]+m[2]+m[2];
  return [parseInt(m.slice(0,2),16),parseInt(m.slice(2,4),16),parseInt(m.slice(4,6),16)];}
function escurecer(c,p){var v=hex(c);
  return '#'+v.map(function(x){return Math.max(0,Math.round(x*(1-p/100))).toString(16).padStart(2,'0')}).join('');}
function clarear(c,p){var v=hex(c);
  return '#'+v.map(function(x){return Math.min(255,Math.round(x+(255-x)*p/100)).toString(16).padStart(2,'0')}).join('');}
function escolherLoja(id){
  S.loja=D.lojas.find(function(x){return x.id===id});
  S.tela='menu';S.cat=null;
  aplicarMarca();
  salvarLocal();
  window.scrollTo(0,0);
  render();
  evento('ViewContent',{content_name:S.loja.nome});
}
/* O cardapio mostrava TODO produto ativo. O campo "Disponivel em" da
   Gestao de Cardapio era gravado e ignorado aqui — item marcado so para
   frente de caixa aparecia para o cliente do mesmo jeito.
   Agora o cardapio obedece a marcacao, e ela e o unico lugar de decidir.
   Produto sem nenhuma marcacao continua aparecendo: quem nunca preencheu
   isso nao pode ficar com o cardapio vazio de uma hora para outra. */
function noCardapio(p){
  var d=p.disponivel||{};
  var algum=d.pdv||d.delivery||d.online||d.cardapio||d.mesa;
  if(!algum)return p.disponivel_delivery!==false;   /* sem marcacao: aparece */
  /* Na mesa a vitrine e a do balcao, nao a de entrega. Quem esta sentado
     na loja compra o que se vende ali — inclusive o que nunca sai para
     delivery. Por isso o modo mesa olha "Mesa" e "Frente de caixa". */
  if(modoMesa())return !!(d.mesa||d.pdv);
  /* ==========================================================
     "DELIVERY" NAO E "CARDAPIO DIGITAL"

     Aqui estava `d.cardapio||d.online||d.delivery`. O `delivery` fazia
     um produto marcado SO em Delivery aparecer nesta pagina — foi assim
     que a Taxa de Entrega, que e um produto do cadastro, apareceu no
     cardapio para o cliente escolher como se fosse um sabor. A taxa
     desta pagina nunca veio dali: ela sai da zona de entrega, numa
     linha propria do total.

     Delivery e o pedido que a loja lanca na frente de caixa em modo
     entrega. Cardapio digital e esta pagina. Cada chave do "Disponivel
     em" vale por ela mesma.

     `online` fica: e o nome antigo do proprio campo `cardapio`.
     ========================================================== */
  return !!(d.cardapio||d.online);
}
function prodsDaLoja(){
  return D.prods.filter(function(p){
    return p.ativo!==false && noCardapio(p);
  });
}
function formasAceitas(){
  var c=cfgLoja();
  var f=c.formas_aceitas;
  if(f&&f.length)return f;
  return ['Dinheiro','Pix','Cartão de débito','Cartão de crédito'];
}
function telaMenu(){
  var c=cfgLoja(), ab=abertoAgora();
  var cats=D.cats.filter(function(x){
    return prodsDaLoja().some(function(p){return p.categoria_id===x.id})});
  var lista=prodsDaLoja().filter(function(p){return !S.cat||p.categoria_id===S.cat});
  var porCat={};
  lista.forEach(function(p){
    var k=p.categoria_id||'_';
    porCat[k]=porCat[k]||[];porCat[k].push(p);
  });
  $('app').innerHTML=topo()+capa()+
   (!ab||c.aviso?'<div class="centro" style="padding-top:22px">'+
     (!ab?'<div class="aviso">A loja está fechada agora. Você pode montar o pedido e enviar quando abrirmos.</div>':'')+
     (c.aviso?'<div class="aviso">'+E(c.aviso)+'</div>':'')+'</div>':'')+
   '<div class="catBar"><div class="catIn">'+
    '<button class="catB'+(!S.cat?' on':'')+'" onclick="S.cat=null;render()">Tudo</button>'+
    cats.map(function(x){
      return '<button class="catB'+(S.cat===x.id?' on':'')+'" onclick="S.cat=\''+x.id+'\';render()">'+
      E(x.nome)+'</button>';}).join('')+
   '</div></div>'+
   /* ==========================================================
      A ORDEM DAS SECOES E A DO CADASTRO

      As secoes saiam na ordem em que os produtos apareciam na lista —
      ou seja, na ordem dos PRODUTOS, nao das CATEGORIAS. Por isso as
      bebidas abriam o cardapio: o primeiro produto da lista era uma
      agua. A ordem cadastrada em Gestao de Cardapio ja existia e era
      ignorada aqui.
      ========================================================== */
   (Object.keys(porCat).length?Object.keys(porCat).sort(function(a2,b2){
     var ia=D.cats.findIndex(function(x){return x.id===a2});
     var ib=D.cats.findIndex(function(x){return x.id===b2});
     if(ia<0)ia=999; if(ib<0)ib=999;      /* sem categoria vai para o fim */
     return ia-ib;
   }).map(function(k){
     var cat=D.cats.find(function(x){return x.id===k})||{nome:'Outros'};
     return '<div class="secao"><div class="secH"><h3>'+E(cat.nome)+'</h3>'+
      (cat.descricao?'<span>'+E(cat.descricao)+'</span>':'')+'</div>'+
      '<div class="grade">'+porCat[k].map(cardProduto).join('')+'</div></div>';
   }).join('')
    :'<div class="vazio">'+IC.gelato+'<br>Nenhum produto nesta categoria.</div>')+
   '<div style="height:40px"></div>'+rodape();
}
function fotoDe(p){ return p.imagem||p.imagem_url||''; }
function cardProduto(p){
  var f=fotoDe(p);
  return '<button class="card" onclick="abrirProduto(\''+p.id+'\')">'+
   '<div class="cardF">'+(f?'<img src="'+f+'" alt="'+E(p.nome)+'" loading="lazy">'
     :'<div class="semF">'+IC.gelato+'</div>')+'</div>'+
   '<div class="cardB"><b>'+E(p.nome)+'</b>'+
    (p.descricao?'<p>'+E(p.descricao)+'</p>':'<p></p>')+
    '<div class="cardR"><span class="preco">R$ '+money(p.preco)+'</span>'+
    '<span class="addB">+</span></div></div>'+
  '</button>';
}

/* ---------- produto ---------- */
var _esc={};
function abrirProduto(id){
  S.prod=D.prods.find(function(x){return x.id===id});
  _esc={};
  desenhaProduto();
  evento('ViewContent',{content_name:S.prod.nome,value:S.prod.preco,currency:'BRL'});
}
/* ==========================================================
   O QUE O JOIA DESLIGA TEM DE SUMIR DAQUI TAMBEM

   Esta pagina le `grupos_opcoes` e `opcoes` direto do banco, a cada
   visita: sabor cadastrado no Joia ja aparece na proxima abertura, sem
   publicar nada aqui. So que ela lia TUDO, sem olhar tres campos que o
   Joia grava:

   1. `opcoes.ativo` — a loja passou a desligar um sabor em vez de
      apagar. Desligado sumia da frente de caixa e continuava sendo
      oferecido ao cliente na rua. O cliente pedia, e no balcao nao
      tinha.
   2. `grupos_opcoes.ativo` — mesma coisa, para o grupo inteiro.
   3. `grupos_opcoes.canais` — o dono marca em qual canal a pergunta
      aparece. Um grupo marcado so para a frente de caixa era
      perguntado aqui do mesmo jeito. E o mesmo defeito que o
      `teste-canais.js` ja registrou para os PRODUTOS; nos grupos nunca
      foi feito.

   `opcoesAtivas` existe para ser a UNICA porta: quem desenha e quem
   soma o preco tem de ver a mesma lista, senao o indice de cada opcao
   aponta para outra assim que houver uma desligada no meio.
   ========================================================== */
function grupoValeAqui(g){
  if(!g||g.ativo===false)return false;
  var c=g.canais||[];
  if(!c.length)return true;              /* sem escolha = todos os canais */
  return c.indexOf('cardapio')>=0;
}
function opcoesAtivas(g){
  return ((g&&g.opcoes)||[]).filter(function(o){return o&&o.ativo!==false});
}
function gruposDoProduto(p){
  var ids=(p.produto_grupos||[]).map(function(x){return x.grupo_id});
  return D.grupos.filter(function(g){
    if(ids.indexOf(g.id)<0)return false;
    if(!grupoValeAqui(g))return false;
    /* grupo sem nenhuma opcao ligada nao tem o que perguntar */
    return opcoesAtivas(g).length>0;
  });
}
function desenhaProduto(){
  var p=S.prod;
  var gs=gruposDoProduto(p);
  var total=Number(p.preco)||0;
  gs.forEach(function(g){
    (_esc[g.id]||[]).forEach(function(k){
      var o=opcoesAtivas(g)[k];
      if(o)total+=precoOp(o);
    });
  });
  /* ==========================================================
     O MINIMO TAMBEM VALE

     Antes so o `forcado` barrava, e so quando nada era escolhido. Um
     grupo de 2 sabores com minimo 2 deixava passar com um sabor so —
     e o pedido chegava na loja incompleto, sem ninguem notar.

     Agora barra quem escolheu menos que o minimo, dizendo o que falta.
     ========================================================== */
  var _oQueFalta='';
  var falta=gs.some(function(g){
    var n=(_esc[g.id]||[]).length;
    var min=Number(g.minimo!=null?g.minimo:g.min)||0;
    var recusou=_esc['nao_'+g.id]===true;
    if(g.forcado && n===0 && !recusou){ _oQueFalta='Escolha: '+g.nome; return true; }
    if(min>0 && n>0 && n<min){
      _oQueFalta='Falta escolher '+(min-n)+' em '+g.nome; return true; }
    if(min>0 && n===0 && !recusou && g.forcado){
      _oQueFalta='Escolha '+min+' em '+g.nome; return true; }
    return false;
  });
  /* ==========================================================
     ITEM 12 — A CAUSA DO SALTO PARA O TOPO

     Nao era `scrollTo`, nem `<a href="#">`, nem submit de formulario,
     nem troca de rota. Era isto:

         ov.innerHTML = '...' ;

     Cada toque num sabor redesenhava o painel INTEIRO. `innerHTML`
     destroi todos os elementos filhos e cria outros novos. O elemento
     que guardava a rolagem — a `.pnlB` — deixava de existir, e a nova
     nascia com scrollTop zero. O navegador nao "voltou ao topo": o
     lugar onde a pessoa estava foi apagado.

     Por isso o remendo de guardar e devolver a posicao so funcionava as
     vezes: entre destruir e recriar, o navegador ja tinha recalculado o
     tamanho da caixa, e devolver 1800px numa caixa que ainda nao tem
     1800px de conteudo simplesmente nao pega.

     A correcao e nao destruir. O painel e montado uma vez; a cada
     escolha atualizamos SO o que mudou: a marca da opcao, o contador do
     grupo e o botao do rodape. A `.pnlB` nunca e recriada, entao a
     rolagem nem chega a se perder — nao ha o que restaurar.
     ========================================================== */
  var ov=$('ov')||document.createElement('div');
  ov.id='ov';ov.className='ov';
  ov.innerHTML='<div class="pnl g">'+
   '<div class="pnlH"><b>'+E(p.nome)+'</b>'+
    '<button class="fechar" onclick="fechar()">×</button></div>'+
   '<div class="pnlB">'+
    (fotoDe(p)?'<img src="'+fotoDe(p)+'" class="fotoP" alt="">':'')+
    (p.descricao?'<p style="margin:0 0 18px;color:var(--ink-2);font-size:14px">'+E(p.descricao)+'</p>':'')+
    gs.map(function(g,gi){
      var sel=_esc[g.id]||[];
      /* ==========================================================
         O NOME DA COLUNA E `maximo`, NAO `max`

         O banco guarda `minimo` e `maximo`. Este arquivo procurava
         `g.max`, que nao existe — entao `Number(g.max)||1` dava 1
         SEMPRE. O grupo de 2 sabores virava radio de 1 sabor, e o de
         3 tambem. O cliente escolhia um sabor e o segundo trocava o
         primeiro. A configuracao estava certa; a leitura e que errava.

         Le os dois nomes: `maximo` do banco e `max` de quem ja tiver
         gravado assim.
         ========================================================== */
      var max=Number(g.maximo!=null?g.maximo:g.max)||1;
      var min=Number(g.minimo!=null?g.minimo:g.min)||0;
      var multi=max>1;
      return '<div class="gr" data-g="'+E(g.id)+'"><div class="grH"><b>'+E(g.nome)+'</b>'+
       (g.forcado?'<span class="ob">escolha</span>':'<span>opcional</span>')+
       (multi?'<span>'+(min>1?'escolha '+min+' a '+max:'até '+max)+'</span>':'')+
       (multi?'<span class="cont">'+sel.length+'/'+max+'</span>':'')+'</div>'+
       (g.forcado?'<label class="op naoq'+(_esc['nao_'+g.id]?' on':'')+'" onclick="naoQuero(\''+g.id+'\')">'+
         '<input type="radio" name="g'+gi+'"'+(_esc['nao_'+g.id]?' checked':'')+'>'+
         '<span class="nm">Não quero</span></label>':'')+
       /* ==========================================================
          GRUPO DE VARIOS E QUANTIDADE, NAO CAIXINHA DE MARCAR

          O grupo "Cascao Adicional" vai de 1 a 50: e quantidade, nao
          escolha. Com caixinha de marcar so dava para levar UM cascao.
          E em "2 sabores" ninguem conseguia pedir dois potes do mesmo
          sabor, que e pedido comum em gelato.

          Agora todo grupo com maximo maior que 1 mostra − e + por
          opcao. A soma de todas as opcoes respeita o maximo do grupo,
          e o + fica desligado quando o grupo enche.
          ========================================================== */
       opcoesAtivas(g).map(function(o,oi){
         var q=sel.filter(function(k){return k===oi}).length;
         if(!multi){
           var on=q>0;
           return '<label class="op'+(on?' on':'')+'" onclick="escolher(\''+g.id+'\','+oi+','+max+')">'+
            '<input type="radio" name="g'+gi+'"'+(on?' checked':'')+'>'+
            '<span class="nm">'+E(o.nome)+'</span>'+
            (precoOp(o)?'<span class="pr">+ R$ '+money(precoOp(o))+'</span>':'')+'</label>';
         }
         var cheio=sel.length>=max;
         return '<div class="op qt'+(q?' on':'')+'">'+
          '<span class="nm">'+E(o.nome)+'</span>'+
          (precoOp(o)?'<span class="pr">+ R$ '+money(precoOp(o))+'</span>':'')+
          '<span class="stp">'+
           '<button type="button" class="mn"'+(q?'':' disabled')+
             ' onclick="menos(\''+g.id+'\','+oi+')">−</button>'+
           '<b>'+q+'</b>'+
           '<button type="button" class="ms"'+(cheio?' disabled':'')+
             ' onclick="mais(\''+g.id+'\','+oi+','+max+')">+</button>'+
          '</span></div>';
       }).join('')+'</div>';
    }).join('')+
    '<div class="cp"><label>Observação</label>'+
     '<textarea id="obsP" rows="2" placeholder="ex.: sem calda, bem gelado"></textarea></div>'+
   '</div>'+
   '<div class="pnlF"><button class="btnV" '+(falta?'disabled':'')+' onclick="addSacola()">'+
    (falta?E(_oQueFalta||'Escolha as opções obrigatórias'):'Adicionar · R$ '+money(total))+'</button></div>'+
  '</div>';
  if(!$('ov'))document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)fechar()};
}
/* ==========================================================
   ATUALIZA SO O QUE MUDOU — SEM RECRIAR NADA

   Estas tres funcoes chamavam `desenhaProduto()`, que refaz o painel
   inteiro. Agora elas mexem so nos pedacos afetados: o estado da
   opcao tocada, o contador do grupo dela e o rodape (preco e o que
   falta). Nenhum elemento e destruido, entao a rolagem fica onde
   estava por consequencia, e nao por conserto.
   ========================================================== */
function atualizarGrupo(gid){
  var p=S.prod; if(!p)return;
  var gs=gruposDoProduto(p);
  var gi=gs.findIndex(function(g){return g.id===gid});
  var g=gs[gi]; if(!g)return;
  var sel=_esc[gid]||[];
  var max=Number(g.maximo!=null?g.maximo:g.max)||1;
  var cheio=sel.length>=max;
  var caixa=document.querySelector('.gr[data-g="'+gid+'"]');
  if(!caixa)return;

  /* contador do cabecalho */
  var cont=caixa.querySelector('.cont');
  if(cont)cont.textContent=sel.length+'/'+max;

  /* cada opcao: quantidade, marca e botoes */
  /* `:not(.naoq)` e essencial: o botao "nao quero" tambem tem a classe .op e
     vem ANTES das opcoes. Sem excluir, o indice de cada opcao andava um, e
     tocar no primeiro sabor marcava o segundo. */
  Array.prototype.forEach.call(caixa.querySelectorAll('.op:not(.naoq)'),function(el,oi){
    var q=sel.filter(function(k){return k===oi}).length;
    el.classList.toggle('on',q>0);
    var b=el.querySelector('.stp b'); if(b)b.textContent=q;
    var mn=el.querySelector('.stp .mn'); if(mn)mn.disabled=!q;
    var ms=el.querySelector('.stp .ms'); if(ms)ms.disabled=cheio;
    var r=el.querySelector('input[type="radio"]'); if(r)r.checked=q>0;
  });
  /* o "não quero" deixa de estar marcado se a pessoa escolheu algo */
  var nq=caixa.querySelector('.op.naoq');
  if(nq)nq.classList.toggle('on',_esc['nao_'+gid]===true);
  atualizarRodape();
}
function atualizarRodape(){
  var p=S.prod; if(!p)return;
  var gs=gruposDoProduto(p);
  var total=Number(p.preco)||0;
  gs.forEach(function(g){
    (_esc[g.id]||[]).forEach(function(k){
      var o=opcoesAtivas(g)[k]; if(o)total+=precoOp(o);
    });
  });
  var falta=false,oQue='';
  gs.forEach(function(g){
    if(falta)return;
    var n=(_esc[g.id]||[]).length;
    var min=Number(g.minimo!=null?g.minimo:g.min)||0;
    var recusou=_esc['nao_'+g.id]===true;
    if(g.forcado&&n===0&&!recusou){falta=true;oQue='Escolha: '+g.nome;return;}
    if(min>0&&n>0&&n<min){falta=true;oQue='Falta escolher '+(min-n)+' em '+g.nome;return;}
    if(min>0&&n===0&&!recusou&&g.forcado){falta=true;oQue='Escolha '+min+' em '+g.nome;}
  });
  var b=document.querySelector('#ov .pnlF .btnV');
  if(!b)return;
  b.disabled=falta;
  b.textContent=falta?(oQue||'Escolha as opções obrigatórias')
                     :('Adicionar · R$ '+money(total));
}
function escolher(gid,oi,max){
  _esc['nao_'+gid]=false;
  if(max>1)return mais(gid,oi,max);
  _esc[gid]=[oi];
  atualizarGrupo(gid);
}
function mais(gid,oi,max){
  var s=(_esc[gid]||[]).slice();
  _esc['nao_'+gid]=false;
  if(s.length>=max)return aviso('O máximo aqui é '+max+'.');
  s.push(oi); _esc[gid]=s;
  atualizarGrupo(gid);
}
function menos(gid,oi){
  var s=(_esc[gid]||[]).slice();
  var i=s.indexOf(oi);
  if(i>=0)s.splice(i,1);
  _esc[gid]=s;
  atualizarGrupo(gid);
}
/* ==========================================================
   CLICAR NUM SABOR NAO PODE JOGAR A TELA PARA O TOPO

   Cada clique redesenha o painel inteiro (innerHTML), e o navegador
   volta a rolagem para zero. Quem escolhia o terceiro sabor la embaixo
   era jogado para cima e tinha que rolar tudo de novo a cada toque —
   com 16 sabores na lista, isso torna o cardapio impraticavel.

   Guarda a posicao, redesenha, devolve a posicao.
   ========================================================== */
function semPular(fn){
  /* Guarda a rolagem de TODOS os quadros que possam estar rolando: o corpo
     do painel, o fundo escuro e a pagina. Na primeira tentativa eu guardei
     so `.pnlB`, e no celular quem rola e outro elemento — por isso a tela
     continuou pulando para o topo. */
  var alvos=[document.querySelector('#ov .pnlB'), document.getElementById('ov'),
             document.scrollingElement||document.documentElement, document.body];
  var y=alvos.map(function(e){return e?e.scrollTop:0});
  var yPag=window.pageYOffset||0;
  fn();
  var devolve=function(){
    var a2=[document.querySelector('#ov .pnlB'), document.getElementById('ov'),
            document.scrollingElement||document.documentElement, document.body];
    a2.forEach(function(e,i){ if(e&&y[i])e.scrollTop=y[i]; });
    if(yPag)window.scrollTo(0,yPag);
  };
  devolve();
  requestAnimationFrame(devolve);
  setTimeout(devolve,0);
}
var _tAviso;
function aviso(txt){
  var e=document.getElementById('avisoOp');
  if(!e){ e=document.createElement('div'); e.id='avisoOp';
    e.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:96px;'+
      'background:#2F4A32;color:#fff;padding:10px 16px;border-radius:22px;font-size:14px;'+
      'z-index:99;box-shadow:0 4px 18px rgba(0,0,0,.25);max-width:86%;text-align:center';
    document.body.appendChild(e); }
  e.textContent=txt; e.style.display='block';
  clearTimeout(_tAviso); _tAviso=setTimeout(function(){e.style.display='none'},2600);
}
(function(){
  if(document.getElementById('estQt'))return;
  var e=document.createElement('style'); e.id='estQt';
  e.textContent='.op.qt{display:flex;align-items:center;gap:10px}'+
   '.op.qt .nm{flex:1}'+
   '.op.qt .stp{display:flex;align-items:center;gap:10px}'+
   '.op.qt .stp button{width:34px;height:34px;border-radius:50%;border:1px solid #cfc7b6;'+
     'background:#fff;font-size:19px;line-height:1;cursor:pointer;color:#2F4A32}'+
   '.op.qt .stp button:disabled{opacity:.32;cursor:default}'+
   '.op.qt .stp b{min-width:18px;text-align:center;font-size:15px}';
  document.head.appendChild(e);
})();
/* ==========================================================
   O PRECO DA OPCAO SE CHAMA `preco_adicional` NO BANCO

   Este arquivo lia `o.preco`, que nao existe. Resultado: o cascao
   adicional de R$ 3,00 aparecia sem preco no cardapio e NAO SOMAVA no
   total — o cliente levava dois cascoes de graca, e o pedido chegava
   na loja com valor menor do que devia.

   O cadastro estava certo o tempo todo. Era a leitura.

   Mesma familia do `maximo` lido como `max`: campo com nome diferente
   entre o banco e quem le. Uma funcao so, usada em todos os lugares,
   impede que volte a divergir.
   ========================================================== */
function precoOp(o){
  if(!o)return 0;
  var v=(o.preco_adicional!=null?o.preco_adicional:o.preco);
  return Number(v)||0;
}
/* a zona de entrega guarda o nome da cidade na area, nao na zona */
function cidadeZona(z){
  if(!z)return '';
  if(z.cidade)return z.cidade;
  var a=(D.areas||[]).find(function(x){
    return (x.areas_zonas||[]).some(function(y){return y.id===z.id});
  });
  return a?(a.nome||''):'';
}
function naoQuero(gid){
  _esc[gid]=[];_esc['nao_'+gid]=true;
  atualizarGrupo(gid);
}
function addSacola(){
  var p=S.prod;
  var gs=gruposDoProduto(p);
  var ops=[],extra=0;
  gs.forEach(function(g){
    (_esc[g.id]||[]).forEach(function(k){
      var o=opcoesAtivas(g)[k];
      if(!o)return;
      ops.push({nome:o.nome,preco:precoOp(o)});
      extra+=precoOp(o);
    });
  });
  var un=(Number(p.preco)||0)+extra;
  S.sacola.push({id:p.id,nome:p.nome,unitario:un,qtd:1,total:un,
    opcoes:ops,obs:($('obsP')||{}).value||''});
  salvarLocal();fechar();render();
  evento('AddToCart',{content_name:p.nome,value:un,currency:'BRL'});
}
function fechar(){var o=$('ov');if(o)o.remove();}

/* ---------- sacola ---------- */
function subtotalSacola(){
  return S.sacola.reduce(function(a,i){return a+i.total},0);
}
/* o miolo da sacola, montado a parte para poder ser atualizado sozinho */
function mioloSacola(){
  var sub=subtotalSacola();
  var c=cfgLoja();
  var min=Number(c.pedido_minimo)||0;
  return (S.sacola.length?S.sacola.map(function(i,k){
     var fp=(D.prods.find(function(x){return x.id===i.id})||{});
     var fu=fp.imagem||fp.imagem_url||'';
     return '<div class="si">'+(fu?'<img src="'+fu+'" class="siF" alt="">':'')+
      '<div class="siT"><b>'+E(i.nome)+'</b>'+
      (i.opcoes.length?'<small>'+i.opcoes.map(function(o){return E(o.nome)}).join(' · ')+'</small>':'')+
      (i.obs?'<small>obs: '+E(i.obs)+'</small>':'')+
      '<div class="qtd"><button onclick="mudarQtd('+k+',-1)">−</button>'+
       '<b>'+i.qtd+'</b><button onclick="mudarQtd('+k+',1)">+</button></div></div>'+
      '<div class="siV">R$ '+money(i.total)+'</div></div>';
   }).join('')
    :'<div class="vazio">'+IC.sacola+'<br>Sua sacola está vazia</div>')+
   (S.sacola.length?'<div style="margin-top:16px">'+
     '<div class="tot"><span>Subtotal</span><b>R$ '+money(sub)+'</b></div>'+
     (min&&sub<min?'<div class="aviso" style="margin-top:10px">Pedido mínimo de R$ '+money(min)+
       '. Faltam R$ '+money(min-sub)+' para fechar.</div>':'')+
    '</div>':'');
}
function abrirSacola(){
  var sub=subtotalSacola();
  var c=cfgLoja();
  var min=Number(c.pedido_minimo)||0;
  var ov=document.createElement('div');
  ov.id='ov';ov.className='ov';
  ov.innerHTML='<div class="pnl">'+
   '<div class="pnlH"><b>Sua sacola</b><button class="fechar" onclick="fechar()">×</button></div>'+
   '<div class="pnlB">'+mioloSacola()+'</div>'+
   (S.sacola.length?'<div class="pnlF">'+
    '<button class="btnV"'+(min&&sub<min?' disabled':'')+' onclick="irDados()">Continuar</button>'+
    '<button class="btnL" onclick="fechar()">Escolher mais itens</button></div>':'')+
  '</div>';
  document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)fechar()};
}
/* ==========================================================
   ITEM 15 — O MESMO PADRAO NA SACOLA

   Aqui era ainda mais forte: cada toque no + ou no − fechava o painel
   da sacola (`fechar()`), abria outro do zero (`abrirSacola()`) e ainda
   redesenhava a pagina inteira DUAS vezes (`render()` dentro do if e
   `render()` de novo logo abaixo).

   Com tres ou quatro itens na sacola o cliente via a lista piscar e
   voltar ao topo a cada ajuste de quantidade — bem no momento em que
   ele esta decidindo quanto vai gastar.

   Agora: fecha e reabre so quando a sacola esvazia (ai o painel deixa
   de fazer sentido mesmo). Enquanto houver item, atualiza a lista e o
   total sem recriar o painel.
   ========================================================== */
function mudarQtd(k,d){
  var i=S.sacola[k];
  if(!i)return;
  i.qtd+=d;
  if(i.qtd<=0)S.sacola.splice(k,1);
  else i.total=i.unitario*i.qtd;
  salvarLocal();
  if(!S.sacola.length){ fechar(); render(); return; }
  atualizarSacola();
}
/* troca SO o miolo do painel: a caixa que rola continua a mesma */
function atualizarSacola(){
  var corpo=document.querySelector('#ov .pnlB');
  if(!corpo){ fechar(); abrirSacola(); return; }
  var pos=corpo.scrollTop;
  corpo.innerHTML=mioloSacola();
  corpo.scrollTop=pos;          /* o miolo encolheu: garante a posicao */
  var c=cfgLoja(), min=Number(c.pedido_minimo)||0, sub=subtotalSacola();
  var b=document.querySelector('#ov .pnlF .btnV');
  if(b)b.disabled=!!(min&&sub<min);
}

/* ---------- dados do cliente e fechamento ---------- */
function zonasDaLoja(){
  var l=[];
  D.areas.forEach(function(a){
    (a.areas_zonas||[]).forEach(function(z){
      if(z.ativa===false)return;
      l.push({id:z.id,nome:z.nome,cidade:a.nome,taxa:Number(z.taxa)||0,
        tipo:z.tipo,obs:z.observacao});
    });
    l.push({id:'pad_'+a.id,nome:'Outro bairro / não sei',cidade:a.nome,
      taxa:Number(a.taxa_padrao)||0,tipo:'padrao'});
  });
  return l;
}
function irDados(){
  /* na mesa nao ha o que perguntar de entrega: so o nome da comanda */
  if(modoMesa())return irComanda();
  fechar();
  var c=cfgLoja();
  var cl=S.cliente||{};
  var zs=zonasDaLoja();
  var ov=document.createElement('div');
  ov.id='ov';ov.className='ov';
  ov.innerHTML='<div class="pnl">'+
   '<div class="pnlH"><b>Seus dados</b><button class="fechar" onclick="fechar()">×</button></div>'+
   '<div class="pnlB">'+
    '<div class="esc">'+
     (c.aceita_entrega!==false?'<button class="escB'+(S.tipo==='entrega'?' on':'')+'" '+
      'onclick="S.tipo=\'entrega\';irDados()">Entrega<small>'+
      E(c.tempo_entrega||'a combinar')+'</small></button>':'')+
     (c.aceita_retirada!==false?'<button class="escB'+(S.tipo==='retirada'?' on':'')+'" '+
      'onclick="S.tipo=\'retirada\';irDados()">Retirar na loja<small>'+
      E(c.tempo_retirada||'a combinar')+'</small></button>':'')+
    '</div>'+
    '<div class="cp"><label>Seu nome *</label>'+
     '<input id="cNome" value="'+E(cl.nome||'')+'" placeholder="como podemos te chamar"></div>'+
    '<div class="cp"><label>WhatsApp *</label>'+
     '<input id="cTel" type="tel" inputmode="numeric" value="'+E(cl.tel||'')+'" '+
     'placeholder="(00) 00000-0000"><div class="dica">para avisarmos quando o pedido sair</div></div>'+
    (S.tipo==='entrega'?
     '<div class="dupla"><div class="cp"><label>Rua *</label>'+
      '<input id="cRua" value="'+E(cl.rua||'')+'"></div>'+
      '<div class="cp"><label>Número *</label>'+
      '<input id="cNum" value="'+E(cl.numero||'')+'"></div></div>'+
     '<div class="cp"><label>Bairro / zona *</label>'+
      '<select id="cZona" onchange="mudouZona()">'+
      '<option value="">Selecione onde você está</option>'+
      zs.map(function(z){
        return '<option value="'+z.id+'"'+(cl.zonaId===z.id?' selected':'')+'>'+
        E(cidadeZona(z))+' — '+E(z.nome)+' · R$ '+money(z.taxa)+
        (z.tipo==='rural'?' (zona rural)':'')+'</option>';}).join('')+
      '</select><div class="dica" id="dicaZona"></div></div>'+
     '<div class="cp"><label>Referência</label>'+
      '<input id="cRef" value="'+E(cl.ref||'')+'" placeholder="perto do quê, cor do portão..."></div>'
     :'')+
    '<div class="cp"><label>Forma de pagamento *</label>'+
     '<select id="cPag" onchange="mudouPag()">'+
     '<option value="">Como você vai pagar</option>'+
     formasAceitas().map(function(f){
       return '<option value="'+f+'"'+(cl.pag===f?' selected':'')+'>'+f+'</option>';}).join('')+
     '</select><div class="dica">o pagamento é feito na '+
     (S.tipo==='entrega'?'entrega':'retirada')+'</div></div>'+
    '<div class="cp" id="boxTroco" style="display:none"><label>Precisa de troco para quanto?</label>'+
     '<input id="cTroco" type="number" step="0.01" placeholder="deixe vazio se não precisa"></div>'+
    '<div class="cp"><label>Observação do pedido</label>'+
     '<textarea id="cObs" rows="2" placeholder="algo que devemos saber?"></textarea></div>'+
   '</div>'+
   '<div class="pnlF"><button class="btnV" onclick="revisar()">Revisar pedido</button></div>'+
  '</div>';
  document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)fechar()};
  mudouPag();mudouZona();
  var t=$('cTel');
  if(t)t.oninput=function(){
    var v=this.value.replace(/\D/g,'').slice(0,11);
    this.value=v.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
  };
}
function mudouPag(){
  var p=($('cPag')||{}).value;
  var b=$('boxTroco');
  if(b)b.style.display=(p==='Dinheiro')?'':'none';
}
function mudouZona(){
  var z=($('cZona')||{}).value;
  var d=$('dicaZona');
  if(!d)return;
  var zs=zonasDaLoja();
  var y=zs.find(function(x){return x.id===z});
  d.textContent=y?(y.obs?y.obs+' · taxa R$ '+money(y.taxa):'taxa de entrega R$ '+money(y.taxa))
   :'a taxa aparece depois de escolher';
}
function revisar(){
  var nome=($('cNome')||{}).value||'';
  var tel=($('cTel')||{}).value||'';
  if(!nome.trim()){alert('Informe seu nome.');return;}
  if(tel.replace(/\D/g,'').length<10){alert('Informe um WhatsApp válido.');return;}
  var pag=($('cPag')||{}).value;
  if(!pag){alert('Escolha a forma de pagamento.');return;}
  var zid=($('cZona')||{}).value;
  if(S.tipo==='entrega'&&!zid){alert('Escolha o bairro ou zona da entrega.');return;}
  var zs=zonasDaLoja();
  var z=zs.find(function(x){return x.id===zid});
  S.cliente={nome:nome.trim(),tel:tel,rua:($('cRua')||{}).value||'',
    numero:($('cNum')||{}).value||'',ref:($('cRef')||{}).value||'',
    zonaId:zid,zona:z?z.nome:'',cidade:cidadeZona(z),
    pag:pag,troco:parseFloat(($('cTroco')||{}).value)||0,
    obs:($('cObs')||{}).value||''};
  salvarLocal();fechar();
  evento('InitiateCheckout',{value:S.sacola.reduce(function(a,i){return a+i.total},0),currency:'BRL'});
  telaRevisao();
}
function telaRevisao(){
  var sub=S.sacola.reduce(function(a,i){return a+i.total},0);
  var cl=S.cliente;
  var zs=zonasDaLoja();
  var z=zs.find(function(x){return x.id===cl.zonaId});
  var taxa=(S.tipo==='entrega'&&z)?z.taxa:0;
  var tot=sub+taxa;
  var ov=document.createElement('div');
  ov.id='ov';ov.className='ov';
  ov.innerHTML='<div class="pnl">'+
   '<div class="pnlH"><b>Confirmar pedido</b><button class="fechar" onclick="fechar()">×</button></div>'+
   '<div class="pnlB">'+
    S.sacola.map(function(i){
      return '<div class="si"><div class="siT"><b>'+i.qtd+'× '+E(i.nome)+'</b>'+
       (i.opcoes.length?'<small>'+i.opcoes.map(function(o){return E(o.nome)}).join(' · ')+'</small>':'')+
       (i.obs?'<small>obs: '+E(i.obs)+'</small>':'')+'</div>'+
       '<div class="siV">R$ '+money(i.total)+'</div></div>';
    }).join('')+
    '<div style="margin:16px 0 6px">'+
     '<div class="tot"><span>Subtotal</span><b>R$ '+money(sub)+'</b></div>'+
     (S.tipo==='entrega'?'<div class="tot"><span>Taxa de entrega</span><b>R$ '+money(taxa)+'</b></div>':'')+
     '<div class="tot f"><span>Total</span><span>R$ '+money(tot)+'</span></div>'+
    '</div>'+
    '<div class="resumo">'+
     '<b class="tit">'+
      (S.tipo==='entrega'?'Entrega':'Retirada na loja')+'</b>'+
     E(cl.nome)+' · '+E(cl.tel)+'<br>'+
     (S.tipo==='entrega'?E(cl.rua)+', '+E(cl.numero)+'<br>'+E(cl.zona)+' — '+E(cl.cidade)+
       (cl.ref?'<br><span style="color:var(--ink-3)">'+E(cl.ref)+'</span>':'')
      :E(S.loja.nome)+(S.loja.cidade?' — '+E(S.loja.cidade):''))+
     '<br><br><b>Pagamento:</b> '+E(cl.pag)+
     (cl.troco?' · troco para R$ '+money(cl.troco):'')+
     (cl.obs?'<br><b>Obs.:</b> '+E(cl.obs):'')+
    '</div>'+
   '</div>'+
   '<div class="pnlF"><button class="btnV" id="btEnviar" onclick="enviarPedido('+taxa+','+tot+')">'+
    'Enviar pedido</button>'+
    '<button class="btnL" onclick="fechar();irDados()">Corrigir dados</button></div>'+
  '</div>';
  document.body.appendChild(ov);
}
/* a tela da mesa: so o nome de quem esta pedindo */
function irComanda(){
  var ov=document.createElement('div');ov.className='ovl';ov.id='ovl';
  var sub=S.sacola.reduce(function(a,i){return a+i.total},0);
  ov.innerHTML='<div class="pnl">'+
   '<div class="pnlH"><b>Mesa '+E(S.mesa)+'</b>'+
    '<button onclick="fechar()">&times;</button></div>'+
   '<div class="pnlB">'+
    '<div class="campo"><label>Seu nome</label>'+
     '<input id="cmNome" value="'+E(S.comanda)+'" placeholder="Como te chamamos?" autocomplete="off">'+
     '<div class="dica">É por este nome que seus itens ficam separados na conta da mesa.</div>'+
    '</div>'+
    '<div class="campo"><label>Observação</label>'+
     '<textarea id="cmObs" rows="2" placeholder="sem cebola, ponto da carne..."></textarea></div>'+
    '<div class="tot"><span>Total do pedido</span><b>R$ '+money(sub)+'</b></div>'+
    '<div class="dica">O pagamento é feito no caixa, no fim. Este pedido vai para o '+
    'atendente conferir antes de ir para a cozinha.</div>'+
   '</div>'+
   '<div class="pnlF"><button class="btnV" id="btEnviar" onclick="enviarPedidoMesa('+sub+')">'+
    'Enviar para a cozinha</button></div>'+
  '</div>';
  document.body.appendChild(ov);
  setTimeout(function(){var i=$('cmNome');if(i)i.focus();},80);
}
async function enviarPedidoMesa(tot){
  var nome=($('cmNome')||{}).value||'';
  nome=String(nome).trim();
  if(!nome){alert('Digite seu nome para separar a conta.');return;}
  var obs=(($('cmObs')||{}).value||'').trim();
  S.comanda=nome;
  var bt=$('btEnviar');
  if(bt){bt.disabled=true;bt.textContent='Enviando...';}
  var num=String(Date.now()).slice(-6);
  try{
    var r=await sb.from('pedidos_online').insert([{
      loja_id:lojaDaEmpresa(),
      sucursal_id:S.loja.id,numero:num,situacao:'novo',
      cliente_nome:nome,cliente_tel:'',
      tipo:'mesa',mesa_numero:parseInt(S.mesa,10)||null,comanda_nome:nome,
      itens:S.sacola,subtotal:tot,taxa:0,total:tot,
      observacao:obs,canal:'mesa'
    }]);
    if(r.error)throw r.error;
    S.sacola=[];salvarLocal();
    fechar();
    telaSucessoMesa(nome);
  }catch(e){
    if(bt){bt.disabled=false;bt.textContent='Enviar para a cozinha';}
    alert('Não consegui enviar: '+((e&&e.message)||'tente de novo'));
  }
}
function telaSucessoMesa(nome){
  var ov=document.createElement('div');ov.className='ovl';ov.id='ovl';
  ov.innerHTML='<div class="pnl"><div class="pnlB" style="text-align:center;padding:34px 24px">'+
   '<div style="font-size:44px">🍽️</div>'+
   '<h2 style="margin:10px 0 6px">Pedido enviado!</h2>'+
   '<p style="color:var(--ink-2)">Mesa '+E(S.mesa)+' — comanda de <b>'+E(nome)+'</b>.<br>'+
   'O atendente vai conferir e levar para a cozinha.</p>'+
   '<p style="color:var(--ink-3);font-size:13px">Quer pedir mais? É só continuar — '+
   'tudo vai para a mesma conta.</p>'+
   '</div><div class="pnlF"><button class="btnV" onclick="fechar();render()">Continuar pedindo</button>'+
   '</div></div>';
  document.body.appendChild(ov);
}
async function enviarPedido(taxa,tot){
  var bt=$('btEnviar');
  if(bt){bt.disabled=true;bt.textContent='Enviando...';}
  var cl=S.cliente;
  var sub=S.sacola.reduce(function(a,i){return a+i.total},0);
  var num=String(Date.now()).slice(-6);
  try{
    var r=await sb.from('pedidos_online').insert([{
      loja_id:lojaDaEmpresa(),
      sucursal_id:S.loja.id,numero:num,situacao:'novo',
      cliente_nome:cl.nome,cliente_tel:cl.tel,
      endereco:{rua:cl.rua,numero:cl.numero,referencia:cl.ref},
      zona_id:cl.zonaId,zona:cl.zona,cidade:cl.cidade,
      tipo:S.tipo,forma_pagamento:cl.pag,troco_para:cl.troco||0,
      itens:S.sacola,subtotal:sub,taxa:taxa,total:tot,
      observacao:cl.obs,canal:'cardapio'
    }]);
    if(r.error)throw r.error;
    evento('Purchase',{value:tot,currency:'BRL',num_items:S.sacola.length});
    S.sacola=[];salvarLocal();
    fechar();
    telaSucesso(num,tot);
  }catch(e){
    if(bt){bt.disabled=false;bt.textContent='Tentar enviar de novo';}
    var det=(e&&(e.message||e.hint||e.details))||'';
    var box=document.getElementById('erroEnvio');
    if(!box){
      box=document.createElement('div');
      box.id='erroEnvio';box.className='aviso';
      box.style.cssText='background:#FBEDE9;border-color:#E9C9BF;color:#9A4B33;margin:0 0 14px';
      var pb=document.querySelector('.pnlB');
      if(pb)pb.insertBefore(box,pb.firstChild);
    }
    box.innerHTML='<b>Não consegui enviar o pedido.</b><br>'+
      'Confira sua internet e tente de novo. Se continuar, chame no WhatsApp.'+
      (det?'<br><small style="opacity:.7;font-size:11px">detalhe: '+E(det)+'</small>':'');
    try{ console.error('erro ao enviar pedido:',e); }catch(x){}
  }
}
function telaSucesso(num,tot){
  var c=cfgLoja();
  var zap=(c.whatsapp||'').replace(/\D/g,'');
  var msg=encodeURIComponent('Olá! Fiz o pedido nº '+num+' pelo cardápio digital. Total R$ '+money(tot)+'.');
  $('app').innerHTML=topo()+capa()+
   '<div class="ok"><div class="okIc">'+IC.check+'</div>'+
   '<h2>Pedido enviado!</h2>'+
   '<p>Número <b>#'+num+'</b> · Total <b>R$ '+money(tot)+'</b></p>'+
   '<p style="color:var(--ink-3);margin-top:12px">Já apareceu na tela da loja. '+
   'Em instantes confirmamos pelo WhatsApp.</p>'+
   (zap?'<a href="https://wa.me/55'+zap+'?text='+msg+'" class="btnV" '+
     'style="display:block;text-decoration:none;margin-top:22px">Falar no WhatsApp</a>':'')+
   '<button class="btnL" onclick="S.tela=\'menu\';render()">Fazer outro pedido</button>'+
   '</div>'+rodape();
  window.scrollTo(0,0);
}
/* ---------- pixels ---------- */
function evento(nome,dados){
  try{ if(window.fbq)fbq('track',nome,dados||{}); }catch(e){}
  try{ if(window.gtag)gtag('event',nome,dados||{}); }catch(e){}
}
carregar();
