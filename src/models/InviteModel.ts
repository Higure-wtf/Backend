import {getModelForClass, modelOptions, prop} from '@typegoose/typegoose';

@modelOptions({options: {allowMixed: 0}})
export class Invite {
  /**
   * The invite code.
   */
  @prop()
  _id: string;

  /**
   * The user who created the invite.
   */
  @prop()
  createdBy: {
    username: string;
    uuid: string;
  };

  /**
   * The date the invite was created.
   */
  @prop()
  dateCreated: Date;

  /**
   * The date it was redeemed on.
   */
  @prop()
  dateRedeemed: Date;

  /**
   * The user who claimed the invite.
   */
  @prop()
  usedBy: string;

  /**
   * Whether or not the invite has been redeemed.
   */
  @prop()
  redeemed: boolean;

  /**
   * Whether or not the invite is useable.
   */
  @prop()
  useable: boolean;
}

export default getModelForClass(Invite);
