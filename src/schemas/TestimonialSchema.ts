import {object, string} from 'joi';

export default object({
  testimonial: string().min(3).max(60).required(),
}).options({abortEarly: false});
