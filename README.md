# Presence Console — Plataforma de Análise de Atividade no Roblox

> Projeto acadêmico de Análise e Desenvolvimento de Sistemas.
> API REST em Node.js para agregação e visualização de dados **públicos** de
> usuários do Roblox, com tracker de atividade em tempo quase real e um painel
> web para consulta.

![status](https://img.shields.io/badge/status-MVP-blue)
![node](https://img.shields.io/badge/node-%E2%89%A518-green)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Sumário

- [Contexto e motivação](#contexto-e-motivação)
- [Objetivos](#objetivos)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Instalação e execução](#instalação-e-execução)
- [Endpoints da API](#endpoints-da-api)
- [Modo autenticado (cookie)](#modo-autenticado-cookie)
- [Limitações e considerações éticas](#limitações-e-considerações-éticas)
- [Trabalhos futuros](#trabalhos-futuros)
- [Autoria](#autoria)
- [Licença](#licença)

---

## Contexto e motivação

O Roblox é uma das maiores plataformas de jogos do mundo e expõe um conjunto de
APIs públicas que permitem consultar informações de perfil, amizades e jogos de
seus usuários. Este projeto explora, na prática, conceitos de **consumo de APIs
REST**, **arquitetura em camadas**, **tratamento de privacidade de dados** e
**desenvolvimento full-stack**, construindo uma ferramenta que agrega esses
dados públicos em uma interface única e legível.

O recorte do trabalho foi deliberadamente escolhido para evidenciar um ponto
relevante de engenharia de software: **nem todo dado tecnicamente acessível é
um dado disponível**. As próprias restrições de privacidade da API do Roblox
são tratadas como requisito de projeto, e não como obstáculo a ser contornado.

## Objetivos

**Objetivo geral:** desenvolver uma aplicação cliente-servidor capaz de
consultar e exibir dados públicos de usuários do Roblox de forma organizada.

**Objetivos específicos:**

- Consumir endpoints REST oficiais do Roblox (users, friends, games, presence).
- Implementar uma API intermediária em Node.js com arquitetura em camadas.
- Construir um tracker de atividade que registra o histórico de status ao longo
  do tempo, contornando a ausência de histórico nativo na plataforma.
- Disponibilizar um front-end responsivo para visualização dos dados.
- Documentar de forma transparente os limites de privacidade impostos pela API.

## Funcionalidades

- Busca de usuário por **username** ou **ID numérico**.
- Exibição de **perfil** (nome, ID, data de criação, descrição) e avatar.
- **Tracker de atividade:** status online/offline/em jogo/studio, jogo atual e
  servidor atual (quando autorizado).
- **Histórico de atividade** persistido localmente, construído incrementalmente
  a cada consulta.
- Listagem de **amigos** públicos.
- Listagem de **jogos** criados e favoritados.
- Consulta de status **em lote** para múltiplos usuários.
- **Painel web** responsivo (dark, mobile-first).

## Arquitetura

O backend segue uma separação em camadas para isolar responsabilidades. Cada
camada conhece apenas a imediatamente inferior, o que facilita testes e
manutenção:

```
Cliente HTTP / Front-end
        │
   server.js          → camada HTTP: rotas Express, parsing, tratamento de erros
        │
   services/          → regras de negócio: agregação e histórico
        │
   clients/           → integração: chamadas aos endpoints do Roblox
        │
     API Roblox
```

Estrutura de diretórios:

```
roblox-api/
├── public/
│   └── index.html              # front-end (painel web)
├── src/
│   ├── server.js               # servidor Express e rotas
│   ├── robloxClient.js         # cliente: perfil, amigos, jogos
│   ├── clients/
│   │   └── presenceClient.js   # cliente: presença (anônimo e autenticado)
│   └── services/
│       └── trackerService.js   # tracker + histórico local
├── data/
│   └── activity-history.json   # histórico gerado em runtime (não versionado)
├── package.json
└── README.md
```

## Tecnologias

| Camada    | Tecnologia                         |
|-----------|------------------------------------|
| Backend   | Node.js (ES Modules), Express      |
| Frontend  | HTML5, CSS3, JavaScript (vanilla)  |
| Dados     | API REST oficial do Roblox, JSON   |
| Versão    | Git / GitHub                       |

Optou-se por JavaScript puro no front-end para manter o projeto leve e sem
dependências de build, adequado ao escopo de um MVP acadêmico.

## Instalação e execução

Pré-requisitos: Node.js 18 ou superior.

```bash
# clonar o repositório
git clone https://github.com/ifelix081/consulta-roblox-api.git
cd consulta-roblox-api

# instalar dependências
npm install

# iniciar o servidor
npm start
```

Acesse o painel em `http://localhost:3000` e a API em `http://localhost:3000/api`.

## Endpoints da API

| Método | Rota                          | Descrição                                  |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/api`                        | Lista as rotas disponíveis                 |
| GET    | `/user/:id`                   | Perfil e avatar                            |
| GET    | `/user/:id/friends`           | Lista de amigos e total                    |
| GET    | `/user/:id/games`             | Jogos criados e favoritos                  |
| GET    | `/user/:id/full`              | Todos os dados agregados                   |
| GET    | `/user/:id/activity`          | Status, jogo/servidor atual e histórico    |
| GET    | `/track?ids=1,2,3`            | Status de múltiplos usuários em uma chamada|

`:id` aceita username (ex.: `Roblox`) ou ID numérico (ex.: `1`).

### Exemplo de resposta — `/user/1/activity`

```json
{
  "userId": 1,
  "online": true,
  "status": "in-game",
  "currentGame": "Playing Natural Disaster Survival",
  "currentServer": null,
  "serverVisible": false,
  "lastOnline": "2026-06-11T12:00:00Z",
  "history": [ { "status": "online", "at": "2026-06-11T11:00:00Z" } ],
  "checkedAt": "2026-06-11T14:30:00Z"
}
```

## Modo autenticado (cookie)

O campo `currentServer` (servidor/instância atual) só é retornado pela API do
Roblox quando a requisição está autenticada com o cookie `.ROBLOSECURITY` de uma
conta que tenha permissão de visualizar a presença do usuário-alvo — em geral,
sendo amigo dele.

```bash
ROBLOX_COOKIE="valor_completo_do_cookie" npm start
```

> **Atenção:** o cookie equivale a acesso total à conta. Recomenda-se usar uma
> conta secundária dedicada, nunca versionar o cookie e armazená-lo apenas em
> variável de ambiente. Sem o cookie, todas as demais funcionalidades continuam
> operando normalmente.

## Limitações e considerações éticas

Este projeto acessa **exclusivamente dados públicos** e respeita integralmente
as configurações de privacidade da plataforma:

- Dados marcados como privados pelo usuário retornam vazios — por design, não
  por falha.
- O servidor exato de um jogador não é exposto para terceiros não autorizados.
  Trata-se de uma proteção de segurança da própria plataforma contra rastreio
  indevido, respeitada por este projeto.
- O Roblox não disponibiliza histórico de partidas de terceiros; o histórico
  desta aplicação é construído localmente e reflete apenas o que foi observado
  durante o uso da ferramenta.
- O uso deve respeitar os Termos de Serviço do Roblox e os limites de requisição
  (rate limits) dos endpoints.

## Trabalhos futuros

- Camada de cache para reduzir chamadas e respeitar rate limits.
- Worker de polling para popular o histórico automaticamente.
- Paginação da lista de amigos.
- Migração do front-end para React e do histórico para um banco de dados.
- Autenticação de usuários e dashboards comparativos.

## Autoria

Projeto desenvolvido para fins acadêmicos no curso de Análise e Desenvolvimento
de Sistemas.

- **Autor:** _Italo Vinicius & Eduardo Alves_
- **Instituição:** _FICR_

## Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

> Roblox é uma marca registrada da Roblox Corporation. Este é um projeto
> acadêmico independente, sem qualquer vínculo ou endosso oficial.
#   c o n s u l t a - r o b l o x - a p i  
 