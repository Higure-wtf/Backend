/* eslint-disable camelcase */

export interface AuthorizationInterface {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}
