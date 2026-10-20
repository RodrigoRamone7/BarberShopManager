import { PayloadToken } from "../autenticacao";
import { NivelAcesso } from "../dominio";

export function exigirPermissaoGestao(solicitante: PayloadToken): void {
  if (
    solicitante.nivelAcesso !== NivelAcesso.ADMINISTRADOR &&
    solicitante.nivelAcesso !== NivelAcesso.GESTOR
  ) {
    throw new Error(
      "Acesso negado: esta operação exige perfil de Gestor ou Administrador."
    );
  }
}

export function exigirPermissaoProprioOuGestao(
  solicitante: PayloadToken,
  barbeiroAlvoId: string
): void {
  const ehGestao =
    solicitante.nivelAcesso === NivelAcesso.ADMINISTRADOR ||
    solicitante.nivelAcesso === NivelAcesso.GESTOR;

  if (!ehGestao && solicitante.pessoaId !== barbeiroAlvoId) {
    throw new Error(
      "Acesso negado: operadores só podem realizar esta operação para o próprio usuário."
    );
  }
}
