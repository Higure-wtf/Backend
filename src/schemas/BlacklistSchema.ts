import {object, string} from 'joi';

export default object({
  id: string().required(),

  reason: string().required(),

  executerId: string().required(),
}).options({abortEarly: false});
