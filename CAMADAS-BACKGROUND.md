# 🎨 GUIA DE CAMADAS DE FUNDO - ZÆRØ BOT

## 📊 ESTRUTURA DE CAMADAS

A interface usa um sistema de camadas (layers) para criar profundidade visual:

```
┌─────────────────────────────────────────┐
│  Z-INDEX 10: Conteúdo                  │  ← Frente
│  ─────────────────────────────────────  │
│  Z-INDEX 5: Partículas                 │
│  ─────────────────────────────────────  │
│  Z-INDEX 1: anime-characters-bg.jpg    │
│  ─────────────────────────────────────  │
│  Z-INDEX 0: anime-bg.jpg               │  ← Fundo
└─────────────────────────────────────────┘
```

---

## 🎯 CAMADAS EXPLICADAS

### **Camada 0 - Fundo Base** (anime-bg.jpg)
```css
body::before {
  z-index: 0;
  opacity: 0.12;
  filter: blur(2px);
  animation: float-bg 20s ease-in-out infinite;
}
```

**Características:**
- ✅ Mais atrás de todas
- ✅ Desfoque leve (2px)
- ✅ Opacidade baixa (12%)
- ✅ Animação suave de flutuação (20s)
- ✅ Cobre toda a tela
- ✅ Fixa (não rola com o conteúdo)

**Função:**
- Criar atmosfera de fundo
- Base visual do tema anime
- Não compete com o conteúdo

---

### **Camada 1 - Personagens** (anime-characters-bg.jpg)
```css
body::after {
  z-index: 1;
  opacity: 0.08;
  background-position: center bottom;
  background-blend-mode: overlay;
  mix-blend-mode: soft-light;
  animation: float-bg 15s ease-in-out infinite reverse;
}
```

**Características:**
- ✅ Na frente do fundo base
- ✅ Opacidade muito baixa (8%)
- ✅ Posicionada na parte inferior
- ✅ Blend modes para integração suave
- ✅ Animação reversa (15s)
- ✅ Efeito de luz suave

**Função:**
- Adicionar profundidade
- Personagens aparecem sutilmente
- Criar movimento visual

---

### **Camada 5 - Partículas**
```css
#particles {
  z-index: 5;
  pointer-events: none;
}
```

**Características:**
- ✅ Entre os backgrounds e o conteúdo
- ✅ Partículas vermelhas flutuantes
- ✅ Animação independente
- ✅ Não interfere com cliques

---

### **Camada 10 - Conteúdo**
```css
.container {
  z-index: 10;
}
```

**Características:**
- ✅ Sempre no topo
- ✅ Totalmente interativo
- ✅ Legível sobre todas as camadas

---

## 🎨 PERSONALIZAÇÃO

### **Ajustar Opacidade**

**Fundo base mais visível:**
```css
body::before {
  opacity: 0.20; /* Era 0.12 */
}
```

**Personagens mais visíveis:**
```css
body::after {
  opacity: 0.15; /* Era 0.08 */
}
```

---

### **Remover Desfoque**

```css
body::before {
  filter: none; /* Remove blur */
}
```

---

### **Mudar Posição dos Personagens**

```css
body::after {
  background-position: center top; /* Topo */
  /* ou */
  background-position: right bottom; /* Canto direito */
  /* ou */
  background-position: left center; /* Esquerda */
}
```

---

### **Desativar Animações**

```css
body::before,
body::after {
  animation: none;
}
```

---

### **Trocar Imagens**

**Substituir anime-bg.jpg:**
```css
body::before {
  background-image: url('assets/sua-imagem-1.jpg');
}
```

**Substituir anime-characters-bg.jpg:**
```css
body::after {
  background-image: url('assets/sua-imagem-2.jpg');
}
```

---

## ✨ EFEITOS ESPECIAIS

### **Efeito Parallax**

Adicione a classe `parallax-effect` no `<body>`:

```html
<body class="parallax-effect">
```

Isso ativa:
```css
body.parallax-effect::before {
  transform: translateZ(-1px) scale(1.5);
}

body.parallax-effect::after {
  transform: translateZ(-0.5px) scale(1.2);
}
```

**Resultado:**
- Camadas se movem em velocidades diferentes
- Sensação de profundidade 3D

---

### **Animação de Flutuação**

Já ativa por padrão:

```css
@keyframes float-bg {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-10px) scale(1.02);
  }
}

body::before {
  animation: float-bg 20s ease-in-out infinite;
}

body::after {
  animation: float-bg 15s ease-in-out infinite reverse;
}
```

**Efeito:**
- Movimento sutil para cima e para baixo
- Camadas se movem em ritmos diferentes
- Cria dinamismo visual

---

## 📱 RESPONSIVIDADE

### **Ajustes Automáticos em Mobile**

