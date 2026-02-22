# 🎨 GUIA: AJUSTAR POSIÇÃO DOS PERSONAGENS

## 📍 ONDE ESTÁ O CÓDIGO

**Arquivo:** `public/connect.css`
**Linha:** `142`
**Elemento:** `body::after`

```css
/* Linha 136-150 */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('assets/anime-characters-bg.jpg');
  background-size: cover;
  background-position: center bottom;  /* ← AQUI! Linha 142 */
  background-repeat: no-repeat;
  opacity: 0.22;
  z-index: 3;
  pointer-events: none;
  background-blend-mode: normal;
  mix-blend-mode: screen;
  filter: contrast(1.15) saturate(1.3) brightness(1.1);
}
```

---

## 🎯 OPÇÕES DE POSICIONAMENTO

### **1. Posições Pré-Definidas (Palavras-chave)**

```css
/* VERTICAL (primeiro valor) | HORIZONTAL (segundo valor) */

/* Topo */
background-position: center top;      /* Centro horizontal, topo */
background-position: left top;        /* Esquerda, topo */
background-position: right top;       /* Direita, topo */

/* Centro */
background-position: center center;   /* Centro total */
background-position: left center;     /* Esquerda, centro vertical */
background-position: right center;    /* Direita, centro vertical */

/* Embaixo (ATUAL) */
background-position: center bottom;   /* Centro, embaixo ← ATUAL */
background-position: left bottom;     /* Esquerda, embaixo */
background-position: right bottom;    /* Direita, embaixo */
```

---

### **2. Valores Customizados (Pixels ou Porcentagem)**

```css
/* Usando porcentagem */
background-position: 50% 0%;     /* Centro horizontal, topo */
background-position: 50% 25%;    /* Centro horizontal, 25% do topo */
background-position: 50% 50%;    /* Centro total */
background-position: 50% 75%;    /* Centro horizontal, 75% do topo */
background-position: 50% 100%;   /* Centro horizontal, embaixo */

/* Usando pixels */
background-position: center 0px;     /* Centro, sem margem do topo */
background-position: center 50px;    /* Centro, 50px do topo */
background-position: center 100px;   /* Centro, 100px do topo */
background-position: center -50px;   /* Centro, 50px ACIMA do topo */

/* Usando calc() para ajustes dinâmicos */
background-position: center calc(100% - 100px);  /* 100px acima do fundo */
background-position: center calc(50% + 50px);    /* Centro + 50px */
```

---

### **3. Múltiplos Valores (Offset)**

```css
/* Sintaxe: horizontal offset | vertical offset */
background-position: center 20%;      /* 20% do topo */
background-position: center -10%;     /* 10% acima do topo (move pra cima) */
background-position: right 10% top 30%;  /* Direita com offset */
```

---

## 🎨 EXEMPLOS PRÁTICOS

### **Subir Personagens (Menos margin-top)**

```css
/* Opção 1: Usar porcentagem menor */
background-position: center 30%;  /* Sobe 20% (era 50% bottom = ~50%) */

/* Opção 2: Usar pixels negativos */
background-position: center -100px;  /* Sobe 100px */

/* Opção 3: Usar calc() */
background-position: center calc(100% - 200px);  /* 200px acima do fundo */

/* Opção 4: Mudar para top */
background-position: center top;  /* Cola no topo */
```

---

### **Descer Personagens (Mais margin-top)**

```css
/* Opção 1: Manter bottom (ATUAL) */
background-position: center bottom;  /* Já está embaixo */

/* Opção 2: Usar porcentagem maior */
background-position: center 80%;  /* Desce mais */

/* Opção 3: Forçar 100% */
background-position: center 100%;  /* Cola embaixo */
```

---

### **Centralizar Verticalmente**

```css
/* Opção 1: Center center */
background-position: center center;

/* Opção 2: 50% 50% */
background-position: 50% 50%;
```

---

## 📐 VALORES COMUNS

| Posição Desejada | Código |
|------------------|--------|
| **No topo** | `center top` ou `center 0%` |
| **Pouco abaixo do topo** | `center 20%` ou `center 100px` |
| **Centro** | `center center` ou `center 50%` |
| **Pouco acima do fundo** | `center 80%` ou `center calc(100% - 100px)` |
| **No fundo (ATUAL)** | `center bottom` ou `center 100%` |
| **Acima do topo** | `center -10%` ou `center -50px` |

---

## 🔧 COMO APLICAR

### **Método 1: Editar Diretamente**

Abra: `public/connect.css`
Linha: `142`

**ANTES:**
```css
background-position: center bottom;
```

**DEPOIS (exemplo - centralizar):**
```css
background-position: center center;
```

---

### **Método 2: Adicionar Comentário com Opções**

