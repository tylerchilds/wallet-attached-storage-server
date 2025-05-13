export interface IWalletAttachedStorageServer {
  fetch(request: Request): Promise<Response>
}
