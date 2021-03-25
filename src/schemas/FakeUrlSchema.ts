import {object, string} from 'joi';

export default object({
  url: string().optional().allow('').max(100),
}).options({abortEarly: false});