```css
@media (max-width: 768px) {
  /* Reduz opacidade em telas pequenas */
  body::before {
    opacity: 0.08; /* Menos visível */
  }

  body::after {
    opacity: 0.05; /* Muito sutil */
  }
}
```

**Motivo:**
- Telas pequenas ficam muito poluídas
- Foco no conteúdo é mais importante
- Melhor legibilidade

---

## 🎭 BLEND MODES EXPLICADOS

### **background-blend-mode: overlay**
```css
body::after {
  background-blend-mode: overlay;
}
```

**Efeito:**
- Mistura cores do fundo com o preto
- Áreas claras ficam mais brilhantes
- Áreas escuras ficam mais escuras

---

### **mix-blend-mode: soft-light**
```css
body::after {
  mix-blend-mode: soft-light;
}
```

**Efeito:**
- Mistura suavemente com camadas abaixo
- Iluminação suave e natural
- Não sobrepõe agressivamente

---

## 🔧 CASOS DE USO

### **1. Fundo Mais Dramático**

```css
body::before {
  opacity: 0.25;
  filter: blur(3px) brightness(0.7);
}

body::after {
  opacity: 0.18;
  filter: contrast(1.2);
}
```

---

### **2. Fundo Minimalista**

```css
body::before {
  opacity: 0.05;
  filter: blur(5px);
}

body::after {
  opacity: 0.03;
}
```

---

### **3. Sem Imagens de Fundo**

```css
body::before,
body::after {
  display: none;
}
```

Ou:
```css
body::before,
body::after {
  background-image: none;
  background: linear-gradient(135deg, #1a0000 0%, #0b0b0b 100%);
}
```

---

### **4. Gradiente Sobre Imagens**

```css
body::before {
  background-image:
    linear-gradient(135deg, rgba(235, 22, 22, 0.1), transparent),
    url('assets/anime-bg.jpg');
}
```

---

## 🎨 TEMAS ALTERNATIVOS

### **Tema Azul:**

```css
:root {
  --red: #1e90ff;
  --red-light: #4169e1;
  --red-glow: #1e90ff66;
}

body::before {
  filter: blur(2px) hue-rotate(180deg);
}

body::after {
  filter: hue-rotate(180deg);
}
```

---

### **Tema Verde:**

```css
:root {
  --red: #00ff88;
  --red-light: #00ffaa;
  --red-glow: #00ff8866;
}

body::before {
  filter: blur(2px) hue-rotate(90deg);
}

body::after {
  filter: hue-rotate(90deg);
}
```

---

## 🐛 TROUBLESHOOTING

### **Problema: Imagens não aparecem**

**Soluções:**
1. Verificar caminho das imagens:
   ```
   public/assets/anime-bg.jpg
   public/assets/anime-characters-bg.jpg
   ```

2. Verificar permissões dos arquivos

3. Limpar cache do navegador (Ctrl+Shift+Del)

4. Ver console do navegador (F12) para erros

---

### **Problema: Fundo muito escuro**

**Solução:**
```css
body::before,
body::after {
  filter: brightness(1.3);
}
```

---

### **Problema: Fundo muito poluído**

**Solução:**
```css
body::before {
  opacity: 0.05; /* Reduzir */
}

body::after {
  opacity: 0.03; /* Reduzir */
}
```

---

### **Problema: Texto não legível**

**Solução:**
```css
.container {
  background: rgba(11, 11, 11, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
}
```

---

## 📊 PERFORMANCE

### **Otimizações Aplicadas:**

1. ✅ `position: fixed` - Não recalcula no scroll
2. ✅ `pointer-events: none` - Não interfere com cliques
3. ✅ `will-change` - Otimiza animações (parallax)
4. ✅ Imagens comprimidas
5. ✅ CSS minificado em produção

### **Dicas:**

- Use imagens otimizadas (< 200KB)
- Evite blur muito alto (< 5px)
- Limite animações complexas
- Teste em dispositivos móveis

---

## 🎯 EXEMPLOS PRÁTICOS

### **Landing Page Estilo Netflix:**

```css
body::before {
  background-image: url('assets/anime-bg.jpg');
  opacity: 0.3;
  filter: blur(0px);
}

body::after {
  background-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(11, 11, 11, 0.8) 50%,
    rgba(11, 11, 11, 1) 100%
  );
  opacity: 1;
}
```

---

### **Estilo Glassmorphism:**

```css
body::before {
  opacity: 0.2;
  filter: blur(10px) saturate(180%);
}

.container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## 📚 REFERÊNCIAS

- [MDN - CSS Blend Modes](https://developer.mozilla.org/en-US/docs/Web/CSS/blend-mode)
- [CSS Tricks - Mix Blend Mode](https://css-tricks.com/almanac/properties/m/mix-blend-mode/)
- [Web.dev - Backdrop Filter](https://web.dev/backdrop-filter/)

---

**🎨 Agora você tem controle total sobre as camadas de fundo!**

Experimente diferentes combinações e crie seu estilo único.
