import {object, string} from 'joi';

export default object({
  url: string().required(),
}).options({abortEarly: false});
