import {object, string} from 'joi';

export default object({
  newPassword: string().min(5).max(60).required(),

  password: string().required(),
}).options({abortEarly: false});
