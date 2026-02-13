# 🔍 ANÁLISE DE CONFLITOS CSS

## ⚠️ CONFLITOS ENCONTRADOS

### **1. Partículas (#particles)**

**styles.css (index.html):**
```css
#particles {
  z-index: 1;  /* Atrás do conteúdo */
}
```

**connect.css (connect.html):**
```css
#particles {
  z-index: 7;  /* Entre personagens e conteúdo */
}
```

**❌ PROBLEMA:** Valores conflitantes de z-index
**✅ SOLUÇÃO:** connect.css sobrescreve por ser carregado depois

---

### **2. Container (.container)**

**styles.css:**
```css
.container {
  max-width: 1120px;
  z-index: 2;
}
```

**connect.css:**
```css
.container {
  max-width: 900px;
  z-index: 10;
}
```

**❌ PROBLEMA:** Larguras e z-index diferentes
**✅ SOLUÇÃO:** Usar classes específicas

---

### **3. Imagens (img)**

**styles.css:**
```css
img {
  display: block;
  max-width: 100%;
}
```

**❌ PROBLEMA:** `display: block` pode afetar alinhamento
**✅ CAUSA DO LOGO DESALINHADO:** Logo vira block sem margin auto

---

### **4. Reset CSS**

**styles.css:**
```css
* {
  box-sizing: border-box;
}
```

**connect.css:**
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

**❌ PROBLEMA:** connect.css é mais agressivo (zera tudo)
**✅ IMPACTO:** Pode afetar espaçamentos

---

## 🛠️ CORREÇÕES NECESSÁRIAS

### **1. Logo Desalinhado**

**Problema:**
```css
img {
  display: block;  /* Remove inline, pode desalinhar */
  max-width: 100%;
}

.logo-container {
  margin: 0 auto 20px;  /* Centraliza o container */
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: cover;  /* Mas img pode não centralizar */
}
```

**Solução:**
```css
.logo {
  display: block;
  margin: 0 auto;  /* Força centralização */
}
```

---

### **2. Conflito de Container**

**Solução:** Renomear classes

**index.html (landing page):**
```css
.landing-container {
  max-width: 1120px;
  z-index: 2;
}
```

**connect.html (conexão):**
```css
.connect-container {
  max-width: 900px;
  z-index: 10;
}
```

---

### **3. Z-index Padronizado**

| Elemento | Valor | Descrição |
|----------|-------|-----------|
| body::before | 0 | Fundo anime-bg.jpg |
| #particles (index) | 1 | Partículas landing |
| body::after | 3 | Personagens anime-characters |
| #particles (connect) | 7 | Partículas conexão |
| .container | 10 | Conteúdo sempre no topo |

---

## ✅ PLANO DE CORREÇÃO

1. ✅ Corrigir centralização do logo
2. ✅ Separar estilos de container
3. ✅ Padronizar z-index
4. ✅ Evitar conflitos globais
5. ✅ Documentar hierarquia

---

## 📊 HIERARQUIA ATUAL

```
Landing Page (index.html + styles.css):
┌──────────────────────────┐
│ .container (z-2)         │
│ #particles (z-1)         │
│ .wrap (z-2)              │
└──────────────────────────┘

Connect Page (connect.html + connect.css):
┌──────────────────────────┐
│ .container (z-10)        │
│ #particles (z-7)         │
│ body::after (z-3)        │
│ body::before (z-0)       │
└──────────────────────────┘
```

---

## 🎯 RECOMENDAÇÕES

1. **Usar scoped CSS** - Classes únicas por página
2. **BEM Methodology** - `.connect__logo`, `.landing__container`
3. **CSS Modules** - Se usar build tool
4. **Prefixos** - `.connect-*` vs `.landing-*`

---

## 🔧 CORREÇÕES IMPLEMENTADAS

Ver próximo commit com todas as correções aplicadas.
