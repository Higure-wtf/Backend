import {NextFunction, Request, Response} from 'express';
import UserModel from '../models/UserModel';

export default async (req: Request, res: Response, next: NextFunction) => {
  let {user} = req;
  const key = req.headers.authorization as string;

  if (user) user = await UserModel.findById(user._id);

  if ((!key && !user) || (key !== process.env.API_KEY && !user))
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
    });

  next();
};
