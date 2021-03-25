import {number, object, string} from 'joi';

export default object({
  executerId: string().required(),
  count: number().required(),
}).options({abortEarly: false});
