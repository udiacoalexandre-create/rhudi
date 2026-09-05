# Udiaço — Sistema de Benefícios RH

Sistema de RH da **Udiaço** para gestão de colaboradores, apuração e
administração de benefícios. A aplicação roda inteiramente no navegador
(single-page app) e usa o Firebase como backend.

## Funcionalidades

- **Dashboard Geral** — visão consolidada de colaboradores e indicadores de RH.
- **Colaboradores** — cadastro e manutenção da base (admissão, status:
  Trabalhando, Férias, Afastado, Demitido, etc.), incluindo revisão de MEI.
- **Benefícios** — apuração de Vale Transporte (VT), Vale Refeição, Mobilidade,
  Café da Manhã e Prêmio Assiduidade.
- **Controle de Férias** — férias individuais e coletivas.
- **Folha de Pagamento** — apuração, visualização e fechamento de competência.
- **Importação de dados** — apontamentos, faltas e atualização mensal da base.
- **Exportação** — integração com **Caju** e **Senior** para envio dos dados
  de benefícios e folha.

## Tecnologias

- HTML + JavaScript (vanilla, sem build).
- [Firebase](https://firebase.google.com/) — Firestore (dados) e Authentication
  (login por e-mail e senha).
- [SheetJS / xlsx](https://sheetjs.com/) — leitura e geração de planilhas.

## Estrutura

O mesmo login serve a quatro aplicações; o Master libera cada plataforma
pessoa por pessoa, e quem não tem é barrado pela regra do Firestore, não só
pela tela.

| Arquivo                    | Descrição                                              |
| -------------------------- | ------------------------------------------------------ |
| `index.html` / `app.js`    | RH: colaboradores, benefícios, férias, folha, prêmios. |
| `projetos.html` / `.js`    | Projetos Estratégicos, e o Laboratório particular.     |
| `comercial.html` / `.js`   | Comercial: painéis de BI e o Projeto Dev&Co.           |
| `painel.html`              | Painel de BI aberto por link público (só leitura).     |
| `demandas.html`            | Quadro de demandas por link público (só leitura).      |
| `udiaco-design-system.css` | Estilos comuns às quatro telas.                        |
| `firestore.rules`          | Quem lê e escreve o quê. **O CI não publica isto.**    |
| `ferramentas/`             | Scripts de terminal. Fora do deploy do Hosting.        |

## Publicar um HTML no Laboratório

O Laboratório é a aba particular dentro do Projetos Estratégicos. Dá para
subir pelo navegador, mas enquanto se desenvolve o caminho é o terminal:

```bash
node ferramentas/lab.js publicar site/index.html --titulo "Meu site"
node ferramentas/lab.js publicar site/index.html --watch   # republica ao salvar
node ferramentas/lab.js listar
node ferramentas/lab.js excluir lab_index
```

O id vem do nome do arquivo, então publicar de novo **atualiza** o mesmo teste
em vez de criar um segundo. CSS, JS e imagens locais entram embutidos no HTML
— o visor abre o arquivo num iframe isolado, onde caminho relativo não
resolveria; link de CDN continua sendo buscado normalmente.

A ferramenta usa a chave da conta de serviço, procurada em
`~/udiaco-dados-privados` (ou no caminho da variável `UDIACO_SA`). A chave não
está no repositório e a pasta `ferramentas/` não vai para o Hosting.

## Testes

As suítes carregam o arquivo real da aplicação num sandbox e exercitam as
funções de verdade — não conferem markup solto.

```bash
node ferramentas/testes/rodar.js        # todas
node ferramentas/testes/rodar.js lab    # só as que casam com "lab"
```

Sai com código 1 se qualquer uma falhar, para servir de porta antes do
commit. A suíte `labcli` toca o Firestore de produção num id descartável
(`lab_zzz_teste_automatico`) e apaga o que criou.

## Como executar

Por usar módulos ES e Firebase, o projeto deve ser servido por HTTP (não abra
o `index.html` direto pelo `file://`):

```bash
# a partir da raiz do projeto
python3 -m http.server 8000
# e acesse http://localhost:8000
```

O acesso requer autenticação via Firebase com um usuário válido da Udiaço.
