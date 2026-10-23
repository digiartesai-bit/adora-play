const GOOGLE_CLIENT_ID = "674847926774-7b1n759ots2bt8nkn9pmglmr6hpkee2e.apps.googleusercontent.com";
const WHATSAPP_PROJETO = "5514900000000";
const seletor = document.getElementById("igreja");
const formulario = document.getElementById("formulario");
const statusEl = document.getElementById("status");
let tokenGoogle = null;
let igrejaAtual = null;
let tokenClient = null;

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function numeroNacional(valor) {
  const numeros = String(valor || "").replace(/\D/g, "");
  return numeros.startsWith("55") && [12, 13].includes(numeros.length) ? numeros.slice(2) : numeros.slice(-11);
}

function criarItem(tipo, dados = {}) {
  const container = document.createElement("div");
  container.className = `item ${tipo}`;
  if (tipo === "culto") {
    container.innerHTML = `<label>Dia<input class="dia" maxlength="40" value="${escapar(dados.dia)}" placeholder="Domingo"></label><label>Horário<input class="horario" maxlength="40" value="${escapar(dados.horario)}" placeholder="19h"></label><button type="button" class="remover">Remover</button>`;
  } else {
    container.innerHTML = `<label>Evento<input class="nome" maxlength="120" value="${escapar(dados.nome)}"></label><label>Data<input class="data" maxlength="50" value="${escapar(dados.data)}" placeholder="Data ou recorrência"></label><label>Horário<input class="horario" maxlength="40" value="${escapar(dados.horario)}"></label><button type="button" class="remover">Remover</button>`;
  }
  container.querySelector(".remover").addEventListener("click", () => container.remove());
  document.getElementById(tipo === "culto" ? "cultos" : "eventos").append(container);
}

async function carregarLista() {
  try {
    const resposta = await fetch("/api/igrejas");
    if (!resposta.ok) throw new Error();
    const igrejas = await resposta.json();
    if (tokenGoogle) {
      const minhas = await fetch("/api/pastor/igrejas", { headers: { Authorization: `Bearer ${tokenGoogle}` } });
      if (minhas.ok) {
        const conhecidas = new Set(igrejas.map(i => i.slug));
        (await minhas.json()).forEach(i => {
          if (!conhecidas.has(i.slug)) igrejas.push({ ...i, temporariamente_oculta: true });
        });
      }
    }
    const selecionada = seletor.value;
    seletor.innerHTML = '<option value="">Selecione sua igreja</option>' + igrejas.map(i => `<option value="${escapar(i.slug)}">${escapar(i.nome)} — ${escapar(i.cidade)}${i.temporariamente_oculta ? " (temporariamente oculta)" : ""}</option>`).join("");
    if (igrejas.some(i => i.slug === selecionada)) seletor.value = selecionada;
  } catch {
    statusEl.textContent = "Não foi possível carregar as igrejas.";
  }
}

async function carregarCadastro() {
  formulario.hidden = true;
  document.getElementById("reativarCadastro").hidden = true;
  document.getElementById("adminPastores").hidden = true;
  igrejaAtual = null;
  document.getElementById("mapaReferencia").value = "";
  const slug = seletor.value;
  if (!slug) return;
  const rota = tokenGoogle ? `/api/pastor/igrejas/${encodeURIComponent(slug)}` : `/api/igrejas/${encodeURIComponent(slug)}`;
  const opcoes = tokenGoogle ? { headers: { Authorization: `Bearer ${tokenGoogle}` } } : {};
  const resposta = await fetch(rota, opcoes);
  if (tokenGoogle) {
    const admin = await fetch(`/api/admin/igrejas/${encodeURIComponent(slug)}/pastores`, { headers: { Authorization: `Bearer ${tokenGoogle}` } });
    if (admin.ok) {
      document.getElementById("adminPastores").hidden = false;
      document.getElementById("latitudeAdmin").value = igrejaAtual?.latitude ?? "";
      document.getElementById("longitudeAdmin").value = igrejaAtual?.longitude ?? "";
      desenharPastores(await admin.json());
      if (!resposta.ok) {
        const publica = await fetch(`/api/igrejas/${encodeURIComponent(slug)}`);
        if (publica.ok) igrejaAtual = await publica.json();
        document.getElementById("latitudeAdmin").value = igrejaAtual?.latitude ?? "";
        document.getElementById("longitudeAdmin").value = igrejaAtual?.longitude ?? "";
        statusEl.textContent = "Acesso de administração. Você pode autorizar responsáveis para esta igreja.";
        return;
      }
    }
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
  if (igrejaAtual.removida_em) {
    const removidaEm = new Date(`${igrejaAtual.removida_em.replace(" ", "T")}Z`);
    const excluirEm = new Date(removidaEm.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById("prazoReativacao").textContent = `Se não for publicada novamente, a exclusão definitiva está prevista para ${excluirEm.toLocaleString("pt-BR")}.`;
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
      statusEl.textContent = "Conta Google conectada. Se estiver autorizada para a igreja selecionada, o formulário será liberado.";
      try { await carregarLista(); await carregarCadastro(); } catch (erro) { statusEl.textContent = erro.message; }
    }
  });
  tokenClient.requestAccessToken();
});

seletor.addEventListener("change", async () => {
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
    document.getElementById("coordenadas").textContent = `Pino atual: ${resultado.latitude}, ${resultado.longitude}`;
  }
});

document.getElementById("ocultarIgreja").addEventListener("click", async () => {
  if (!tokenGoogle || !igrejaAtual || !window.confirm("Ocultar esta igreja da busca pública? O cadastro e o acesso deste login serão mantidos por 30 dias e poderão ser reativados nesse período. Depois disso, o cadastro e a logo serão apagados permanentemente.")) return;
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
