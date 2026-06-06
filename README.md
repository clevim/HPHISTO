<div align="center">

# 🔨 HΦSTO

### Forja de preços para impressão 3D

Calculadora de custos completa para serviços de impressão 3D — do filamento ao preço de venda, com perfis de impressora, controle de estoque, agenda de produção e orçamentos em PDF.

</div>

---

## ✨ Sobre

**HΦSTO** (lê-se *Hefesto*, o deus grego da forja) é um web app que transforma o cálculo de custos de impressão 3D em algo rápido, visual e confiável. Nasceu da modernização de uma velha planilha de Excel e virou uma ferramenta completa de precificação para makers e estúdios.

Os dados são salvos em um banco **SQLite local** (via Docker) e sincronizados automaticamente com o navegador.

## 🧮 Recursos

- **Calculadora de custos** (modo simples e detalhado) com cálculo ao vivo de:
  - Material, energia, depreciação, retorno do investimento, manutenção, provisão de falhas, acabamento
  - Mão de obra, modelagem, custos fixos rateados, consumíveis, embalagem e frete
  - Margem de lucro ajustável + taxa de cartão/marketplace
- **3 formas de informar o filamento**: peso (g), comprimento (m) ou **leitura de G-code** (Cura, PrusaSlicer, OrcaSlicer, Bambu)
- **Visualização da peça** na câmara de impressão, gerada a partir das camadas do G-code
- **Perfis de impressora** — potência, valor, vida útil, payback, % de falhas e manutenção
- **Gestão de filamentos** — marca, cor, densidade, diâmetro e **controle de estoque** por rolo com alerta de estoque baixo
- **Catálogo de produtos** — salve peças recorrentes e orce em 1 clique
- **Comparador lado a lado** — compare até 3 setups diferentes
- **Agenda de produção** — painel impressora × dia com carga de trabalho e alerta de sobrecarga
- **Gestão de clientes** com histórico de orçamentos por cliente
- **Histórico de orçamentos** e geração de **orçamento em PDF** com QR code
- **API REST completa** — automatize tudo que o app faz via HTTP
- **Multi-idioma** (Português / English) e **multi-moeda** (R$, US$, €, £) com formatação local
- **Temas e cor principal personalizáveis** (Console / Blueprint / Papel)
- **PWA** — instalável no celular, funciona offline
- **Responsivo** — funciona no desktop e no celular

## 🚀 Como usar

### Desenvolvimento local

```bash
git clone https://github.com/SEU-USUARIO/hefesto-3d.git
cd hefesto-3d

npm install
mkdir -p data
npm start
# acesse http://localhost:8080
```

### Docker (recomendado para produção)

```bash
# copie e edite as variáveis de ambiente
cp .env.example .env

# suba o container
docker compose up -d --build
# acesse http://localhost:8080
```

Para parar:

```bash
docker compose down
```

> Os dados ficam no volume Docker `hfsto_data` e sobrevivem à recriação do container.

## 🔐 Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste conforme necessário:

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `8080` | Porta do servidor |
| `DB_PATH` | `./data/hphisto.db` | Caminho do banco SQLite |
| `API_TOKEN` | _(vazio)_ | Token de autenticação da API. Se vazio, a API fica aberta |

Gere um token seguro:

```bash
openssl rand -hex 32
```

## 🔌 API REST

A API expõe todas as operações do app via HTTP. A autenticação funciona em dois modos:

- **Browser** (same-origin): recebe um cookie de sessão automaticamente ao abrir a página
- **Cliente externo**: envie o header `Authorization: Bearer <API_TOKEN>`

O endpoint `/api/health` não requer autenticação.

### Referência de endpoints

#### Estado completo
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/state` | Retorna o estado completo |
| `PUT` | `/api/state` | Substitui o estado completo |

#### Impressoras `/api/printers`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/printers` | Listar todas |
| `POST` | `/api/printers` | Criar |
| `GET` | `/api/printers/:id` | Buscar uma |
| `PUT` | `/api/printers/:id` | Atualizar |
| `DELETE` | `/api/printers/:id` | Remover |
| `POST` | `/api/printers/:id/duplicate` | Duplicar |

#### Materiais `/api/materials`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/materials` | Listar todos |
| `POST` | `/api/materials` | Criar |
| `GET` | `/api/materials/:id` | Buscar um |
| `PUT` | `/api/materials/:id` | Atualizar |
| `DELETE` | `/api/materials/:id` | Remover |
| `POST` | `/api/materials/:id/duplicate` | Duplicar |
| `POST` | `/api/materials/:id/consume` | Baixar estoque `{ "grams": 50 }` |
| `POST` | `/api/materials/:id/refill` | Repor um rolo |

#### Orçamentos `/api/quotes`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/quotes` | Listar todos (filtros: `?clientId=`) |
| `POST` | `/api/quotes` | Salvar orçamento |
| `GET` | `/api/quotes/:id` | Buscar um |
| `PUT` | `/api/quotes/:id` | Atualizar |
| `DELETE` | `/api/quotes/:id` | Remover |

