const features = [
  ["SRCH", "Busca de Anime", "Pesquise qualquer anime e receba informacoes completas."],
  ["IMG", "Wallpapers", "Wallpapers HD de todos os animes populares."],
  ["STK", "Stickers", "Crie e receba stickers anime incriveis."],
  ["CHAR", "Personagens", "Informacoes detalhadas de personagens anime."],
  ["EPI", "Episodios", "Acompanhe novos episodios e temporadas."],
  ["MUS", "Openings", "Ouva e descubra openings e endings."],
  ["TOP", "Rankings", "Veja os animes mais populares do momento."],
  ["FAST", "Rapido", "Respostas instantaneas para todos os comandos."],
];

const gallery = [
  ["Naruto", "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=300&fit=crop"],
  ["Dragon Ball", "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=300&fit=crop"],
  ["One Piece", "https://images.unsplash.com/photo-1607604276583-3e2ef5cc0303?w=400&h=300&fit=crop"],
  ["Attack on Titan", "https://images.unsplash.com/photo-1541562232579-512a21360020?w=400&h=300&fit=crop"],
  ["Demon Slayer", "https://images.unsplash.com/photo-1560972550-aba3456b5564?w=400&h=300&fit=crop"],
  ["Jujutsu Kaisen", "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&h=300&fit=crop"],
];

const steps = [
  ["01", "APP", "Abra o WhatsApp", "Abra seu WhatsApp no celular ou computador."],
  ["02", "CHAT", "Adicione o Bot", "Clique no botao acima e inicie uma conversa."],
  ["03", "GO", "Use os Comandos", "Digite os comandos e receba conteudo anime."],
];

function renderFeatures() {
  const root = document.getElementById("features");
  if (!root) {
    return;
  }

  root.innerHTML = features
    .map(
      (f, i) =>
        `<article class="card" data-r style="--d:${i * 70}ms"><div class="i">${f[0]}</div><h3>${f[1]}</h3><p>${f[2]}</p></article>`,
    )
    .join("");
}

function renderGallery() {
  const root = document.getElementById("gallery");
  if (!root) {
    return;
  }

  root.innerHTML = gallery
    .map(
      (g, i) =>
        `<article class="gitem" data-r style="--d:${i * 90}ms"><img src="${g[1]}" alt="${g[0]}" loading="lazy"><div class="ov"><span>${g[0]}</span></div></article>`,
    )
    .join("");
}

function renderSteps() {
  const root = document.getElementById("steps");
  if (!root) {
    return;
  }

  root.innerHTML = steps
    .map(
      (s, i) =>
        `<article class="card step" data-r style="--d:${i * 140}ms"><span class="n">${s[0]}</span><div class="i i-center">${s[1]}</div><h3>${s[2]}</h3><p>${s[3]}</p></article>`,
    )
    .join("");
}

function setupWhatsAppButton() {
  const button = document.getElementById("wa");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    window.open("https://wa.me/", "_blank", "noopener");
  });
}

function setupConnectButton() {
  const button = document.getElementById("btnConnect");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    window.location.href = "/connect";
  });
}

function setupParticles() {
  const particlesRoot = document.getElementById("particles");
  if (!particlesRoot) {
    return;
  }

  const colors = ["#ff1919", "#ff5b1a", "#ff8c1a", "#ff3f3f", "#e31212"];

  for (let i = 0; i < 50; i += 1) {
    const particle = document.createElement("span");
    const size = Math.random() * 6 + 2;
    const alpha = Math.floor((Math.random() * 0.7 + 0.2) * 255)
      .toString(16)
      .padStart(2, "0");
    const color = colors[Math.floor(Math.random() * colors.length)];

    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.animationDuration = `${Math.random() * 8 + 5}s`;
    particle.style.animationDelay = `${Math.random() * 10}s`;
    particle.style.background = `radial-gradient(circle, ${color}${alpha}, transparent 70%)`;

    if (size > 5) {
      particle.style.filter = "blur(1px)";
    }

    particlesRoot.appendChild(particle);
  }
}

function setupRevealAnimation() {
  const targets = document.querySelectorAll("[data-r]");

  if (!("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("v"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("v");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );

  targets.forEach((target) => observer.observe(target));
}

function init() {
  renderFeatures();
  renderGallery();
  renderSteps();
  setupWhatsAppButton();
  setupConnectButton();
  setupParticles();
  setupRevealAnimation();
}

init();
