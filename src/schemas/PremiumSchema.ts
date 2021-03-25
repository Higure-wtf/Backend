import {object, string} from 'joi';

export default object({
  id: string().required(),
}).options({abortEarly: false});
