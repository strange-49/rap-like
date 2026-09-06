// Runtime secret storage will be selected before authentication is implemented.
export interface SecretProvider {
  getSecret(name: string): Promise<string>;
}
