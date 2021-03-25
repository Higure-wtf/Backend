import {getModelForClass, modelOptions, prop} from '@typegoose/typegoose';

@modelOptions({options: {allowMixed: 0}})
export class RefreshToken {
  /**
   * The refresh token.
   */
  @prop()
  token: string;

  /**
   * The uuid of the user who made the token.
   */
  @prop()
  user: string;

  /**
   * The date the token is going to expire.
   */
  @prop()
  expires: Date;
}

export default getModelForClass(RefreshToken);
