const GOOGLE_CLIENT_ID = "674847926774-7b1n759ots2bt8nkn9pmglmr6hpkee2e.apps.googleusercontent.com";
const WHATSAPP_PROJETO = "5514991223869";
const seletor = document.getElementById("igreja");
const seletorPastor = document.getElementById("igrejaPastor");
const formulario = document.getElementById("formulario");
const statusEl = document.getElementById("status");
let tokenGoogle = null;
let igrejaAtual = null;
let tokenClient = null;
let ehAdministrador = false;

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function numeroNacional(valor) {
  const numeros = String(valor || "").replace(/\D/g, "");
  return numeros.startsWith("55") && [12, 13].includes(numeros.length) ? numeros.slice(2) : numeros.slice(-11);
}

function criarItem(tipo, dados = {}, destinoId = null) {
  const container = document.createElement("div");
  container.className = `item ${tipo}`;
  if (tipo === "culto") {
    container.innerHTML = `<label>Dia<input class="dia" maxlength="40" value="${escapar(dados.dia)}" placeholder="Domingo"></label><label>Horário<input class="horario" maxlength="40" value="${escapar(dados.horario)}" placeholder="19h"></label><button type="button" class="remover">Remover</button>`;
  } else {
    container.innerHTML = `<label>Evento<input class="nome" maxlength="120" value="${escapar(dados.nome)}"></label><label>Data<input class="data" maxlength="50" value="${escapar(dados.data)}" placeholder="Data ou recorrência"></label><label>Horário<input class="horario" maxlength="40" value="${escapar(dados.horario)}"></label><button type="button" class="remover">Remover</button>`;
  }
  container.querySelector(".remover").addEventListener("click", () => container.remove());
  document.getElementById(destinoId || (tipo === "culto" ? "cultos" : "eventos")).append(container);
}

async function carregarLista() {
  try {
    let igrejas = [];
    const opcoes = lista => '<option value="">Selecione sua igreja</option>' + lista.map(i => `<option value="${escapar(i.slug)}">${escapar(i.nome)} — ${escapar(i.cidade)}${i.temporariamente_oculta ? " (temporariamente oculta)" : ""}</option>`).join("");
    if (ehAdministrador) {
      const resposta = await fetch("/api/admin/igrejas", { headers: { Authorization: `Bearer ${tokenGoogle}` } });
      if (!resposta.ok) throw new Error();
      igrejas = await resposta.json();
      const selecionada = seletor.value;
      seletor.innerHTML = opcoes(igrejas);
      if (igrejas.some(i => i.slug === selecionada)) seletor.value = selecionada;
    } else if (tokenGoogle) {
      const minhas = await fetch("/api/pastor/igrejas", { headers: { Authorization: `Bearer ${tokenGoogle}` } });
      if (!minhas.ok) throw new Error("Não foi possível carregar as igrejas autorizadas para este login.");
      const selecionada = seletorPastor.value;
      const listaMinhas = await minhas.json();
      seletorPastor.innerHTML = opcoes(listaMinhas.map(i => ({ ...i, temporariamente_oculta: !i.ativo })));
      if (listaMinhas.some(i => i.slug === selecionada)) seletorPastor.value = selecionada;
    }
  } catch {
    statusEl.textContent = "Não foi possível carregar as igrejas da API (/api/igrejas). O Worker publicado pode estar desatualizado ou a rota /api/* pode não estar apontando para ele.";
  }
}

