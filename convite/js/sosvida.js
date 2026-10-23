

    /*
      ============================================================
      NAVEGAÇÃO
      ============================================================
    */

    const ordemTelas = [
      "inicio",
      "espelhamento",
      "pergunta",
      "falta",
      "deus",
      "distancia",
      "relacionamento",
      "jesus",
      "convite",
      "oracao",
      "final"
    ];

    let telaAtual = 0;


    function irPara(id) {

      const novoIndice = ordemTelas.indexOf(id);

      if (novoIndice === -1) {
        return;
      }

      document.querySelectorAll(".tela").forEach(function(tela) {
        tela.classList.remove("ativa");
      });

      const destino = document.getElementById(id);

      if (destino) {
        destino.classList.add("ativa");
      }

      telaAtual = novoIndice;

      atualizarInterface();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }


    function voltar() {

      if (telaAtual <= 0) {
        return;
      }

      const anterior = ordemTelas[telaAtual - 1];

      irPara(anterior);
    }


    function atualizarInterface() {

      const total = ordemTelas.length;

      const percentual =
        ((telaAtual + 1) / total) * 100;

      document.getElementById("progressoBarra").style.width =
        percentual + "%";


      const btnVoltar =
        document.getElementById("btnVoltar");

      if (telaAtual === 0) {
        btnVoltar.style.display = "none";
      } else {
        btnVoltar.style.display = "block";
      }

    }


    /*
      ============================================================
      BOTÃO VOLTAR DO ANDROID / NAVEGADOR
      ============================================================
    */

    window.addEventListener("popstate", function() {

      if (telaAtual > 0) {
        const anterior = ordemTelas[telaAtual - 1];
        irPara(anterior);
      }

    });


    /*
      ============================================================
      INICIALIZAÇÃO
      ============================================================
    */

    atualizarInterface();

    carregarIgreja();

    async function carregarIgreja() {
      const slug = new URLSearchParams(location.search).get("igreja");
      const area = document.getElementById("detalhesIgreja");
      if (!slug) {
        area.innerHTML = '<p class="texto">Selecione uma igreja participante para ver endereço, cultos e contato.</p>';
        return;
      }
      try {
        const resposta = await fetch(`/api/igrejas/${encodeURIComponent(slug)}`);
        if (!resposta.ok) throw new Error("Igreja não encontrada.");
        const igreja = await resposta.json();
        document.title = `${igreja.nome} | SOS para a Vida`;
        document.getElementById("nomeMini").textContent = igreja.nome;
        document.getElementById("igrejaRodape").textContent = igreja.nome;
        ["logoMini", "logoPrincipal", "logoFinal"].forEach(id => {
          const img = document.getElementById(id);
          img.src = igreja.logo_url || "/convite/imagens/logo.jpeg";
          img.alt = `Logo de ${igreja.nome}`;
        });
        const endereco = [igreja.endereco, igreja.bairro, `${igreja.cidade} - ${igreja.estado}`].filter(Boolean).join(", ");
        const cultos = igreja.cultos.length
          ? `<h3>Cultos</h3><ul>${igreja.cultos.map(c => `<li>${escapar(c.dia)} — ${escapar(c.horario)}</li>`).join("")}</ul>` : "";
        const eventos = igreja.eventos.length
          ? `<h3>Eventos</h3><ul>${igreja.eventos.map(e => `<li>${escapar(typeof e === "string" ? e : [e.nome, e.data, e.horario].filter(Boolean).join(" — "))}</li>`).join("")}</ul>` : "";
        const destino = `${igreja.latitude},${igreja.longitude}`;
        const rota = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving`;
        const telefone = String(igreja.telefone || "").replace(/\D/g, "");
        const whatsapp = String(igreja.whatsapp || "").replace(/\D/g, "");
        const contatoLigacao = telefone ? `<a class="botao botao-whatsapp" href="tel:+${telefone}">Ligar</a>` : "";
        const contatoWhatsapp = whatsapp ? `<a class="botao botao-whatsapp" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer">Enviar mensagem pelo WhatsApp</a>` : "";
        area.innerHTML = `<h3>${escapar(igreja.nome)}</h3><p class="texto">${escapar(endereco)}</p>${cultos}${eventos}<a class="botao" href="${rota}" target="_blank" rel="noopener noreferrer">Ver rota</a>${contatoLigacao}${contatoWhatsapp}`;
      } catch (erro) {
        area.textContent = "Não foi possível carregar os dados desta igreja. Você pode escolher outra na busca.";
      }
    }

    function escapar(valor) {
      return String(valor).replace(/[&<>"']/g, caractere => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere]);
    }

  
