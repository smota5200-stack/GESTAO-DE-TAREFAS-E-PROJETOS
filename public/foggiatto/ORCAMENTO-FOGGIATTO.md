# Orçamento de Uniformes — Foggiatto Engenharia Brasil

**Orçamento nº** 001/2026 · **Data** 25/11/2026 · **Validade** 5 dias
**Aplicação** DTF Têxtil · frente e costas · **Grade** P ao GG

---

## 1. Peças

| Peça | Cores | Aplicações |
|---|---|---|
| Camiseta | Azul-marinho, Cinza | Frente e costas |
| Boné | Azul-marinho, Cinza | Frente e traseira |
| Polo | — | Apenas na tabela de valores |

Mockups em `mockups/`. Arte para impressão em `arte/`.

---

## 2. Facas e medidas dos logos

Medidas em centímetros. **Faca** = contorno de corte do filme DTF com **3 mm de sangria** em volta da arte.

| Peça / posição | Arte (L × A) | Faca (+3 mm) | Área do filme | Posicionamento |
|---|---|---|---|---|
| Camiseta · frente | 24,0 × 18,7 | 24,6 × 19,3 | 475 cm² | Centralizado, 7 cm abaixo da gola |
| Camiseta · costas | 28,0 × 21,8 | 28,6 × 22,4 | 641 cm² | Centralizado, 10 cm abaixo da gola |
| Boné · frente | 10,0 × 7,8 | 10,6 × 8,4 | 89 cm² | Centro do painel frontal, 1,2 cm acima da aba |
| Boné · traseira | 6,0 × 4,7 | 6,6 × 5,3 | 35 cm² | Centralizado, 1 cm acima da abertura do regulador |

- Mesma arte para todos os tamanhos da grade P ao GG.
- Filme por kit (camiseta frente + costas): **1.116 cm²**
- Filme por kit (boné frente + traseira): **124 cm²**

---

## 3. Tabela de valores (unidade) — P ao GG

> Preencher com o valor da peça + mão de obra.

| Produto | Sem DTF aplicado | Com DTF aplicado | Diferença (DTF) |
|---|---|---|---|
| Polo (P ao GG) | R$ ______ | R$ ______ | R$ ______ |
| Camiseta (P ao GG) | R$ ______ | R$ ______ | R$ ______ |
| Boné (tamanho único) | R$ ______ | R$ ______ | R$ ______ |

Não há acréscimo por tamanho dentro da grade P ao GG.

---

## 4. Condições

- **Pagamento:** 50% na aprovação do pedido e 50% restantes na entrega.
- **Prazo de entrega:** 10 dias, a contar da confirmação do pedido.
- **Validade deste orçamento:** 5 dias.
- Cores das peças conforme visualização; variações leves de tom podem ocorrer entre tela e produto final.
- Pedido confirmado mediante aprovação deste orçamento.

---

## 5. Conteúdo do pacote

```
orcamento-foggiatto/
├─ ORCAMENTO-FOGGIATTO.md            ← este documento
├─ Orcamento Foggiatto (offline).html ← abre direto no navegador, sem internet
├─ projeto/                           ← arquivos-fonte editáveis
│  ├─ Orcamento Foggiatto 3D.dc.html
│  ├─ support.js
│  └─ assets/ (recortes .webp e logos)
├─ mockups/                           ← fotos das peças (frente e costas)
└─ arte/                              ← logo para impressão DTF
```

### Como usar o HTML
- Abra **Orcamento Foggiatto (offline).html** no navegador.
- **Visualização 3D:** a peça gira sozinha; arraste para girar 360°. Botões para Camiseta/Boné, cor, Frente/Costas, Faca e Medidas.
- **Tabela de valores:** campos em branco para digitar (formato 49,90). O simulador calcula total, entrada (50%) e restante.
- Os valores digitados não ficam salvos ao recarregar a página.

### Observações
- A traseira do boné está em desenho ilustrativo (sem foto de referência da parte de trás).
- As costas da camiseta foram montadas a partir da foto da frente com a arte aplicada.
