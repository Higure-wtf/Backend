import {object, string} from 'joi';

export default object({
  key: string().required(),

  password: string().min(5).max(60).required(),

  confirmPassword: string().min(5).max(60).required(),
}).options({abortEarly: false});
