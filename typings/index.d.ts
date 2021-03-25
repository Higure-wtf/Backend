/* eslint-disable no-unused-vars */
import {User} from '../src/models/UserModel';
import {OAuth} from '../src/utils/OAuthUtil';

declare global {
  namespace Express {
    export interface Request {
      user: User;
      discord: OAuth;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  namespace Express.Multer {
    export interface File {
      key: string;
      userOnlyDomain: boolean;
    }
  }
}
