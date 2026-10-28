
const statusApresentacao = document.getElementById("status");
const apresentacao = document.getElementById("apresentacao");

function escaparHtml(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

function icone(nome) {
    const icones = {
        mensagem: '<path d="M12 7v14"/><path d="M3 18V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13"/><path d="M3 18a3 3 0 0 0 3 3h15"/><path d="M8 7h8"/><path d="M8 11h8"/>',

        endereco: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',

        horario: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',

        telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.8 2.1Z"/>',

        mapa: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15"/><path d="M15 6v15"/>',

        navegar: '<path d="m3 11 19-9-9 19-2-8-8-2Z"/><path d="m11 13 5-5"/>',

        whatsapp: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8.5 9a.9.9 0 0 1 1-.5l1 1.8a.9.9 0 0 1-.2 1l-.6.6a6 6 0 0 0 2.5 2.5l.6-.6a.9.9 0 0 1 1-.2l1.8 1a.9.9 0 0 1-.5 1c-.8.5-1.8.5-2.7.1a9 9 0 0 1-4.1-4.1c-.4-.9-.4-1.9.2-2.6Z"/>'
    };

    const desenho = icones[nome];

    if (!desenho) return "";

    return `<svg class="icone" xmlns="http://www.w3.org/2000/svg"
        width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">${desenho}</svg>`;
}


function listaHtml(itens, formatar) {
  if (!itens.length) {
    return '<p class="vazio">Nenhuma informação cadastrada.</p>';
  }

  return `<ul class="lista">${itens.map(item =>
    `<li>${formatar(item)}</li>`
  ).join("")}</ul>`;
}

function formatarTelefone(numero) {
  const nacional = numero.replace(/^55/, "");

  return nacional.replace(
    /^(\d{2})(\d{4,5})(\d{4})$/,
    "$1 $2-$3"
  );
}

function linkSocial(valor, dominio) {
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || !(url.hostname === dominio || url.hostname.endsWith(`.${dominio}`))) return "";
    return url.href;
  } catch {
    return "";
  }
}

async function carregarApresentacao() {
  const slug = new URLSearchParams(location.search).get("igreja");

  if (!slug) {
    statusApresentacao.textContent =
      "Selecione uma igreja na busca para ver sua apresentação.";
    return;
  }

  try {
    const resposta = await fetch(
      `/api/igrejas/${encodeURIComponent(slug)}`
    );

    if (!resposta.ok) {
      throw new Error("Igreja não encontrada.");
    }

    const igreja = await resposta.json();

    const endereco = [
      igreja.endereco,
      igreja.bairro,
      [igreja.cidade, igreja.estado].filter(Boolean).join(" - ")
    ].filter(Boolean).join(", ");

    
const destino = `${igreja.latitude},${igreja.longitude}`;

let rota;

try {
    const posicao = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocalização indisponível."));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });

    const origem =
        `${posicao.coords.latitude},${posicao.coords.longitude}`;

    rota =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${encodeURIComponent(origem)}` +
        `&destination=${encodeURIComponent(destino)}` +
        `&travelmode=driving`;

} catch {
    // Sem localização disponível, o Maps escolhe a origem.
    rota =
        `https://www.google.com/maps/dir/?api=1` +
        `&destination=${encodeURIComponent(destino)}` +
        `&travelmode=driving`;
}

    const telefone = String(igreja.telefone || "")
      .replace(/\D/g, "");

    const whatsapp = String(igreja.whatsapp || "")
      .replace(/\D/g, "");

    const cultos = Array.isArray(igreja.cultos)
      ? igreja.cultos
      : [];

    const mensagem = String(igreja.mensagem_pastor || "").trim();
    const fotoPastor = String(igreja.foto_pastor_url || "").trim();
    const facebook = linkSocial(String(igreja.facebook_url || "").trim(), "facebook.com");
    const instagram = linkSocial(String(igreja.instagram_url || "").trim(), "instagram.com");

    document.title = `${igreja.nome} | Lance a Rede`;

    apresentacao.innerHTML = `
      <header class="cabecalho">
        <img
          class="logo"
          src="${escaparHtml(igreja.logo_url || "/convite/imagens/logo.jpeg")}"
          alt="Logo de ${escaparHtml(igreja.nome)}"
        >

        <h1>${escaparHtml(igreja.nome)}</h1>
      </header>

      ${mensagem ? `
        <section class="secao secao-mensagem">
          <h2>${icone("mensagem")}Uma palavra do pastor</h2>
          ${fotoPastor ? `<img class="foto-pastor" src="${escaparHtml(fotoPastor)}" alt="Foto do pastor de ${escaparHtml(igreja.nome)}">` : ""}
          <p class="mensagem-pastor">${escaparHtml(mensagem)}</p>
        </section>
      ` : ""}

      <section class="secao secao-endereco">
        <h2>${icone("endereco")}Endereço</h2>
        <p class="endereco">${escaparHtml(endereco)}</p>
      </section>

      <section class="secao secao-cultos">
        <h2>${icone("horario")}Horários dos cultos</h2>
        ${listaHtml(cultos, culto =>
          `${escaparHtml(culto.dia)} — ${escaparHtml(culto.horario)}`
        )}
      </section>

      ${(telefone || whatsapp) ? `
        <section class="secao secao-contatos">
         <h2>${icone("telefone")}Entre em contato</h2>

          ${telefone ? `
            <div class="contato-numero">
              <p class="rotulo-contato">Telefone da igreja</p>
              <p class="numero-contato">${escaparHtml(formatarTelefone(telefone))}</p>
            </div>
          ` : ""}

          ${whatsapp ? `
            <div class="contato-numero">
              <p class="rotulo-contato">WhatsApp da igreja</p>
              <p class="numero-contato">${escaparHtml(formatarTelefone(whatsapp))}</p>
            </div>
          ` : ""}
        </section>
      ` : ""}

      <nav class="acoes" aria-label="Contato e localização">
       <a class="botao mapa" href="${rota}" target="_blank" rel="noopener noreferrer">
    ${icone("navegar")}Como chegar
</a>

        ${telefone ? `
          <a class="botao" href="tel:+${telefone}">
    ${icone("telefone")}Ligar para a igreja
</a>
        ` : ""}

        ${whatsapp ? `
          <a class="botao" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">
    ${icone("whatsapp")}Conversar pelo WhatsApp
</a>
        ` : ""}
      </nav>
      ${(facebook || instagram) ? `
        <footer class="redes-sociais" aria-label="Redes sociais da igreja">
          ${facebook ? `<a class="botao-social facebook" href="${escaparHtml(facebook)}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">f</span>Facebook</a>` : ""}
          ${instagram ? `<a class="botao-social instagram" href="${escaparHtml(instagram)}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">◎</span>Instagram</a>` : ""}
        </footer>
      ` : ""}
    `;

    statusApresentacao.hidden = true;
    apresentacao.hidden = false;

  } catch (erro) {
    console.error("Erro ao carregar apresentação:", erro);
    statusApresentacao.textContent =
      "Não foi possível carregar a apresentação desta igreja.";
  }
}

carregarApresentacao();
