import {NextFunction, Request, Response} from 'express';
import {OAuth} from '../utils/OAuthUtil';

export default (request = 'login') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const {code} = req.query;
    const discord = new OAuth(code as string);

    try {
      await discord.validate(request);
      await discord.getUser();

      req.discord = discord;
      next();
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  };
};
