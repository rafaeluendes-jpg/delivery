# NEXOR — Publicar e acessar

## PARTE 1 — Publicar o sistema (5 minutos)

Você vai subir o arquivo `index.html` para o seu próprio Supabase.
O espaço já está criado e configurado.

### Passo 1 — abrir o painel
Entre neste endereço:

    https://supabase.com/dashboard/project/cevghkndzpzvnzwifhnm

### Passo 2 — ir no Storage
No menu da esquerda, clique em **Storage** (ícone de pasta).

### Passo 3 — abrir o bucket "app"
Já existe um bucket chamado **app**, marcado como público. Clique nele.

### Passo 4 — subir o arquivo
Clique em **Upload file** e escolha o arquivo **index.html**
(o que eu te entreguei aqui no chat).

Se ele avisar que o arquivo já existe, marque **Overwrite / Substituir**.

### Passo 5 — pegar o endereço
Clique no arquivo que apareceu na lista → botão **Get URL** ou **Copy URL**.

O endereço será exatamente este:

    https://cevghkndzpzvnzwifhnm.supabase.co/storage/v1/object/public/app/index.html

Guarde esse link. É o endereço do seu sistema, funciona em qualquer
aparelho, inclusive celular.

### Se o navegador BAIXAR o arquivo em vez de abrir
Acontece em alguns casos. Solução alternativa, também rápida:

1. Entre em https://app.netlify.com/drop
2. Faça login (pode entrar com a conta do Google)
3. Arraste o arquivo **index.html** para a página
4. Ele devolve um endereço na hora, tipo `algo-aleatorio.netlify.app`

O Netlify serve o arquivo como página, sem esse problema.

---

## PARTE 2 — Primeiro acesso ao sistema

Abra o link no navegador.

| onde | usuário | senha |
|---|---|---|
| Tela de login do sistema | admin | admin |

Esse login é local, funciona sem internet.

---

## PARTE 3 — Ligar o banco de dados (ordem importa)

Faça exatamente nesta ordem:

### 1. Baixe uma cópia dos dados PRIMEIRO
- Clique no ícone de **nuvem** no topo (ao lado da interrogação)
- Clique em **Baixar cópia dos dados**
- Guarde o arquivo. É a sua garantia se algo der errado.

### 2. Teste a conexão
- No mesmo painel, clique em **Testar conexão com o banco**
- Os quatro passos devem ficar verdes
- Se algum ficar vermelho, me manda o print que eu corrijo

### 3. Ligue a nuvem
- Clique em **Ligar a nuvem**
- Entre com:

| campo | valor |
|---|---|
| E-mail | rafael@nexor.app |
| Senha | Nexor2026 |

- Ele envia para o banco tudo que está no aparelho

**Importante:** é provável que a primeira sincronização mostre algum erro.
É normal — é código que nunca rodou contra o banco de verdade. Me manda o
que apareceu na tela que eu corrijo. Seus dados não se perdem nesse
processo, porque você já baixou a cópia no passo 1.

---

## PARTE 4 — Acessos do banco de dados

| item | valor |
|---|---|
| Painel do Supabase | https://supabase.com/dashboard/project/cevghkndzpzvnzwifhnm |
| Endereço da API | https://cevghkndzpzvnzwifhnm.supabase.co |
| Chave pública | sb_publishable_tH04wQWnUjOUQWePZ0Bshw_RirDPUDY |
| Região | us-east-2 (Estados Unidos) |
| Usuário do sistema | rafael@nexor.app / Nexor2026 |

**Estado do banco:** 37 tabelas, todas com segurança por loja ativa.
As 25 coleções do sistema estão mapeadas nas tabelas corretas.

---

## PARTE 5 — Atualizar o sistema depois

Sempre que a gente corrigir um bug ou criar um módulo novo:

1. Eu te entrego o arquivo novo aqui no chat
2. Você repete a **Parte 1** (Storage → app → Upload → Substituir)
3. O endereço continua o mesmo
4. **Os dados no banco não são afetados** — o arquivo é só a tela

---

## PARTE 6 — Sobre custos

O plano gratuito do Supabase serve para testar e para as primeiras lojas:

- 500 MB de banco de dados
- 1 GB de arquivos (o sistema tem 650 KB)
- 5 GB de tráfego por mês
- **O projeto é pausado após 7 dias sem nenhum uso** — reativa com um
  clique e os dados continuam lá

Quando crescer para várias unidades, o plano Pro custa US$ 25 por mês e
tira a pausa, aumenta o banco e inclui backup diário.
