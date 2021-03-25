import {Request, Response, Router} from 'express';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import AuthMiddleware from '../middlewares/AuthMiddleware';
import InviteModel from '../models/InviteModel';
import UserModel from '../models/UserModel';
import {generateInvite} from '../utils/GenerateUtil';

const router = Router();

router.post('/', AuthMiddleware, async (req: Request, res: Response) => {
  const {user} = req;

  if (user.invites <= 0 && !user.admin)
    return res.status(401).json({
      success: false,
      error: 'you do not have any invites',
    });

  const invite = generateInvite();
  const dateCreated = new Date();

  await InviteModel.create({
    _id: invite,
    createdBy: {
      username: user.username,
      uuid: user._id,
    },
    dateCreated,
    dateRedeemed: null,
    usedBy: null,
    redeemed: false,
    useable: true,
  });

  if (!user.admin)
    await UserModel.findByIdAndUpdate(user._id, {
      invites: user.invites - 1,
    });

  res.status(200).json({
    success: true,
    link: `https://higure.wtf/?code=${invite}`,
    code: invite,
    dateCreated,
  });
});

router.get('/', AdminMiddleware, async (_req: Request, res: Response) => {
  const count = await InviteModel.countDocuments();

  const invites = await InviteModel.find({}).select('-__v');

  const redeemedInvites = await InviteModel.find({redeemed: true}).select(
    '-__v'
  );

  const unusableInvites = await InviteModel.find({useable: false}).select(
    '-__v'
  );

  res.json({
    success: true,
    count,
    invites,
    redeemedInvites,
    unusableInvites,
  });
});

router.get('/:code', AdminMiddleware, async (req: Request, res: Response) => {
  const {code} = req.params;

  const invite = await InviteModel.findById(code).select('-__v');

  if (!invite)
    return res.status(404).json({
      success: false,
      error: 'invalid invite code',
    });

  res.status(200).json({
    success: true,
    invite,
  });
});

router.delete(
  '/:code',
  AdminMiddleware,
  async (req: Request, res: Response) => {
    const {code} = req.params;

    const invite = await InviteModel.findById(code);

    if (!invite)
      return res.status(404).json({
        success: false,
        error: 'invalid invite code',
      });

    try {
      await InviteModel.findByIdAndUpdate(invite._id, {
        useable: false,
      });

      res.status(200).json({
        success: true,
        message: 'deleted invite successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;
