import {getModelForClass, modelOptions, prop} from '@typegoose/typegoose';

@modelOptions({options: {allowMixed: 0}})
export class Shortener {
  /**
   * The shortened id.
   */
  @prop()
  shortId: string;

  /**
   * The destination url.
   */
  @prop()
  destination: string;

  /**
   * The key used to delete the link.
   */
  @prop()
  deletionKey: string;

  /**
   * The date the url was shortened.
   */
  @prop()
  timestamp: Date;

  /**
   * The uuid of the user who shortened the url.
   */
  @prop()
  user: string;
}

export default getModelForClass(Shortener);
