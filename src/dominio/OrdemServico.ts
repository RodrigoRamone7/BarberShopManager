import { Barbeiro } from "./Barbeiro";
import { Dinheiro } from "./Dinheiro";
import { ItemOrdemServico } from "./ItemOrdemServico";
import { MetodoPagamento } from "./MetodoPagamento";
import { NivelAcesso } from "./NivelAcesso";
import { Servico } from "./Servico";

export interface ServicoRealizadoInput {
  servico: Servico;
  valorPersonalizado?: Dinheiro;
}

export type TipoAcaoAuditoriaOrdem = "EDICAO" | "EXCLUSAO_LOGICA";

export interface RegistroAuditoriaOrdem {
  id: string;
  acao: TipoAcaoAuditoriaOrdem;
  realizadoPorId: string;
  realizadoPorNome: string;
  realizadoPorNivel: NivelAcesso;
  realizadoEm: Date;
  motivo: string;
  resumoAnterior: string;
  resumoNovo?: string;
}

export interface OrdemServicoProps {
  id: string;
  barbeiro: Barbeiro;
  servicos: ServicoRealizadoInput[];
  metodoPagamento: MetodoPagamento;
  realizadoEm?: Date;
  observacoes?: string;
}

export interface OrdemServicoPersistidaProps {
  id: string;
  barbeiroId: string;
  itens: ItemOrdemServico[];
  metodoPagamento: MetodoPagamento;
  realizadoEm: Date;
  observacoes?: string;
  excluida?: boolean;
  excluidaEm?: Date;
  excluidaPorId?: string;
  excluidaPorNome?: string;
  motivoExclusao?: string;
  historicoAuditoria?: RegistroAuditoriaOrdem[];
}

export class OrdemServico {
  public readonly id: string;
  public readonly barbeiroId: string;
  private _itens: ReadonlyArray<ItemOrdemServico>;
  private _metodoPagamento: MetodoPagamento;
  public readonly realizadoEm: Date;
  private _observacoes?: string;

  private _excluida: boolean;
  private _excluidaEm?: Date;
  private _excluidaPorId?: string;
  private _excluidaPorNome?: string;
  private _motivoExclusao?: string;
  private readonly _historicoAuditoria: RegistroAuditoriaOrdem[];

  constructor(props: OrdemServicoProps | OrdemServicoPersistidaProps) {
    if (!props.id.trim()) {
      throw new Error("O identificador da ordem de serviço é obrigatório.");
    }

    if ("barbeiro" in props) {
      if (!props.barbeiro.ativo) {
        throw new Error(
          "Não é possível lançar uma ordem para um barbeiro inativo."
        );
      }
      if (props.servicos.length === 0) {
        throw new Error(
          "A ordem de serviço deve conter pelo menos um serviço."
        );
      }

      this.id = props.id.trim();
      this.barbeiroId = props.barbeiro.id;
      this._itens = props.servicos.map(
        (item) =>
          new ItemOrdemServico({
            servico: item.servico,
            barbeiro: props.barbeiro,
            valorPersonalizado: item.valorPersonalizado,
          })
      );
      this._metodoPagamento = props.metodoPagamento;
      this.realizadoEm = props.realizadoEm ?? new Date();
      this._observacoes = props.observacoes?.trim();
      this._excluida = false;
      this._historicoAuditoria = [];
    } else {
      if (props.itens.length === 0) {
        throw new Error(
          "A ordem de serviço deve conter pelo menos um serviço."
        );
      }
      this.id = props.id.trim();
      this.barbeiroId = props.barbeiroId;
      this._itens = props.itens;
      this._metodoPagamento = props.metodoPagamento;
      this.realizadoEm = props.realizadoEm;
      this._observacoes = props.observacoes?.trim();
      this._excluida = props.excluida ?? false;
      this._excluidaEm = props.excluidaEm;
      this._excluidaPorId = props.excluidaPorId;
      this._excluidaPorNome = props.excluidaPorNome;
      this._motivoExclusao = props.motivoExclusao;
      this._historicoAuditoria = [...(props.historicoAuditoria ?? [])];
    }
  }

  public static reconstituir(props: OrdemServicoPersistidaProps): OrdemServico {
    return new OrdemServico(props);
  }

  get itens(): ReadonlyArray<ItemOrdemServico> {
    return this._itens;
  }

  get metodoPagamento(): MetodoPagamento {
    return this._metodoPagamento;
  }

  get observacoes(): string | undefined {
    return this._observacoes;
  }

  get excluida(): boolean {
    return this._excluida;
  }

  get excluidaEm(): Date | undefined {
    return this._excluidaEm;
  }

