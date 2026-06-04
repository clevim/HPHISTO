<div align="center">

# 🔨 HΦSTO

### Forja de preços para impressão 3D

Calculadora de custos completa para serviços de impressão 3D — do filamento ao preço de venda, com perfis de impressora, controle de estoque, agenda de produção e orçamentos em PDF.

</div>

---

## ✨ Sobre

**HΦSTO** (lê-se *Hefesto*, o deus grego da forja) é um web app que transforma o cálculo de custos de impressão 3D em algo rápido, visual e confiável. Nasceu da modernização de uma velha planilha de Excel e virou uma ferramenta completa de precificação para makers e estúdios.

Tudo roda no navegador, **sem servidor e sem login** — os dados ficam salvos localmente no seu dispositivo.

## 🧮 Recursos

- **Calculadora de custos** (modo simples e detalhado) com cálculo ao vivo de:
  - Material, energia, depreciação, retorno do investimento, manutenção, provisão de falhas, acabamento
  - Mão de obra, modelagem, custos fixos rateados, consumíveis, embalagem e frete
  - Margem de lucro ajustável + taxa de cartão/marketplace
- **3 formas de informar o filamento**: peso (g), comprimento (m) ou **leitura de G-code** (Cura, PrusaSlicer, OrcaSlicer, Bambu)
- **Visualização da peça** na câmara de impressão, gerada a partir das camadas do G-code
- **Perfis de impressora** — potência, valor, vida útil, payback, % de falhas e manutenção
- **Gestão de filamentos** — marca, cor, densidade, diâmetro e **controle de estoque** por rolo com alerta de estoque baixo
- **Agenda de produção** — painel impressora × dia com carga de trabalho e alerta de sobrecarga
- **Histórico de orçamentos** e geração de **orçamento em PDF** para o cliente
- **Vínculo orçamento → impressão** — agende a produção direto a partir de um orçamento salvo
- **Multi-idioma** (Português / English) e **multi-moeda** (R$, US$, €, £) com formatação local
- **Temas e cor principal personalizáveis** (Console / Blueprint / Papel)
- **Responsivo** — funciona no desktop e no celular

## 🚀 Como usar

Por ser um app estático, basta abrir o `index.html`:

```bash
# clone o repositório
git clone https://github.com/SEU-USUARIO/hefesto-3d.git
cd hefesto-3d

# abra direto no navegador, ou sirva localmente:
python3 -m http.server 8000
# acesse http://localhost:8000
```

> 💡 Recomendado servir via `http.server` (ou similar) para o carregamento correto dos módulos.

## 🛠️ Stack

- **React 18** (via Babel standalone, sem build step)
- **JavaScript / JSX** puro, sem dependências de bundler
- **CSS** com variáveis e `oklch` para o sistema de temas
- **localStorage** para persistência

## 📂 Estrutura

```
index.html        → ponto de entrada
styles.css        → design system e temas
js/
  data.js         → dados padrão (materiais, impressoras, presets)
  i18n.js         → traduções e formatação de moeda/data
  calc.js         → motor de cálculo + leitor de G-code
  store.jsx       → estado global (localStorage)
  ui.jsx          → componentes base + ícones
  calculator.jsx  → tela da calculadora
  buildviz.jsx    → visualização 3D da peça
  manage.jsx      → impressoras e materiais
  calendar.jsx    → agenda de produção
  screens.jsx     → histórico, orçamento PDF e ajustes
  dashboard.jsx   → painel inicial (hub carretel)
  app.jsx         → navegação e shell
```

## 📜 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais detalhes.

---

<div align="center">

🔨 *Feito na forja* · **HΦSTO**

</div>