async function carregarCadastro() {
  formulario.hidden = true;
  document.getElementById("reativarCadastro").hidden = true;
  document.getElementById("adminPastores").hidden = true;
  igrejaAtual = null;
  document.getElementById("mapaReferencia").value = "";
  const slug = (ehAdministrador ? seletor : seletorPastor).value;
  if (!slug) return;
  const headers = tokenGoogle ? { Authorization: `Bearer ${tokenGoogle}` } : {};
  const rota = ehAdministrador
    ? `/api/admin/igrejas/${encodeURIComponent(slug)}`
    : `/api/pastor/igrejas/${encodeURIComponent(slug)}`;
  const resposta = await fetch(rota, { headers });
  if (ehAdministrador) {
    const admin = await fetch(`/api/admin/igrejas/${encodeURIComponent(slug)}/pastores`, { headers });
    if (admin.ok && resposta.ok) {
      document.getElementById("adminPastores").hidden = false;
      desenharPastores(await admin.json());
      igrejaAtual = await resposta.json();
      document.getElementById("latitudeAdmin").value = igrejaAtual.latitude;
      document.getElementById("longitudeAdmin").value = igrejaAtual.longitude;
      document.getElementById("adminNomeIgreja").textContent = igrejaAtual.nome;
      document.getElementById("slugAdmin").value = igrejaAtual.slug;
      document.getElementById("adminCoordenadas").textContent = `Coordenadas atuais: ${igrejaAtual.latitude}, ${igrejaAtual.longitude}`;
      statusEl.textContent = "Acesso de administração. Você pode autorizar responsáveis e corrigir as coordenadas.";
      return;
    }
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      throw new Error(erro.error || "Não foi possível carregar os dados da igreja.");
    }
    const erroAdmin = await admin.json().catch(() => ({}));
    throw new Error(erroAdmin.error || "Não foi possível carregar a administração desta igreja.");
  }
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.error || "Não foi possível carregar os dados da igreja.");
  }
  igrejaAtual = await resposta.json();
  if (!document.getElementById("adminPastores").hidden) {
    document.getElementById("latitudeAdmin").value = igrejaAtual.latitude;
    document.getElementById("longitudeAdmin").value = igrejaAtual.longitude;
  }
  document.getElementById("coordenadas").textContent = `Pino atual: ${igrejaAtual.latitude}, ${igrejaAtual.longitude}`;
  atualizarLinkRevisaoMapa();
  if (!tokenGoogle) return;
  if (igrejaAtual.removida_em || !igrejaAtual.ativo) {
    const prazo = igrejaAtual.removida_em
      ? `Se não for publicada novamente, a exclusão definitiva está prevista para ${new Date(new Date(`${igrejaAtual.removida_em.replace(" ", "T")}Z`).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleString("pt-BR")}.`
      : "Esta igreja está inativa. Entre em contato com o administrador para conferir o prazo de reativação.";
    document.getElementById("prazoReativacao").textContent = prazo;
    document.getElementById("reativarCadastro").hidden = false;
    statusEl.textContent = "Este cadastro está oculto, mas pode ser reativado pelo mesmo login dentro do prazo.";
    return;
  }
  formulario.elements.namedItem("endereco").value = igrejaAtual.endereco;
  formulario.elements.namedItem("bairro").value = igrejaAtual.bairro || "";
  formulario.elements.namedItem("cidade").value = igrejaAtual.cidade;
  formulario.elements.namedItem("estado").value = igrejaAtual.estado || "SP";
  formulario.elements.namedItem("telefone").value = numeroNacional(igrejaAtual.telefone);
  formulario.elements.namedItem("whatsapp").value = numeroNacional(igrejaAtual.whatsapp);
  document.getElementById("cultos").replaceChildren();
  document.getElementById("eventos").replaceChildren();
  igrejaAtual.cultos.forEach(c => criarItem("culto", c));
  igrejaAtual.eventos.forEach(e => criarItem("evento", e));
  formulario.hidden = false;
}

function desenharPastores(pastores) {
  const lista = document.getElementById("listaPastores");
  lista.replaceChildren();
  pastores.forEach(pastor => {
    const item = document.createElement("li");
    const texto = document.createElement("span");
    texto.textContent = pastor.email_google;
    const remover = document.createElement("button");
    remover.type = "button";
    remover.textContent = "Remover";
    remover.addEventListener("click", () => alterarPastor("DELETE", pastor.email_google));
    item.append(texto, " ", remover);
    lista.append(item);
  });
}

