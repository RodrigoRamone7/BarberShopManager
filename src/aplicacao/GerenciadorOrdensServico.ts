import { randomUUID } from "crypto";
import { PayloadToken } from "../autenticacao";
import { Dinheiro, MetodoPagamento, OrdemServico } from "../dominio";
import {
  RepositorioOrdemServico,
  RepositorioPessoa,
  RepositorioServico,
} from "../repositorios";
import {
  exigirPermissaoAdministrador,
  exigirPermissaoGestao,
  exigirPermissaoProprioOuGestao,
} from "./permissoes";

export interface LancarOrdemInput {
  barbeiroId?: string;
  itens: Array<{
    servicoId: string;
    valorPersonalizado?: number;
  }>;
  metodoPagamento: MetodoPagamento;
  realizadoEm?: Date;
  observacoes?: string;
}

export interface EditarOrdemInput {
  itens: Array<{
    servicoId: string;
    valorPersonalizado?: number;
  }>;
  metodoPagamento: MetodoPagamento;
  observacoes?: string;
  motivo: string;
}

export class GerenciadorOrdensServico {
  constructor(
    private readonly repoPessoa: RepositorioPessoa,
    private readonly repoServico: RepositorioServico,
    private readonly repoOrdem: RepositorioOrdemServico
  ) {}

  public async lancarOrdem(
    solicitante: PayloadToken,
    dados: LancarOrdemInput
  ): Promise<OrdemServico> {
    const barbeiroAlvoId = dados.barbeiroId ?? solicitante.pessoaId;
    exigirPermissaoProprioOuGestao(solicitante, barbeiroAlvoId);

    const barbeiro = await this.repoPessoa.buscarBarbeiroPorId(barbeiroAlvoId);
    if (!barbeiro) {
      throw new Error("Barbeiro não encontrado.");
    }

    const servicosCarregados = await Promise.all(
      dados.itens.map(async (item) => {
        const servico = await this.repoServico.buscarPorId(item.servicoId);
        if (!servico) {
          throw new Error(`Serviço não encontrado: ${item.servicoId}`);
        }
        return {
          servico,
          valorPersonalizado:
            item.valorPersonalizado !== undefined
              ? new Dinheiro(item.valorPersonalizado)
              : undefined,
        };
      })
    );

    const ordem = new OrdemServico({
      id: randomUUID(),
      barbeiro,
      servicos: servicosCarregados,
      metodoPagamento: dados.metodoPagamento,
      realizadoEm: dados.realizadoEm,
      observacoes: dados.observacoes,
    });

    await this.repoOrdem.salvar(ordem);
    return ordem;
  }

  public async editarOrdem(
    solicitante: PayloadToken,
    ordemId: string,
    dados: EditarOrdemInput
  ): Promise<OrdemServico> {
    exigirPermissaoGestao(solicitante);

    const ordem = await this.repoOrdem.buscarPorId(ordemId);
    if (!ordem) {
      throw new Error("Ordem de serviço não encontrada.");
    }

    const barbeiro = await this.repoPessoa.buscarBarbeiroPorId(
      ordem.barbeiroId
    );
    if (!barbeiro) {
      throw new Error("Barbeiro da ordem de serviço não encontrado.");
    }

    const servicosCarregados = await Promise.all(
      dados.itens.map(async (item) => {
        const servico = await this.repoServico.buscarPorId(item.servicoId);
        if (!servico) {
          throw new Error(`Serviço não encontrado: ${item.servicoId}`);
        }
        return {
          servico,
          valorPersonalizado:
            item.valorPersonalizado !== undefined
              ? new Dinheiro(item.valorPersonalizado)
              : undefined,
        };
      })
    );

    const pessoaEditora = await this.repoPessoa.buscarPorId(
      solicitante.pessoaId
    );

    ordem.editar({
      idAuditoria: randomUUID(),
      responsavel: {
        id: solicitante.pessoaId,
        nome: pessoaEditora?.nome ?? solicitante.nome,
        nivelAcesso: solicitante.nivelAcesso,
      },
      barbeiro,
      servicos: servicosCarregados,
      metodoPagamento: dados.metodoPagamento,
      observacoes: dados.observacoes,
      motivo: dados.motivo,
    });

    await this.repoOrdem.salvar(ordem);
    return ordem;
  }

  public async excluirOrdemLogicamente(
    solicitante: PayloadToken,
    ordemId: string,
    motivo: string
  ): Promise<OrdemServico> {
    exigirPermissaoGestao(solicitante);

    const ordem = await this.repoOrdem.buscarPorId(ordemId);
    if (!ordem) {
      throw new Error("Ordem de serviço não encontrada.");
    }

    const pessoaResponsavel = await this.repoPessoa.buscarPorId(
      solicitante.pessoaId
    );

    ordem.excluirLogicamente({
      idAuditoria: randomUUID(),
      responsavel: {
        id: solicitante.pessoaId,
        nome: pessoaResponsavel?.nome ?? solicitante.nome,
        nivelAcesso: solicitante.nivelAcesso,
      },
      motivo,
    });

    await this.repoOrdem.salvar(ordem);
    return ordem;
  }

  public async listarOrdensDoBarbeiro(
    solicitante: PayloadToken,
    barbeiroId?: string,
    inicioPeriodo?: Date,
    fimPeriodo?: Date
  ): Promise<OrdemServico[]> {
    const barbeiroAlvoId = barbeiroId ?? solicitante.pessoaId;
    exigirPermissaoProprioOuGestao(solicitante, barbeiroAlvoId);

    return this.repoOrdem.listar({
      barbeiroId: barbeiroAlvoId,
      inicioPeriodo,
      fimPeriodo,
      incluirExcluidas: false,
    });
  }

  /**
   * Exclusivo para o ADMINISTRADOR: retorna todas as ordens que foram
   * excluídas logicamente ou editadas por gestores/administradores.
   */
  public async listarOrdensAuditadasParaAdmin(
    solicitante: PayloadToken,
    inicioPeriodo?: Date,
    fimPeriodo?: Date
  ): Promise<OrdemServico[]> {
    exigirPermissaoAdministrador(solicitante);

    const todas = await this.repoOrdem.listar({
      inicioPeriodo,
      fimPeriodo,
      incluirExcluidas: true,
    });

    return todas.filter(
      (ordem) => ordem.excluida || ordem.historicoAuditoria.length > 0
    );
  }
}
