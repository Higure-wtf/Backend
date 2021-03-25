import {any, object, string} from 'joi';

export default object({
  domain: any().required(),

  subdomain: string().allow('').optional(),
}).options({abortEarly: false});
