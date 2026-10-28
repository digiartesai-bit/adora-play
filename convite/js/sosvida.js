/* Navegação entre as seis etapas */
const ordemTelas = [
  "inicio",
  "pergunta",
  "deus",
  "jesus",
  "convite",
  "final"
];

let telaAtual = 0;

function irPara(id) {
  const novoIndice = ordemTelas.indexOf(id);
  if (novoIndice < 0) return;

  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.remove("ativa");
  });

  const destino = document.getElementById(id);
  if (!destino) return;

  destino.classList.add("ativa");
  telaAtual = novoIndice;

  atualizarInterface();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function voltar() {
  if (telaAtual > 0) {
    irPara(ordemTelas[telaAtual - 1]);
  }
}

function atualizarInterface() {
  const total = ordemTelas.length;
  const barra = document.getElementById("progressoBarra");
  const progresso = document.querySelector(".progresso");
  const btnVoltar = document.getElementById("btnVoltar");

  if (barra) {
    barra.style.width =
      `${((telaAtual + 1) / total) * 100}%`;
  }

  if (progresso) {
    progresso.setAttribute(
      "aria-valuenow",
      String(telaAtual + 1)
    );
  }

  if (btnVoltar) {
    btnVoltar.style.display =
      telaAtual === 0 ? "none" : "block";
  }
}

/* Botão Voltar do navegador/Android */
window.addEventListener("popstate", () => {
  if (telaAtual > 0) {
    irPara(ordemTelas[telaAtual - 1]);
  }
});

/* Inicialização */
document.addEventListener("DOMContentLoaded", () => {
  atualizarInterface();
  carregarIgreja();
});

/* Carrega os dados da igreja selecionada */
async function carregarIgreja() {
  const slug =
    new URLSearchParams(location.search).get("igreja");

  const area = document.getElementById("detalhesIgreja");

  if (!area) return;

  if (!slug) {
    area.innerHTML =
      '<p class="texto">Selecione uma igreja participante para ver endereço, cultos e contato.</p>';
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

    document.title =
      `${igreja.nome} | SOS para a Vida`;

    const nomeMini =
      document.getElementById("nomeMini");

    const rodape =
      document.getElementById("igrejaRodape");

    if (nomeMini) {
      nomeMini.textContent = igreja.nome;
    }

    if (rodape) {
      rodape.textContent = igreja.nome;
    }

    /* Atualiza os logos */
    ["logoMini", "logoPrincipal", "logoFinal"].forEach(id => {
      const img = document.getElementById(id);

      if (img) {
        img.src =
          igreja.logo_url || "/convite/imagens/logo.jpeg";

        img.alt = `Logo de ${igreja.nome}`;
      }
    });

    /* Monta o endereço */
    const endereco = [
      igreja.endereco,
      igreja.bairro,
      [igreja.cidade, igreja.estado]
        .filter(Boolean)
        .join(" - ")
    ]
      .filter(Boolean)
      .join(", ");

    /* Lista de cultos */
    const cultos =
      Array.isArray(igreja.cultos) && igreja.cultos.length
        ? `<h3>Cultos</h3>
           <ul>
             ${igreja.cultos.map(c =>
               `<li>${escapar(c.dia)} — ${escapar(c.horario)}</li>`
             ).join("")}
           </ul>`
        : "";

    /* Lista de eventos */
    const eventos =
      Array.isArray(igreja.eventos) && igreja.eventos.length
        ? `<h3>Eventos</h3>
           <ul>
             ${igreja.eventos.map(e => {
               const descricao =
                 typeof e === "string"
                   ? e
                   : [e.nome, e.data, e.horario]
                       .filter(Boolean)
                       .join(" — ");

               return `<li>${escapar(descricao)}</li>`;
             }).join("")}
           </ul>`
        : "";

    /* Link para o Google Maps */
    const temCoordenadas =
      igreja.latitude != null &&
      igreja.longitude != null &&
      igreja.latitude !== "" &&
      igreja.longitude !== "";

    const rota = temCoordenadas
      ? `https://www.google.com/maps/dir/?api=1&destination=${
          encodeURIComponent(
            `${igreja.latitude},${igreja.longitude}`
          )
        }&travelmode=driving`
      : "";

    const linkRota = rota
      ? `<a class="botao" href="${rota}"
           target="_blank"
           rel="noopener noreferrer">Ver rota</a>`
      : "";

    /* Telefone e WhatsApp */
    const telefone =
      String(igreja.telefone || "").replace(/\D/g, "");

    const whatsapp =
      String(igreja.whatsapp || "").replace(/\D/g, "");

    const contatoLigacao = telefone
      ? `<a class="botao botao-whatsapp"
           href="tel:+${telefone}">Ligar</a>`
      : "";

    const contatoWhatsapp = whatsapp
      ? `<a class="botao botao-whatsapp"
           href="https://wa.me/${whatsapp}"
           target="_blank"
           rel="noopener noreferrer">WhatsApp</a>`
      : "";

    /* Exibe as informações */
    area.innerHTML = `
      <h3>${escapar(igreja.nome)}</h3>
      <p class="texto">${escapar(endereco)}</p>
      ${cultos}
      ${eventos}
      ${linkRota}
      ${contatoLigacao}
      ${contatoWhatsapp}
    `;

  } catch (erro) {
    area.textContent =
      "Não foi possível carregar os dados desta igreja. Você pode escolher outra na busca.";
  }
}

/* Proteção de textos inseridos no HTML */
function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}