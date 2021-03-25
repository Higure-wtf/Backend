import {Request, Response, Router} from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 200,
    message: 'Hello there ( ͡° ͜ʖ ͡°)',
  });
});

export default router;
