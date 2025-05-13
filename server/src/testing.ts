/**
 * default way of creating a request is to use the Request constructor
 * @param url 
 * @param init 
 * @returns 
 */
export function defaultCreateRequest(url: string | URL, init?: RequestInit) {
  const baseUrl = 'http://example.example'
  const requestUrl = new URL(url, baseUrl)
  return new Request(requestUrl, init)
}
