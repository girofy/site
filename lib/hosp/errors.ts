/** Erro esperado da hospedagem: a mensagem é segura para mostrar a quem chamou a API. */
export class HospError extends Error {
  constructor(readonly status: number, message: string, readonly code = "") {
    super(message);
  }
}