```css
body::after {
  /* ... */

  /* POSIÇÃO DOS PERSONAGENS - Ajuste aqui: */
  background-position: center bottom;  /* Padrão: embaixo */

  /* Opções:
   * center top       - No topo
   * center 30%       - 30% do topo
   * center center    - Centro
   * center bottom    - Embaixo (atual)
   * center -50px     - 50px acima do topo
   */

  /* ... */
}
```

---

## 🎯 AJUSTES RECOMENDADOS

### **Para Personagens Aparecerem Mais**

```css
/* Subir personagens para ficarem mais visíveis */
background-position: center 40%;  /* OU */
background-position: center top;
```

---

### **Para Personagens Ficarem Embaixo**

```css
/* Manter embaixo (ATUAL) */
background-position: center bottom;
```

---

### **Para Centralizar Tudo**

```css
/* Centro perfeito */
background-position: center center;
```

---

## 📱 AJUSTE RESPONSIVO

Você pode ter posições diferentes para mobile:

```css
/* Desktop */
body::after {
  background-position: center bottom;
}

/* Mobile */
@media (max-width: 768px) {
  body::after {
    background-position: center 60%;  /* Diferente no mobile */
  }
}
```

---

## 🎨 EXEMPLOS VISUAIS

### **center top:**
```
┌─────────────────────┐
│ [Personagens aqui]  │ ← Topo
│                     │
│                     │
│                     │
└─────────────────────┘
```

### **center center:**
```
┌─────────────────────┐
│                     │
│ [Personagens aqui]  │ ← Centro
│                     │
└─────────────────────┘
```

### **center bottom (ATUAL):**
```
┌─────────────────────┐
│                     │
│                     │
│                     │
│ [Personagens aqui]  │ ← Embaixo
└─────────────────────┘
```

### **center 30%:**
```
┌─────────────────────┐
│                     │
│ [Personagens aqui]  │ ← 30% do topo
│                     │
│                     │
└─────────────────────┘
```

---

## 🔍 TESTAR VALORES NO NAVEGADOR

1. **Abra DevTools** (F12)
2. **Inspecione** o `body::after`
3. **Edite** `background-position` em tempo real
4. **Teste valores** até achar o ideal
5. **Copie** o valor final para o CSS

---

## 💡 DICAS IMPORTANTES

### **1. Combine com background-size**

```css
body::after {
  background-size: cover;           /* Cobre tudo */
  background-position: center 30%;  /* Posição customizada */
}

/* OU */

body::after {
  background-size: contain;         /* Cabe dentro */
  background-position: center bottom;
}
```

---

### **2. Use calc() para Offsets Precisos**

```css
/* 100px acima do fundo */
background-position: center calc(100% - 100px);

/* 50px abaixo do centro */
background-position: center calc(50% + 50px);
```

---

### **3. Valores Negativos Movem para Cima**

```css
background-position: center -50px;  /* Sobe 50px */
background-position: center -10%;   /* Sobe 10% */
```

---

## 📝 CÓDIGO COMPLETO COMENTADO

```css
/* Camada 2 (FRENTE - Personagens Visíveis) - anime-characters-bg.jpg */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('assets/anime-characters-bg.jpg');
  background-size: cover;

  /* ═══════════════════════════════════════════════════════
     AJUSTE DE POSIÇÃO VERTICAL - Mude aqui:
     ═══════════════════════════════════════════════════════

     OPÇÕES:
     - center top       → Topo
     - center 20%       → 20% do topo
     - center center    → Centro
     - center 60%       → 60% do topo
     - center bottom    → Fundo (ATUAL)
     - center -50px     → 50px acima do topo

     CUSTOMIZADO:
     - center 30%                    → 30% do topo
     - center calc(100% - 100px)     → 100px acima do fundo
  */
  background-position: center bottom;  /* ← MUDE AQUI */

  background-repeat: no-repeat;
  opacity: 0.22;
  z-index: 3;
  pointer-events: none;
  background-blend-mode: normal;
  mix-blend-mode: screen;
  filter: contrast(1.15) saturate(1.3) brightness(1.1);
}
```

---

## 🚀 QUICK CHANGES (Mudanças Rápidas)

### **Subir Personagens:**
```css
background-position: center 30%;  /* Linha 142 */
```

### **Centralizar:**
```css
background-position: center center;  /* Linha 142 */
```

### **Subir Muito:**
```css
background-position: center top;  /* Linha 142 */
```

### **Ajuste Fino:**
```css
background-position: center calc(100% - 150px);  /* Linha 142 */
```

---

## 🎯 RECOMENDAÇÃO

Para personagens mais visíveis:

```css
/* Em: public/connect.css, linha 142 */
background-position: center 40%;  /* Subir para 40% do topo */
```

---

**📍 Resumo: Edite `public/connect.css`, linha 142, propriedade `background-position`!**

Experimente os valores acima até achar a posição perfeita! 🎨
