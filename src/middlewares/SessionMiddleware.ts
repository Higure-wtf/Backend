import {NextFunction, Request, Response} from 'express';
import {verify} from 'jsonwebtoken';

export default (req: Request, _res: Response, next: NextFunction) => {
  // terrible, I know
  const accessToken =
    req.headers['x-access-token'] &&
    (req.headers['x-access-token'] as string).split(' ')[1];

  if (!accessToken) return next();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token: any = verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    req.user = token;

    next();
  } catch (err) {
    next();
  }
};
