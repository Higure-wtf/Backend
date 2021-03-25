import {object, string} from 'joi';

export default object({
  executerId: string().required(),
}).options({abortEarly: false});
