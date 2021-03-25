import {object, string} from 'joi';

export default object({
  key: string().required(),
}).options({abortEarly: false});
