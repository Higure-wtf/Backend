import {object, string} from 'joi';

export default object({
  username: string().alphanum().min(3).max(30).required(),

  password: string().min(5).max(60).required(),
}).options({abortEarly: false});
