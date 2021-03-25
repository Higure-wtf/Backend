import {number, object, string} from 'joi';

export default object({
  id: string().required(),

  amount: number().required(),
}).options({abortEarly: false});