async function alterarPastor(metodo, email) {
  if (!tokenGoogle || !igrejaAtual) return;
  const resposta = await fetch(`/api/admin/igrejas/${encodeURIComponent(igrejaAtual.slug)}/pastores`, {
    method: metodo,
    headers: { Authorization: `Bearer ${tokenGoogle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const resultado = await resposta.json();
  if (!resposta.ok) {
    statusEl.textContent = resultado.error || "Não foi possível alterar o acesso.";
    return;
  }
  if (metodo === "POST") document.getElementById("emailPastor").value = "";
  const lista = await fetch(`/api/admin/igrejas/${encodeURIComponent(igrejaAtual.slug)}/pastores`, { headers: { Authorization: `Bearer ${tokenGoogle}` } });
  desenharPastores(await lista.json());
  await carregarLista();
  seletor.value = igrejaAtual.slug;
  statusEl.textContent = "Acessos da igreja atualizados.";
}

function atualizarLinkRevisaoMapa() {
  if (!igrejaAtual) return;
  const mapa = document.getElementById("mapaReferencia").value.trim();
  const mensagem = `Olá, gostaria de solicitar a revisão do pino no mapa da igreja ${igrejaAtual.nome}. Endereço: ${igrejaAtual.endereco}, ${igrejaAtual.bairro}, ${igrejaAtual.cidade} - ${igrejaAtual.estado}.${mapa ? ` Localização correta: ${mapa}` : ""}`;
  document.getElementById("pedirCorrecao").href = `https://wa.me/${WHATSAPP_PROJETO}?text=${encodeURIComponent(mensagem)}`;
}

document.getElementById("entrar").addEventListener("click", () => {
  if (!window.google?.accounts?.oauth2) {
    statusEl.textContent = "O login Google ainda está carregando. Tente novamente.";
    return;
  }
  tokenClient ||= google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "openid email profile",
    callback: async resposta => {
      if (resposta.error || !resposta.access_token) {
        statusEl.textContent = "Não foi possível entrar com Google.";
        return;
      }
      tokenGoogle = resposta.access_token;
      try {
        const perfil = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${tokenGoogle}` } });
        const usuario = perfil.ok ? await perfil.json() : null;
        ehAdministrador = usuario?.email_verified === true && usuario.email?.toLowerCase() === "digiartesai@gmail.com";
        document.getElementById("areaAdmin").hidden = !ehAdministrador;
        document.getElementById("areaPastor").hidden = ehAdministrador;
        document.getElementById("formulario").hidden = true;
        document.getElementById("reativarCadastro").hidden = true;
        document.getElementById("descricaoPagina").textContent = ehAdministrador
          ? "Admin: selecione a igreja, confira o slug, autorize o e-mail do pastor e revise as coordenadas."
          : "Pastor: selecione sua igreja autorizada e preencha os dados para apresenta\u00e7\u00e3o p\u00fablica.";
        statusEl.textContent = ehAdministrador
          ? "Conta administradora conectada. Selecione uma igreja para ver o slug, autorizar o pastor e revisar as coordenadas."
          : "Conta Google conectada. Se estiver autorizada para a igreja selecionada, o formulário será liberado.";
        await carregarLista();
        await carregarCadastro();
      } catch (erro) { statusEl.textContent = erro.message; }
    }
  });
  tokenClient.requestAccessToken();
});

seletor.addEventListener("change", async () => {
  try { await carregarCadastro(); } catch (erro) { statusEl.textContent = erro.message; }
});
seletorPastor.addEventListener("change", async () => {
  try { await carregarCadastro(); } catch (erro) { statusEl.textContent = erro.message; }
});
document.getElementById("mapaReferencia").addEventListener("input", atualizarLinkRevisaoMapa);
document.getElementById("adicionarCulto").addEventListener("click", () => criarItem("culto"));
document.getElementById("adicionarEvento").addEventListener("click", () => criarItem("evento"));
for (const nome of ["telefone", "whatsapp"]) formulario.elements.namedItem(nome).addEventListener("input", evento => {
  let numeros = evento.target.value.replace(/\D/g, "");
  if (numeros.startsWith("55") && [12, 13].includes(numeros.length)) numeros = numeros.slice(2);
  evento.target.value = numeros.slice(0, 11);
});
document.getElementById("autorizarPastor").addEventListener("click", () => {
  const email = document.getElementById("emailPastor").value.trim();
  if (email) alterarPastor("POST", email);
});
document.getElementById("salvarCoordenadas").addEventListener("click", async () => {
  if (!tokenGoogle || !igrejaAtual) return;
  const resposta = await fetch(`/api/admin/igrejas/${encodeURIComponent(igrejaAtual.slug)}/coordenadas`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${tokenGoogle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: document.getElementById("latitudeAdmin").value, longitude: document.getElementById("longitudeAdmin").value })
  });
  const resultado = await resposta.json();
  statusEl.textContent = resposta.ok ? "Coordenadas atualizadas." : (resultado.error || "Não foi possível atualizar as coordenadas.");
  if (resposta.ok) {
    igrejaAtual.latitude = resultado.latitude;
    igrejaAtual.longitude = resultado.longitude;
    document.getElementById("adminCoordenadas").textContent = `Coordenadas atuais: ${resultado.latitude}, ${resultado.longitude}`;
    await carregarLista();
    seletor.value = igrejaAtual.slug;
  }
});

document.getElementById("salvarSlug").addEventListener("click", async () => {
  if (!tokenGoogle || !igrejaAtual) return;
  const slug = document.getElementById("slugAdmin").value.trim().toLowerCase();
  const resposta = await fetch(`/api/admin/igrejas/${encodeURIComponent(igrejaAtual.slug)}/slug`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${tokenGoogle}`, "Content-Type": "application/json" },
    body: JSON.stringify({ slug })
  });
  const resultado = await resposta.json();
  if (!resposta.ok) {
    statusEl.textContent = resultado.error || "Não foi possível salvar o slug.";
    return;
  }
  igrejaAtual.slug = resultado.slug;
  await carregarLista();
  seletor.value = resultado.slug;
  await carregarCadastro();
  statusEl.textContent = "Slug atualizado.";
});

document.getElementById("ocultarIgreja").addEventListener("click", async () => {
  if (!tokenGoogle || !igrejaAtual || !window.confirm("Ocultar esta igreja da busca pÃºblica? O cadastro e o acesso deste login serÃ£o mantidos por 30 dias e poderÃ£o ser reativados nesse perÃ­odo. Depois disso, o cadastro e a logo serÃ£o apagados permanentemente.")) return;
  const resposta = await fetch(`/api/pastor/igrejas/${encodeURIComponent(igrejaAtual.slug)}/ocultar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenGoogle}` }
  });
  const resultado = await resposta.json();
  if (!resposta.ok) {
    statusEl.textContent = resultado.error || "Não foi possível ocultar a igreja.";
    return;
  }
  await carregarLista();
  seletorPastor.value = igrejaAtual.slug;
  await carregarCadastro();
});

