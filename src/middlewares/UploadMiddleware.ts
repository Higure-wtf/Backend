import {NextFunction, Request, Response} from 'express';
import DomainModel from '../models/DomainModel';
import UserModel from '../models/UserModel';

export default async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers.key as string;

  if (!key)
    return res.status(400).json({
      success: false,
      error: 'provide a key',
    });

  const user = await UserModel.findOne({key});

  if (!user)
    return res.status(401).json({
      success: false,
      error: 'invalid key',
    });

  if (user.blacklisted.status)
    return res.status(401).json({
      success: false,
      error: `you are blacklisted for: ${user.blacklisted.reason}`,
    });

  if (user.disabled)
    return res.status(401).json({
      success: false,
      error: "you've disabled your account",
    });

  if (!user.emailVerified)
    return res.status(401).json({
      success: false,
      error: 'please verify your email',
    });

  if (!user.discord.id || user.discord.id === '')
    return res.status(401).json({
      success: false,
      error: 'please link your discord',
    });

  const domain = await DomainModel.findOne({name: user.settings.domain.name});

  if (!domain)
    return res.status(400).json({
      success: false,
      erorr: 'invalid domain, change it on the dashboard',
    });

  if (domain.userOnly && domain.donatedBy && domain.donatedBy !== user._id)
    return res.status(401).json({
      success: false,
      error: 'you are not allowed to upload to this domain',
    });

  req.user = user;
  next();
};
