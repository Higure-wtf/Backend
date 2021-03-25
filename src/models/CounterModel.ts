import {getModelForClass, modelOptions, prop} from '@typegoose/typegoose';

@modelOptions({options: {allowMixed: 0}})
export class Counter {
  /**
   * The counter identifier.
   */
  @prop()
  _id: string;

  /**
   * The current count.
   */
  @prop()
  count: number;
  /**
   * The current count.
   */
  @prop()
  storageUsed: number;
}

export default getModelForClass(Counter);
