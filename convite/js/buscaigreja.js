const lista = document.getElementById("lista");
const cidadeSelect = document.getElementById("cidade");
const statusBusca = document.getElementById("status");
let igrejas = [];
let coordenadasUsuario = null;

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere]);
}

function distanciaKm(a, b, c, d) {
  const rad = valor => valor * Math.PI / 180;
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function estimarDistanciaTrajetoKm(a, b, c, d) {
  return distanciaKm(a, b, c, d) * 1.35;
}

function desenhar() {
  const cidade = cidadeSelect.value;
  const encontradas = igrejas.filter(i => !cidade || i.cidade === cidade);
  if (coordenadasUsuario) {
    encontradas.forEach(i => i.distancia = estimarDistanciaTrajetoKm(coordenadasUsuario.latitude, coordenadasUsuario.longitude, i.latitude, i.longitude));
    encontradas.sort((a, b) => a.distancia - b.distancia);
  }
  statusBusca.textContent = encontradas.length ? `${encontradas.length} igreja(s) encontrada(s).` : "Nenhuma igreja cadastrada nesta cidade.";
  lista.innerHTML = encontradas.map(i => {
    const endereco = [i.endereco, i.bairro, `${i.cidade} - ${i.estado}`].filter(Boolean).join(", ");
    const destino = `${i.latitude},${i.longitude}`;
    const mapa = coordenadasUsuario
      ? `https://www.google.com/maps/dir/?api=1&origin=${coordenadasUsuario.latitude},${coordenadasUsuario.longitude}&destination=${encodeURIComponent(destino)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    const distancia = Number.isFinite(i.distancia)
      ? `<p class="distancia">${i.distancia < 1
        ? `${Math.round(i.distancia * 1000)} m`
        : `${i.distancia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`} de trajeto (estimativa)</p>`
      : "";
    return `<article class="igreja"><div class="cabecalho"><img src="${escapar(i.logo_url || "/convite/imagens/logo.jpeg")}" alt="" class="logo"><h2>${escapar(i.nome)}</h2></div><p>${escapar(endereco)}</p>${distancia}<div class="acoes"><a class="botao mapa" href="${mapa}" target="_blank" rel="noopener noreferrer">Ver rota</a><a class="botao" href="/convite/igreja.html?igreja=${encodeURIComponent(i.slug)}">Conhecer</a></div></article>`;
  }).join("");
}

async function iniciar() {
  try {
    const resposta = await fetch("/api/igrejas");
    if (!resposta.ok) throw new Error("API indisponível");
    igrejas = await resposta.json();
    [...new Set(igrejas.map(i => i.cidade))].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(cidade => {
      const option = document.createElement("option");
      option.value = cidade;
      option.textContent = cidade;
      cidadeSelect.append(option);
    });
    desenhar();
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => {
      coordenadasUsuario = pos.coords;
      statusBusca.textContent = "Localização obtida; igrejas ordenadas por proximidade.";
      desenhar();
    }, () => {}, { timeout: 8000, enableHighAccuracy: true });
  } catch {
    statusBusca.textContent = "Não foi possível carregar as igrejas. Tente novamente mais tarde.";
  }
}

cidadeSelect.addEventListener("change", desenhar);
iniciar();
