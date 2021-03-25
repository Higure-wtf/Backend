import {number, object, string} from 'joi';

export default object({
  id: string().required(),

  newuid: number().required(),
}).options({abortEarly: false});
