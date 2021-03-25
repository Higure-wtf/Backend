import {boolean, object, string} from 'joi';

export default object({
  color: string().optional(),

  title: string().optional().allow('').max(200),

  description: string().optional().allow('').max(2000),

  author: string().optional().allow('').max(200),

  randomColor: boolean().optional(),
}).options({abortEarly: false});
