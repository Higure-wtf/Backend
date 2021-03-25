import {boolean, object} from 'joi';

export default object({
  longUrl: boolean().optional(),

  showLink: boolean().optional(),

  invisibleUrl: boolean().optional(),

  randomDomain: boolean().optional(),

  embeds: boolean().optional(),

  autoWipe: boolean().optional(),

  fakeUrl: boolean().optional(),
}).options({abortEarly: false});
