import { randomUUID } from "crypto";
import { PayloadToken } from "../autenticacao";
import { Dinheiro, MetodoPagamento, OrdemServico } from "../dominio";
import {
  RepositorioOrdemServico,
  RepositorioPessoa,
  RepositorioServico,
} from "../repositorios";
import { exigirPermissaoProprioOuGestao } from "./permissoes";

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
    });
  }
}
