import { NextFunction, Request, Response } from "express";
import { CasoDeUsoAutenticacao } from "../aplicacao";
import { PayloadToken } from "../autenticacao";
import { NivelAcesso } from "../dominio";

declare global {
  namespace Express {
    interface Request {
      usuario?: PayloadToken;
    }
  }
}

export function criarMiddlewareAutenticacao(
  casoDeUsoAuth: CasoDeUsoAutenticacao,
  niveisPermitidos?: NivelAcesso[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const cabecalhoAuth = req.headers.authorization;
      if (!cabecalhoAuth || !cabecalhoAuth.startsWith("Bearer ")) {
        res.status(401).json({
          erro: "Token de autenticação não fornecido.",
        });
        return;
      }

      const token = cabecalhoAuth.slice("Bearer ".length).trim();
      const payload = casoDeUsoAuth.validarToken(token, niveisPermitidos);
      req.usuario = payload;
      next();
    } catch (erro) {
      const mensagem =
        erro instanceof Error ? erro.message : "Falha na autenticação.";
      const status = mensagem.includes("Acesso negado") ? 403 : 401;
      res.status(status).json({ erro: mensagem });
    }
  };
}
