import {number, object} from 'joi';

export default object({
  value: number().required(),
}).options({abortEarly: false});
