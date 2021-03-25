import {Request, Response, Router} from 'express';
import PasswordResetModel, {
  PasswordReset,
} from '../../models/PasswordResetModel';
import ValidationMiddleware from '../../middlewares/ValidationMiddleware';
import PasswordResetConfirmationSchema from '../../schemas/PasswordResetConfirmationSchema';
import UserModel, {User} from '../../models/UserModel';
import {generateString} from '../../utils/GenerateUtil';
import PasswordResetSchema from '../../schemas/PasswordResetSchema';
import {hash, verify} from 'argon2';
import RefreshTokenModel from '../../models/RefreshTokenModel';

const router = Router();

router.post(
  '/send',
  ValidationMiddleware(PasswordResetConfirmationSchema),
  async (req: Request, res: Response) => {
    if (req.user)
      return res.status(400).json({
        success: false,
        error: 'you are already logged in',
      });

    const {email} = req.body;
    let user: PasswordReset | User = await PasswordResetModel.findOne({email});

    if (user)
      return res.status(400).json({
        success: false,
        error: 'you already have a ongoing password reset',
      });

    user = await UserModel.findOne({email});

    const resetKey = generateString(40);

    try {
      if (user) {
        //await sendPasswordReset(user, resetKey);

        const doc = await PasswordResetModel.create({
          _id: resetKey,
          user: user._id,
          email,
        });

        setTimeout(async () => {
          await doc.remove();
        }, 600000);
      }

      res.status(200).json({
        success: true,
        message:
          "if a user exist with that email we'll send over the password reset instructions",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.post(
  '/reset',
  ValidationMiddleware(PasswordResetSchema),
  async (req: Request, res: Response) => {
    let {user} = req;

    if (user)
      return res.status(400).json({
        success: false,
        error: 'you are already logged in',
      });

    const {key, password, confirmPassword} = req.body;
    const reset = await PasswordResetModel.findById(key);

    if (!reset)
      return res.status(404).json({
        success: false,
        error: 'invalid key',
      });

    user = await UserModel.findById(reset.user);

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'the user attached to this reset does not exist',
      });

      await reset.remove();

      return;
    }

    if (password.trim() !== confirmPassword.trim())
      return res.status(400).json({
        success: false,
        error: 'confirmation must match password',
      });

    if (await verify(user.password, password))
      return res.status(400).json({
        success: false,
        error: 'you must choose a different password',
      });

    try {
      await RefreshTokenModel.deleteMany({user: user._id});

      await UserModel.findByIdAndUpdate(user._id, {
        password: await hash(password),
      });

      await reset.remove();

      res.status(200).json({
        success: true,
        message: 'reset password successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.get('/:key', async (req: Request, res: Response) => {
  const {key} = req.params;
  const doc = await PasswordResetModel.findById(key);

  if (!doc)
    return res.status(404).json({
      success: false,
      error: 'invalid key',
    });

  res.status(200).json({
    success: true,
    message: 'valid key',
  });
});

export default router;