document.getElementById("reativarIgreja").addEventListener("click", async () => {
  if (!tokenGoogle || !igrejaAtual) return;
  const resposta = await fetch(`/api/pastor/igrejas/${encodeURIComponent(igrejaAtual.slug)}/reativar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenGoogle}` }
  });
  const resultado = await resposta.json();
  if (!resposta.ok) {
    statusEl.textContent = resultado.error || "Não foi possível publicar novamente.";
    return;
  }
  await carregarLista();
  seletorPastor.value = igrejaAtual.slug;
  await carregarCadastro();
  statusEl.textContent = "A igreja voltou à lista pública.";
});

async function prepararLogo(arquivo) {
  if (!arquivo) return null;
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, 80 / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagem.width * escala));
  canvas.height = Math.max(1, Math.round(imagem.height * escala));
  canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);
  imagem.close();

  for (const qualidade of [0.86, 0.72, 0.58, 0.45]) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", qualidade));
    if (blob && blob.size <= 100 * 1024) return blob;
  }
  throw new Error("Não foi possível reduzir a logo para menos de 100 KB.");
}

formulario.addEventListener("submit", async evento => {
  evento.preventDefault();
  if (!tokenGoogle || !igrejaAtual) return;
  const cultos = [...document.querySelectorAll("#cultos .item")].map(el => ({ dia: el.querySelector(".dia").value.trim(), horario: el.querySelector(".horario").value.trim() })).filter(c => c.dia && c.horario);
  const eventos = [...document.querySelectorAll("#eventos .item")].map(el => ({ nome: el.querySelector(".nome").value.trim(), data: el.querySelector(".data").value.trim(), horario: el.querySelector(".horario").value.trim() })).filter(e => e.nome);
  const campo = nome => formulario.elements.namedItem(nome).value;
  const telefone = campo("telefone").replace(/\D/g, "");
  const whatsapp = campo("whatsapp").replace(/\D/g, "");
  if ([telefone, whatsapp].some(numero => numero && ![10, 11].includes(numero.length))) {
    statusEl.textContent = "Digite cada contato com DDD e telefone, totalizando 10 ou 11 números.";
    return;
  }
  const corpo = { endereco: campo("endereco"), bairro: campo("bairro"), cidade: campo("cidade"), estado: campo("estado"), telefone: telefone ? `55${telefone}` : "", whatsapp: whatsapp ? `55${whatsapp}` : "", cultos, eventos };
  const headers = { Authorization: `Bearer ${tokenGoogle}`, "Content-Type": "application/json" };
  statusEl.textContent = "Salvando…";
  try {
    const resposta = await fetch(`/api/pastor/igrejas/${encodeURIComponent(igrejaAtual.slug)}`, { method: "PUT", headers, body: JSON.stringify(corpo) });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.error || "Falha ao salvar os dados.");
    const arquivo = document.getElementById("logo").files[0];
    if (arquivo) {
      const logoReduzida = await prepararLogo(arquivo);
      const form = new FormData();
      const extensao = logoReduzida.type === "image/png" ? "png" : logoReduzida.type === "image/jpeg" ? "jpg" : "webp";
      form.append("logo", logoReduzida, `logo.${extensao}`);
      const upload = await fetch(`/api/pastor/igrejas/${encodeURIComponent(igrejaAtual.slug)}/logo`, { method: "POST", headers: { Authorization: `Bearer ${tokenGoogle}` }, body: form });
      const resultadoLogo = await upload.json();
      if (!upload.ok) throw new Error(resultadoLogo.error || "Dados salvos, mas não foi possível enviar a logo.");
      document.getElementById("logo").value = "";
    }
    statusEl.textContent = "Cadastro atualizado com sucesso.";
  } catch (erro) {
    statusEl.textContent = erro.message;
  }
});

carregarLista();




