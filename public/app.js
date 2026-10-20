const estado = {
  token: localStorage.getItem("barbershop_token") || null,
  usuario: null,
  servicos: [],
  barbeiros: [],
  servicosSelecionados: new Set(),
};

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDataHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mostrarToast(mensagem, tipo = "sucesso") {
  const el = document.getElementById("toast");
  el.textContent = mensagem;
  el.className = `toast ${tipo}`;
  setTimeout(() => {
    el.classList.add("oculto");
  }, 3500);
}

function definirDatasPadraoMesAtual() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const ultimoDia = new Date(ano, agora.getMonth() + 1, 0).getDate();

  const inicio = `${ano}-${mes}-01`;
  const fim = `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;

  document.getElementById("filtro-meu-inicio").value = inicio;
  document.getElementById("filtro-meu-fim").value = fim;
  document.getElementById("filtro-geral-inicio").value = inicio;
  document.getElementById("filtro-geral-fim").value = fim;
}

async function requisitarApi(caminho, opcoes = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opcoes.headers || {}),
  };

  if (estado.token) {
    headers["Authorization"] = `Bearer ${estado.token}`;
  }

  const resposta = await fetch(caminho, {
    ...opcoes,
    headers,
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro ao comunicar com o servidor.");
  }

  return dados;
}

function ehGestorOuAdmin() {
  return (
    estado.usuario &&
    (estado.usuario.nivelAcesso === "ADMINISTRADOR" ||
      estado.usuario.nivelAcesso === "GESTOR")
  );
}

function obterBarbeiroSelecionadoNaOrdem() {
  if (ehGestorOuAdmin()) {
    const select = document.getElementById("select-barbeiro-ordem");
    const encontrado = estado.barbeiros.find((b) => b.id === select.value);
    if (encontrado) return encontrado;
  }
  return {
    id: estado.usuario.pessoaId,
    taxaComissaoPadrao: estado.usuario.taxaComissaoPadrao ?? 50,
  };
}

function atualizarPreviaOrdem() {
  const barbeiroAlvo = obterBarbeiroSelecionadoNaOrdem();
  let totalCobrar = 0;
  let totalComissao = 0;

  for (const servicoId of estado.servicosSelecionados) {
    const servico = estado.servicos.find((s) => s.id === servicoId);
    if (!servico) continue;

    const taxa =
      servico.taxaComissaoEspecifica !== null &&
      servico.taxaComissaoEspecifica !== undefined
        ? servico.taxaComissaoEspecifica
        : barbeiroAlvo.taxaComissaoPadrao;

    totalCobrar += servico.preco;
    totalComissao += (servico.preco * taxa) / 100;
  }

  document.getElementById("previa-total-cobrar").textContent =
    formatarMoeda(totalCobrar);
  document.getElementById("previa-comissao").textContent =
    formatarMoeda(totalComissao);
}

function renderizarSelecaoServicos() {
  const container = document.getElementById("lista-servicos-selecao");
  container.innerHTML = "";

  const servicosAtivos = estado.servicos.filter((s) => s.ativo);
  const barbeiroAlvo = obterBarbeiroSelecionadoNaOrdem();

  for (const servico of servicosAtivos) {
    const selecionado = estado.servicosSelecionados.has(servico.id);
    const taxa =
      servico.taxaComissaoEspecifica !== null
        ? `${servico.taxaComissaoEspecifica}% (específica)`
        : `${barbeiroAlvo.taxaComissaoPadrao}% (padrão)`;

    const card = document.createElement("div");
    card.className = `card-servico-item ${selecionado ? "selecionado" : ""}`;
    card.innerHTML = `
      <span class="nome-servico">${servico.nome}</span>
      <span class="preco-servico">${servico.precoFormatado}</span>
      <span class="meta-comissao">Comissão: ${taxa}</span>
    `;

    card.addEventListener("click", () => {
      if (estado.servicosSelecionados.has(servico.id)) {
        estado.servicosSelecionados.delete(servico.id);
      } else {
        estado.servicosSelecionados.add(servico.id);
      }
      renderizarSelecaoServicos();
      atualizarPreviaOrdem();
    });

    container.appendChild(card);
  }
}

async function carregarMeuExtrato() {
  const inicio = document.getElementById("filtro-meu-inicio").value;
  const fim = document.getElementById("filtro-meu-fim").value;
  const barbeiroAlvo = obterBarbeiroSelecionadoNaOrdem();

  const params = new URLSearchParams({
    inicio,
    fim,
    barbeiroId: barbeiroAlvo.id,
  });

  const extrato = await requisitarApi(`/api/fechamento/extrato?${params}`);

  document.getElementById("meu-total-ordens").textContent = extrato.totalOrdens;
  document.getElementById(
    "meu-total-servicos"
  ).textContent = `${extrato.totalServicosExecutados} serviços executados`;
  document.getElementById("meu-faturamento-bruto").textContent =
    extrato.faturamentoBrutoFormatado;
  document.getElementById("minha-comissao-total").textContent =
    extrato.totalComissaoBarbeiroFormatado;

  const listaEl = document.getElementById("lista-minhas-ordens");
  listaEl.innerHTML = "";

  if (!extrato.ordens || extrato.ordens.length === 0) {
    listaEl.innerHTML = `<p style="color: var(--texto-secundario); font-size: 0.9rem;">Nenhuma ordem de serviço lançada neste período.</p>`;
    return;
  }

  for (const ordem of extrato.ordens.slice().reverse()) {
    const nomesServicos = ordem.itens
      .map((i) => i.nomeServicoHistorico)
      .join(" + ");

    const div = document.createElement("div");
    div.className = "item-ordem-card";
    div.innerHTML = `
      <div>
        <div class="servicos-titulo">${nomesServicos}</div>
        <div class="detalhes-ordem">
          ${formatarDataHora(ordem.realizadoEm)} • Pagamento: ${ordem.metodoPagamento}
          ${ordem.observacoes ? ` • Obs: ${ordem.observacoes}` : ""}
        </div>
      </div>
      <div class="valores-ordem">
        <strong>+ ${ordem.valorTotalComissaoBarbeiroFormatado}</strong>
        <small>Cobrado: ${ordem.valorTotalFormatado}</small>
      </div>
    `;
    listaEl.appendChild(div);
  }
}

async function carregarFechamentoGeral() {
  if (!ehGestorOuAdmin()) return;

  const inicio = document.getElementById("filtro-geral-inicio").value;
  const fim = document.getElementById("filtro-geral-fim").value;
  const params = new URLSearchParams({ inicio, fim });

  const fechamento = await requisitarApi(`/api/fechamento/geral?${params}`);

  document.getElementById("geral-total-ordens").textContent =
    fechamento.totalOrdens;
  document.getElementById(
    "geral-total-servicos"
  ).textContent = `${fechamento.totalServicosExecutados} serviços realizados`;
  document.getElementById("geral-faturamento-bruto").textContent =
    fechamento.faturamentoBrutoTotalFormatado;
  document.getElementById("geral-total-comissoes").textContent =
    fechamento.totalComissoesPagarFormatado;
  document.getElementById("geral-liquido-barbearia").textContent =
    fechamento.totalLiquidoBarbeariaFormatado;

  const tbody = document.getElementById("tabela-fechamento-barbeiros");
  tbody.innerHTML = "";

  for (const ext of fechamento.extratosPorBarbeiro) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${ext.nomeBarbeiro}</strong></td>
      <td>${ext.totalOrdens}</td>
      <td>${ext.totalServicosExecutados}</td>
      <td>${ext.faturamentoBrutoFormatado}</td>
      <td style="color: var(--verde); font-weight: 700;">${ext.totalComissaoBarbeiroFormatado}</td>
      <td style="color: var(--dourado); font-weight: 600;">${ext.totalBarbeariaFormatado}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderizarTabelasCadastros() {
  if (!ehGestorOuAdmin()) return;

  const tbodyBarbeiros = document.getElementById("tabela-barbeiros");
  tbodyBarbeiros.innerHTML = "";
  for (const b of estado.barbeiros) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${b.nome}</strong></td>
      <td><span class="badge">${b.nivelAcesso}</span></td>
      <td>${b.taxaComissaoPadrao}%</td>
      <td>${b.ativo ? "✅ Ativo" : "⛔ Inativo"}</td>
    `;
    tbodyBarbeiros.appendChild(tr);
  }

  const tbodyServicos = document.getElementById("tabela-servicos");
  tbodyServicos.innerHTML = "";
  for (const s of estado.servicos) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${s.nome}</strong></td>
      <td>${s.precoFormatado}</td>
      <td>${
        s.taxaComissaoEspecifica !== null
          ? `${s.taxaComissaoEspecifica}% (Específica)`
          : "Padrão do barbeiro"
      }</td>
      <td>${s.ativo ? "✅ Ativo" : "⛔ Inativo"}</td>
    `;
    tbodyServicos.appendChild(tr);
  }
}

async function carregarDadosSistema() {
  estado.servicos = await requisitarApi("/api/servicos?todos=true");
  estado.barbeiros = await requisitarApi("/api/barbeiros?todos=true");

  const containerSelectBarbeiro = document.getElementById(
    "container-selecao-barbeiro"
  );
  const selectBarbeiro = document.getElementById("select-barbeiro-ordem");

  if (ehGestorOuAdmin()) {
    containerSelectBarbeiro.classList.remove("oculto");
    selectBarbeiro.innerHTML = "";
    for (const b of estado.barbeiros.filter((x) => x.ativo)) {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `${b.nome} (Comissão padrão: ${b.taxaComissaoPadrao}%)`;
      if (b.id === estado.usuario.pessoaId) {
        opt.selected = true;
      }
      selectBarbeiro.appendChild(opt);
    }
  } else {
    containerSelectBarbeiro.classList.add("oculto");
  }

  renderizarSelecaoServicos();
  atualizarPreviaOrdem();
  await carregarMeuExtrato();

  if (ehGestorOuAdmin()) {
    await carregarFechamentoGeral();
    renderizarTabelasCadastros();
  }
}

async function inicializarSessao() {
  if (!estado.token) {
    document.getElementById("tela-login").classList.remove("oculto");
    document.getElementById("tela-sistema").classList.add("oculto");
    return;
  }

  try {
    estado.usuario = await requisitarApi("/api/auth/eu");
    document.getElementById("tela-login").classList.add("oculto");
    document.getElementById("tela-sistema").classList.remove("oculto");

    document.getElementById(
      "subtitulo-usuario"
    ).textContent = `Olá, ${estado.usuario.nome} (Comissão padrão: ${estado.usuario.taxaComissaoPadrao}%)`;
    document.getElementById("badge-nivel").textContent =
      estado.usuario.nivelAcesso;

    if (ehGestorOuAdmin()) {
      document.getElementById("btn-aba-fechamento").classList.remove("oculto");
      document.getElementById("btn-aba-cadastros").classList.remove("oculto");
    } else {
      document.getElementById("btn-aba-fechamento").classList.add("oculto");
      document.getElementById("btn-aba-cadastros").classList.add("oculto");
    }

    definirDatasPadraoMesAtual();
    await carregarDadosSistema();
  } catch {
    estado.token = null;
    localStorage.removeItem("barbershop_token");
    document.getElementById("tela-login").classList.remove("oculto");
    document.getElementById("tela-sistema").classList.add("oculto");
  }
}

// EVENTOS DE INTERFACE
document.addEventListener("DOMContentLoaded", () => {
  // Botões de demonstração na tela de login
  document.querySelectorAll("[data-login]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("input-login").value = btn.dataset.login;
      document.getElementById("input-senha").value = btn.dataset.senha;
    });
  });

  // Login
  document
    .getElementById("form-login")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const login = document.getElementById("input-login").value;
        const senha = document.getElementById("input-senha").value;
        const res = await requisitarApi("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ login, senha }),
        });

        estado.token = res.token;
        localStorage.setItem("barbershop_token", res.token);
        mostrarToast(`Bem-vindo, ${res.usuario.nome}!`);
        await inicializarSessao();
      } catch (erro) {
        mostrarToast(erro.message, "erro");
      }
    });

  // Logout
  document.getElementById("btn-sair").addEventListener("click", () => {
    estado.token = null;
    estado.usuario = null;
    estado.servicosSelecionados.clear();
    localStorage.removeItem("barbershop_token");
    document.querySelector('[data-aba="aba-lancamento"]').click();
    inicializarSessao();
  });

  // Troca de abas
  document.querySelectorAll(".aba-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".aba-btn")
        .forEach((b) => b.classList.remove("ativa"));
      document
        .querySelectorAll(".secao-aba")
        .forEach((s) => s.classList.add("oculto"));

      btn.classList.add("ativa");
      document.getElementById(btn.dataset.aba).classList.remove("oculto");
    });
  });

  // Troca de barbeiro selecionado pelo gestor
  document
    .getElementById("select-barbeiro-ordem")
    .addEventListener("change", async () => {
      renderizarSelecaoServicos();
      atualizarPreviaOrdem();
      await carregarMeuExtrato();
    });

  // Lançamento de nova Ordem de Serviço
  document
    .getElementById("form-nova-ordem")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        if (estado.servicosSelecionados.size === 0) {
          mostrarToast("Selecione pelo menos um serviço realizado.", "erro");
          return;
        }

        const barbeiroAlvo = obterBarbeiroSelecionadoNaOrdem();
        const metodoPagamento =
          document.getElementById("select-pagamento").value;
        const observacoes = document.getElementById("input-observacoes").value;

        const itens = Array.from(estado.servicosSelecionados).map(
          (servicoId) => ({ servicoId })
        );

        const ordemCriada = await requisitarApi("/api/ordens", {
          method: "POST",
          body: JSON.stringify({
            barbeiroId: barbeiroAlvo.id,
            itens,
            metodoPagamento,
            observacoes,
          }),
        });

        estado.servicosSelecionados.clear();
        document.getElementById("input-observacoes").value = "";
        renderizarSelecaoServicos();
        atualizarPreviaOrdem();

        await carregarMeuExtrato();
        if (ehGestorOuAdmin()) {
          await carregarFechamentoGeral();
        }

        mostrarToast(
          `Ordem lançada! Comissão registrada: ${ordemCriada.valorTotalComissaoBarbeiroFormatado}`
        );
      } catch (erro) {
        mostrarToast(erro.message, "erro");
      }
    });

  // Botões de filtro de datas
  document
    .getElementById("btn-atualizar-meu-extrato")
    .addEventListener("click", () => carregarMeuExtrato());

  document
    .getElementById("btn-atualizar-fechamento")
    .addEventListener("click", () => carregarFechamentoGeral());

  // Cadastro de novo barbeiro
  document
    .getElementById("form-novo-barbeiro")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const nome = document.getElementById("barb-nome").value;
        const taxaComissaoPadrao = Number(
          document.getElementById("barb-comissao").value
        );
        const login = document.getElementById("barb-login").value;
        const senhaInicial = document.getElementById("barb-senha").value;
        const nivelAcesso = document.getElementById("barb-nivel").value;

        await requisitarApi("/api/barbeiros", {
          method: "POST",
          body: JSON.stringify({
            nome,
            taxaComissaoPadrao,
            login,
            senhaInicial,
            nivelAcesso,
          }),
        });

        e.target.reset();
        document.getElementById("barb-comissao").value = "50";
        await carregarDadosSistema();
        mostrarToast("Barbeiro cadastrado com sucesso!");
      } catch (erro) {
        mostrarToast(erro.message, "erro");
      }
    });

  // Cadastro de novo serviço
  document
    .getElementById("form-novo-servico")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const nome = document.getElementById("serv-nome").value;
        const preco = Number(document.getElementById("serv-preco").value);
        const comissaoVal = document.getElementById("serv-comissao").value;

        await requisitarApi("/api/servicos", {
          method: "POST",
          body: JSON.stringify({
            nome,
            preco,
            taxaComissaoEspecifica:
              comissaoVal !== "" ? Number(comissaoVal) : undefined,
          }),
        });

        e.target.reset();
        await carregarDadosSistema();
        mostrarToast("Serviço adicionado ao catálogo!");
      } catch (erro) {
        mostrarToast(erro.message, "erro");
      }
    });

  inicializarSessao();
});
