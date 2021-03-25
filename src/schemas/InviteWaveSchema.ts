import {number, object} from 'joi';

export default object({
  amount: number().required(),
}).options({abortEarly: false});
