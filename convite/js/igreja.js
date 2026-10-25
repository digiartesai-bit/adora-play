const statusApresentacao = document.getElementById("status");
const apresentacao = document.getElementById("apresentacao");

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[caractere]);
}

function listaHtml(itens, formatar) {
  if (!itens.length) return '<p class="vazio">Nenhuma informação cadastrada.</p>';
  return `<ul class="lista">${itens.map(item => `<li>${formatar(item)}</li>`).join("")}</ul>`;
}

async function carregarApresentacao() {
  const slug = new URLSearchParams(location.search).get("igreja");
  if (!slug) {
    statusApresentacao.textContent = "Selecione uma igreja na busca para ver sua apresentação.";
    return;
  }

  try {
    const resposta = await fetch(`/api/igrejas/${encodeURIComponent(slug)}`);
    if (!resposta.ok) throw new Error("Igreja não encontrada.");
    const igreja = await resposta.json();
    const endereco = [igreja.endereco, igreja.bairro, `${igreja.cidade} - ${igreja.estado}`]
      .filter(Boolean).join(", ");
    const destino = `${igreja.latitude},${igreja.longitude}`;
    const rota = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
    const telefone = String(igreja.telefone || "").replace(/\D/g, "");
    const whatsapp = String(igreja.whatsapp || "").replace(/\D/g, "");
    const cultos = Array.isArray(igreja.cultos) ? igreja.cultos : [];
    const eventos = Array.isArray(igreja.eventos) ? igreja.eventos : [];

    document.title = `${igreja.nome} | Lance a Rede`;
    apresentacao.innerHTML = `
      <header class="cabecalho">
        <img class="logo" src="${escaparHtml(igreja.logo_url || "/convite/imagens/logo.jpeg")}" alt="Logo de ${escaparHtml(igreja.nome)}">
        <h1>${escaparHtml(igreja.nome)}</h1>
        ${igreja.mensagem_pastor ? `<p class="mensagem-pastor">${escaparHtml(igreja.mensagem_pastor)}</p>` : ""}
        <p class="endereco">${escaparHtml(endereco)}</p>
      </header>
      <section class="secao"><h2>Horários dos cultos</h2>${listaHtml(cultos, culto => `${escaparHtml(culto.dia)} — ${escaparHtml(culto.horario)}`)}</section>
      ${eventos.length ? `<section class="secao"><h2>Eventos</h2>${listaHtml(eventos, evento => escaparHtml(typeof evento === "string" ? evento : [evento.nome, evento.data, evento.horario].filter(Boolean).join(" — ")))}</section>` : ""}
      <nav class="acoes" aria-label="Contato e localização">
        <a class="botao mapa" href="${rota}" target="_blank" rel="noopener noreferrer">Como chegar</a>
        ${telefone ? `<a class="botao" href="tel:+${telefone}">Ligar para a igreja</a>` : ""}
        ${whatsapp ? `<a class="botao" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">Conversar pelo WhatsApp</a>` : ""}
      </nav>`;
    statusApresentacao.hidden = true;
    apresentacao.hidden = false;
  } catch {
    statusApresentacao.textContent = "Não foi possível carregar a apresentação desta igreja.";
  }
}

carregarApresentacao();