#### Agenda `/api/jobs`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/jobs` | Listar todos (filtros: `?status=`, `?printerId=`) |
| `POST` | `/api/jobs` | Criar trabalho |
| `GET` | `/api/jobs/:id` | Buscar um |
| `PUT` | `/api/jobs/:id` | Atualizar |
| `DELETE` | `/api/jobs/:id` | Remover |
| `POST` | `/api/jobs/:id/complete` | Concluir + baixa automática de filamento |
| `POST` | `/api/jobs/:id/status` | Mudar status `{ "status": "printing" }` |

Valores válidos de `status`: `queued`, `printing`, `done`, `failed`.

#### Catálogo `/api/catalog`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/catalog` | Listar produtos |
| `POST` | `/api/catalog` | Criar produto |
| `GET` | `/api/catalog/:id` | Buscar um |
| `PUT` | `/api/catalog/:id` | Atualizar |
| `DELETE` | `/api/catalog/:id` | Remover |

#### Clientes `/api/clients`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/clients` | Listar todos |
| `POST` | `/api/clients` | Criar |
| `GET` | `/api/clients/:id` | Buscar um |
| `PUT` | `/api/clients/:id` | Atualizar |
| `DELETE` | `/api/clients/:id` | Remover (limpa vínculo nos orçamentos) |
| `GET` | `/api/clients/:id/quotes` | Orçamentos do cliente |

#### Configurações `/api/settings`
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/settings` | Retorna as configurações |
| `PATCH` | `/api/settings` | Atualiza parcialmente |
| `PUT` | `/api/settings` | Substitui completamente |

#### Cálculo e backup
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/calc` | Calcula custo/preço sem salvar |
| `GET` | `/api/export` | Download do backup completo em JSON |
| `POST` | `/api/import` | Importa backup (`?mode=merge` para mesclar) |

### Exemplos com curl

```bash
TOKEN="seu-token-aqui"
BASE="http://localhost:8080"

# Listar materiais
curl -H "Authorization: Bearer $TOKEN" $BASE/api/materials

# Criar impressora
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ender 3","power":110,"value":1500,"lifespanYears":3}' \
  $BASE/api/printers

# Calcular preço de uma peça
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "printerId": "prn_abc123",
      "materialId": "mat_xyz456",
      "weightG": 45,
      "timeHours": 3,
      "timeMinutes": 30,
      "margin": 80
    }
  }' \
  $BASE/api/calc

# Baixar backup
curl -H "Authorization: Bearer $TOKEN" $BASE/api/export -o backup.json

# Importar backup (mescla)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json \
  "$BASE/api/import?mode=merge"
```

## 🛠️ Stack

- **React 18** (via Babel standalone, sem build step)
- **JavaScript / JSX** puro, sem dependências de bundler
- **Express** + **SQLite** (`better-sqlite3`) para persistência e API
- **CSS** com variáveis e `oklch` para o sistema de temas
- **Docker** + **volume** para deploy e persistência

## 📂 Estrutura

```
hphisto/
├── public/                        → frontend estático (raiz do Express)
│   ├── index.html                 → ponto de entrada
│   ├── styles.css                 → design system e temas
│   ├── manifest.webmanifest       → PWA manifest
│   ├── sw.js                      → service worker (offline)
│   ├── assets/                    → ícones PWA
│   └── js/
│       ├── core/                  → lógica pura JS (sem JSX)
│       │   ├── data.js            → dados padrão e helpers
│       │   ├── i18n.js            → traduções e formatação de moeda/data
│       │   ├── calc.js            → motor de cálculo + leitor de G-code
│       │   ├── extras.js          → QR code, som de bigorna
│       │   └── nfc.js             → leitura de tags NFC
│       ├── store/
│       │   └── store.jsx          → estado global (localStorage + SQLite via API)
│       ├── ui/                    → componentes base reutilizáveis
│       │   ├── ui.jsx             → primitivas de UI + ícones
│       │   ├── buildviz.jsx       → visualização 3D da peça
│       │   └── tweaks-panel.jsx   → shell do painel de tweaks
│       ├── screens/               → telas completas
│       │   ├── calculator.jsx     → calculadora de custos
│       │   ├── detailed.jsx       → custos detalhados (mão de obra, consumíveis…)
│       │   ├── manage.jsx         → impressoras e materiais
│       │   ├── calendar.jsx       → agenda de produção
│       │   ├── catalog.jsx        → catálogo de produtos
│       │   ├── clients.jsx        → gestão de clientes
│       │   ├── compare.jsx        → comparador lado a lado
│       │   ├── dashboard.jsx      → painel inicial (hub carretel)
│       │   └── screens.jsx        → histórico, orçamento PDF e ajustes
│       └── app/                   → shell, navegação e overlays globais
│           ├── app.jsx            → roteamento e layout principal
│           ├── cmdk.jsx           → command palette
│           ├── nfc-modal.jsx      → modal de leitura NFC
│           └── tweaks-app.jsx     → painel de ajustes visuais
├── docker/
│   └── nginx.conf                 → config nginx (alternativa ao Node)
├── data/                          → banco SQLite (gitignored)
├── server.js                      → servidor Express + API REST
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## 🐳 Docker

```bash
# build + run
docker compose up -d --build

# logs
docker compose logs -f

# parar
docker compose down

# backup do banco
docker run --rm -v hfsto_data:/data alpine \
  tar czf - /data/hphisto.db > backup-$(date +%F).tar.gz
```

## 📜 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais detalhes.

---

<div align="center">

🔨 *Feito na forja* · **HΦSTO**

</div>
