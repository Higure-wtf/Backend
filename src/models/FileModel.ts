import {getModelForClass, modelOptions, prop} from '@typegoose/typegoose';

@modelOptions({options: {allowMixed: 0}})
export class File {
  /**
   * The filename.
   */
  @prop()
  filename: string;

  /**
   * The s3 key.
   */
  @prop()
  key: string;

  /**
   * The timestamp the file was uploaded at.
   */
  @prop()
  timestamp: Date;

  /**
   * The file's mimetype.
   */
  @prop()
  mimetype: string;

  /**
   * The file size.
   */
  @prop()
  size: string;

  /**
   * The domain the user used.
   */
  @prop()
  domain: string;

  /**
   * Whether or not the domain is user-only.
   */
  @prop()
  userOnlyDomain: boolean;

  /**
   * The file's deletion key.
   */
  @prop()
  deletionKey: string;

  /**
   * The file's embed settings.
   */
  @prop()
  embed: {
    enabled: boolean;
    color: string;
    title: string;
    description: string;
    author: string;
    randomColor: boolean;
  };

  /**
   * Whether or not the file's link should show in discord.
   */
  @prop()
  showLink: boolean;

  /**
   * The user who uploaded the file.
   */
  @prop()
  uploader: {
    uuid: string;
    username: string;
  };
}

export default getModelForClass(File);
