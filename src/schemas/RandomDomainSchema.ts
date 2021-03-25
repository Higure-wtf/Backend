import {object, string} from 'joi';

export default object({
  domain: string().required(),
}).options({abortEarly: false});
