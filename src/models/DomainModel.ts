import {getModelForClass, modelOptions, prop} from '@typegoose/typegoose';

@modelOptions({options: {allowMixed: 0}})
export class Domain {
  /**
   * The domain name.
   */
  @prop()
  name: string;

  /**
   * If the domain is wildcarded or not.
   */
  @prop()
  wildcard: boolean;

  /**
   * If the domain was donated or not.
   */
  @prop()
  donated: boolean;

  /**
   * The uuid of the user who donated the domain.
   */
  @prop()
  donatedBy: string;

  /**
   * Whether or not the domain is only usable by the donator.
   */
  @prop()
  userOnly: boolean;

  /**
   * The date the domain was added.
   */
  @prop()
  dateAdded: Date;
}

export default getModelForClass(Domain);
