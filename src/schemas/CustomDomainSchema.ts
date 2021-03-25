import {boolean, object, string} from 'joi';

export default object({
  name: string().required(),

  wildcard: boolean().required(),

  userOnly: boolean().required(),
}).options({abortEarly: false});
