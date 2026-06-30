
# Redesign do cardápio (mobile-first) + Combos + Pizza mista

Inspirado no layout Takeat enviado: categorias circulares no topo + cards grandes "estilo iFood/Rappi" com imagem destacada, tempo de preparo e badge promo.

## 1. Novo layout do cardápio (`src/routes/index.tsx`)

```text
┌─────────────────────────────────┐
│  Logo / nome restaurante  🇧🇷   │  ← header existente
├─────────────────────────────────┤
│ 🔍 Buscar no cardápio           │
├─────────────────────────────────┤
│  ⭕    ⭕    ⭕    ⭕    ⭕      │  ← chips circulares
│ Combo Pizza Petisco Burger Bebida│    (foto+nome, sem preço)
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │ [IMG grande full-width]   │  │  ← card categoria
│  │ Pizzas Salgadas           │  │     hero
│  │ 🕐 35 min                 │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ [IMG] Combo Família       │  │
│  │ 🕐 40 min · a partir de R$│  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- **Chips circulares no topo** (scroll horizontal, sticky): foto da categoria dentro de círculo + nome embaixo. Sem preço. Clica → rola até a seção.
- **Cards de categoria estilo hero**: imagem grande full-width, nome, tempo de preparo, indicador "a partir de" só quando faz sentido (não para pizza/combo montável).
- **Dentro da categoria**: lista de produtos no formato atual (card horizontal com imagem + descrição + preço). Para pizza, o card abre o PizzaBuilder direto.
- **Categorias precisam de**: `image_url` (já existe), `prep_time_minutes` (novo, opcional).

## 2. Pizza mista doce + salgada

Hoje o `PizzaBuilder` filtra sabores por categoria. Mudança:

- Adicionar coluna `category_group` em `categories` (ou reaproveitar `kind`): valores `regular | pizza_salgada | pizza_doce | combo`.
- No PizzaBuilder, na etapa "Sabores", mostrar **abas Salgados / Doces** quando houver as duas. Cliente pode escolher 2 ou 3 sabores misturando livremente até o limite do tamanho.
- A regra de preço (maior valor dos sabores) continua igual — só permite cruzar categorias.
- Tamanhos e bordas são compartilhados entre doce e salgada (sem mudança de schema aqui).

## 3. Combos como categoria especial

Novo `category.kind = "combo"`. Produto de combo (`product_type = "combo"`) tem:

- Preço fixo (`price`) — já existe.
- Lista de itens inclusos (`combo_items` jsonb): `[{ name, qty, note }]` para exibir no card e no resumo do carrinho. Sem builder complexo nesta etapa — é um produto fixo com descrição estruturada.
- Aparece no topo (chips) e como seção destacada. Card maior que produtos normais.

(Combos montáveis com escolha de sabor podem vir numa próxima etapa — começamos com combos fixos prontos.)

## 4. Mudanças técnicas

**Banco (migração única):**
- `ALTER TABLE categories ADD COLUMN prep_time_minutes int`
- `ALTER TYPE category_kind ADD VALUE 'pizza_doce'` e `'combo'` (renomeia `pizza` → `pizza_salgada` via update + deprecação? — usar `pizza` como salgada por padrão e adicionar `pizza_doce` + `combo`).
- `ALTER TYPE product_type ADD VALUE 'combo'`
- `ALTER TABLE products ADD COLUMN combo_items jsonb DEFAULT '[]'::jsonb`
- Seeds opcionais de 2 combos exemplo.

**Frontend:**
- `src/components/menu/CategoryChips.tsx` (novo) — chips circulares scrolláveis sticky.
- `src/components/menu/CategoryHeroCard.tsx` (novo) — card grande de categoria.
- `src/components/menu/ComboCard.tsx` (novo) — card de combo destacado com lista de itens.
- `src/components/menu/PizzaBuilder.tsx` — etapa 2 ganha tabs Salgada/Doce quando houver ambas; busca sabores por `product_type = pizza_flavor` cruzando categorias `pizza_salgada` e `pizza_doce`.
- `src/routes/index.tsx` — novo layout com chips no topo + cards hero.
- `src/routes/_protected.admin.categorias.tsx` — adicionar campo "tempo de preparo" e opções `pizza_doce` / `combo` no seletor de tipo.
- `src/routes/_protected.admin.produtos.tsx` — quando produto é tipo `combo`, mostrar editor de "itens inclusos" (lista simples nome+qtd).

## 5. Ordem de entrega

1. Migração (kind, combo, prep_time, combo_items)
2. Admin: categoria (tipo + tempo) e produto (combo + itens)
3. Cardápio: CategoryChips + CategoryHeroCard + ComboCard + novo `index.tsx`
4. PizzaBuilder: tabs doce/salgada, busca cruzando categorias

## Perguntas rápidas

1. **Combos**: começamos com combos fixos (preço fechado, itens já definidos) ou você precisa de combos montáveis (cliente escolhe 1 pizza + 1 bebida) já nesta etapa?
2. **Chips no topo**: mostrar todas as categorias ou só as "destaque" (combos + pizza + as 4 mais pedidas)?
3. **Tempo de preparo**: deixo opcional por categoria, e quando vazio simplesmente não mostro o "🕐 X min"?
