import {object, string} from 'joi';

export default object({
  email: string().email().required(),
}).options({abortEarly: false});
