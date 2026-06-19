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

| Arquivo       | Descrição                                              |
| ------------- | ------------------------------------------------------ |
| `index.html`  | Página principal, estilos e inicialização do Firebase. |
| `app.js`      | Lógica da aplicação (telas, regras e integrações).     |

## Como executar

Por usar módulos ES e Firebase, o projeto deve ser servido por HTTP (não abra
o `index.html` direto pelo `file://`):

```bash
# a partir da raiz do projeto
python3 -m http.server 8000
# e acesse http://localhost:8000
```

O acesso requer autenticação via Firebase com um usuário válido da Udiaço.
