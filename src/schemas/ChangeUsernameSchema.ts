import {object, string} from 'joi';

export default object({
  username: string().alphanum().min(3).max(30).required(),

  password: string().required(),
}).options({abortEarly: false});
