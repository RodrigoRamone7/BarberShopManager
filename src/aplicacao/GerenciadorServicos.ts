import { randomUUID } from "crypto";
import { PayloadToken } from "../autenticacao";
import { Dinheiro, Servico } from "../dominio";
import { RepositorioServico } from "../repositorios";
import { exigirPermissaoGestao } from "./permissoes";

export interface CadastrarServicoInput {
  nome: string;
  preco: number;
  taxaComissaoEspecifica?: number;
}

export interface AtualizarServicoInput {
  nome?: string;
  preco?: number;
  taxaComissaoEspecifica?: number | null;
  ativo?: boolean;
}

export class GerenciadorServicos {
  constructor(private readonly repoServico: RepositorioServico) {}

  public async cadastrarServico(
    solicitante: PayloadToken,
    dados: CadastrarServicoInput
  ): Promise<Servico> {
    exigirPermissaoGestao(solicitante);

    const servico = new Servico({
      id: randomUUID(),
      nome: dados.nome,
      preco: new Dinheiro(dados.preco),
      taxaComissaoEspecifica: dados.taxaComissaoEspecifica,
    });

    await this.repoServico.salvar(servico);
    return servico;
  }

  public async atualizarServico(
    solicitante: PayloadToken,
    servicoId: string,
    dados: AtualizarServicoInput
  ): Promise<Servico> {
    exigirPermissaoGestao(solicitante);

    const servico = await this.repoServico.buscarPorId(servicoId);
    if (!servico) {
      throw new Error("Serviço não encontrado.");
    }

    if (dados.nome !== undefined) {
      if (!dados.nome.trim()) {
        throw new Error("O nome do serviço não pode ser vazio.");
      }
      servico.nome = dados.nome.trim();
    }

    if (dados.preco !== undefined) {
      servico.preco = new Dinheiro(dados.preco);
    }

    if (dados.taxaComissaoEspecifica !== undefined) {
      if (dados.taxaComissaoEspecifica === null) {
        servico.taxaComissaoEspecifica = undefined;
      } else {
        if (
          dados.taxaComissaoEspecifica < 0 ||
          dados.taxaComissaoEspecifica > 100
        ) {
          throw new Error("A comissão específica deve estar entre 0 e 100.");
        }
        servico.taxaComissaoEspecifica = dados.taxaComissaoEspecifica;
      }
    }

    if (dados.ativo !== undefined) {
      servico.ativo = dados.ativo;
    }

    await this.repoServico.salvar(servico);
    return servico;
  }

  public async listarServicos(apenasAtivos = true): Promise<Servico[]> {
    return this.repoServico.listar(apenasAtivos);
  }
}