  get excluidaPorId(): string | undefined {
    return this._excluidaPorId;
  }

  get excluidaPorNome(): string | undefined {
    return this._excluidaPorNome;
  }

  get motivoExclusao(): string | undefined {
    return this._motivoExclusao;
  }

  get historicoAuditoria(): ReadonlyArray<RegistroAuditoriaOrdem> {
    return this._historicoAuditoria;
  }

  public gerarResumoEstadoAtual(): string {
    const nomesItens = this._itens
      .map(
        (i) => `${i.nomeServicoHistorico} (${i.valorCobrado.formatar()})`
      )
      .join(" + ");
    return `${nomesItens} | Total: ${this.valorTotal.formatar()} | Comissão: ${this.valorTotalComissaoBarbeiro.formatar()} | Pagamento: ${
      this._metodoPagamento
    }${this._observacoes ? ` | Obs: ${this._observacoes}` : ""}`;
  }

  public editar(props: {
    idAuditoria: string;
    responsavel: {
      id: string;
      nome: string;
      nivelAcesso: NivelAcesso;
    };
    barbeiro: Barbeiro;
    servicos: ServicoRealizadoInput[];
    metodoPagamento: MetodoPagamento;
    observacoes?: string;
    motivo: string;
    realizadoEm?: Date;
  }): void {
    if (this._excluida) {
      throw new Error(
        "Não é possível editar uma ordem de serviço que já foi excluída."
      );
    }
    if (!props.motivo || !props.motivo.trim()) {
      throw new Error(
        "É obrigatório informar o motivo para editar uma ordem de serviço."
      );
    }
    if (props.servicos.length === 0) {
      throw new Error("A ordem de serviço deve conter pelo menos um serviço.");
    }

    const resumoAnterior = this.gerarResumoEstadoAtual();

    this._itens = props.servicos.map(
      (item) =>
        new ItemOrdemServico({
          servico: item.servico,
          barbeiro: props.barbeiro,
          valorPersonalizado: item.valorPersonalizado,
        })
    );
    this._metodoPagamento = props.metodoPagamento;
    this._observacoes = props.observacoes?.trim() || undefined;

    const resumoNovo = this.gerarResumoEstadoAtual();

    this._historicoAuditoria.push({
      id: props.idAuditoria,
      acao: "EDICAO",
      realizadoPorId: props.responsavel.id,
      realizadoPorNome: props.responsavel.nome,
      realizadoPorNivel: props.responsavel.nivelAcesso,
      realizadoEm: props.realizadoEm ?? new Date(),
      motivo: props.motivo.trim(),
      resumoAnterior,
      resumoNovo,
    });
  }

  public excluirLogicamente(props: {
    idAuditoria: string;
    responsavel: {
      id: string;
      nome: string;
      nivelAcesso: NivelAcesso;
    };
    motivo: string;
    realizadoEm?: Date;
  }): void {
    if (this._excluida) {
      throw new Error("Esta ordem de serviço já está excluída.");
    }
    if (!props.motivo || !props.motivo.trim()) {
      throw new Error(
        "É obrigatório informar o motivo para excluir uma ordem de serviço."
      );
    }

    const dataAcao = props.realizadoEm ?? new Date();
    const resumoAnterior = this.gerarResumoEstadoAtual();

    this._excluida = true;
    this._excluidaEm = dataAcao;
    this._excluidaPorId = props.responsavel.id;
    this._excluidaPorNome = props.responsavel.nome;
    this._motivoExclusao = props.motivo.trim();

    this._historicoAuditoria.push({
      id: props.idAuditoria,
      acao: "EXCLUSAO_LOGICA",
      realizadoPorId: props.responsavel.id,
      realizadoPorNome: props.responsavel.nome,
      realizadoPorNivel: props.responsavel.nivelAcesso,
      realizadoEm: dataAcao,
      motivo: props.motivo.trim(),
      resumoAnterior,
    });
  }

  /** Soma total cobrada do cliente nesta Ordem de Serviço */
  get valorTotal(): Dinheiro {
    return this._itens.reduce(
      (total, item) => total.somar(item.valorCobrado),
      Dinheiro.zero()
    );
  }

  /** Soma total da comissão do barbeiro nesta Ordem de Serviço */
  get valorTotalComissaoBarbeiro(): Dinheiro {
    return this._itens.reduce(
      (total, item) => total.somar(item.valorComissaoBarbeiro),
      Dinheiro.zero()
    );
  }

  /** Soma total que fica para a barbearia nesta Ordem de Serviço */
  get valorTotalBarbearia(): Dinheiro {
    return this._itens.reduce(
      (total, item) => total.somar(item.valorBarbearia),
      Dinheiro.zero()
    );
  }
}
