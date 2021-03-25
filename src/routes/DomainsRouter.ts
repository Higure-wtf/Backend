import {Request, Response, Router} from 'express';
import AdminMiddleware from '../middlewares/AdminMiddleware';
import AuthMiddleware from '../middlewares/AuthMiddleware';
import ValidationMiddleware from '../middlewares/ValidationMiddleware';
import DomainModel from '../models/DomainModel';
import UserModel, {User} from '../models/UserModel';
import CustomDomainSchema from '../schemas/CustomDomainSchema';
import DomainSchema from '../schemas/DomainSchema';
import CloudflareUtil from '../utils/CloudflareUtil';
import {logCustomDomain, logDomains} from '../utils/LoggingUtil';
import AdminAuthMiddleware from '../middlewares/AdminAuthMiddleware';
import isValidDomain from 'is-valid-domain';

const router = Router();

router.get('/', AdminAuthMiddleware, async (req: Request, res: Response) => {
  const {user} = req;
  try {
    const count = await DomainModel.countDocuments();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let domains: any = await DomainModel.find({userOnly: false})
      .select('-__v -_id -donatedBy')
      .sort({name: 1})
      .lean();

    if (user)
      domains = (
        await DomainModel.find({
          userOnly: true,
          donatedBy: user._id,
        })
          .select('-__v -_id -donatedBy')
          .lean()
      ).concat(domains);

    for (let i = 0; i < domains.length; i++) {
      domains[i].users = await UserModel.countDocuments({
        'settings.domain.name': domains[i].name,
      });
    }

    res.status(200).json({
      success: true,
      count,
      domains,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

router.post(
  '/',
  AdminMiddleware,
  ValidationMiddleware(DomainSchema),
  async (req: Request, res: Response) => {
    const {user, body} = req;

    if (body.length <= 0)
      return res.status(400).json({
        success: false,
        error: 'provide at least one domain object',
      });
    let donator: User = null;

    try {
      for (const field of body) {
        // eslint-disable-next-line prefer-const
        let {name, wildcard, donated, donatedBy, userOnly} = field;
        const domain = await DomainModel.findOne({name});

        if (domain)
          return res.status(400).json({
            success: false,
            error: `${name} already exists`,
          });

        if (!isValidDomain(name))
          return res.status(401).json({
            success: false,
            error: "domain isn't formatted correctly",
          });
        if (user && userOnly && !donatedBy) {
          donatedBy = user._id;
        } else if (donated) {
          donatedBy = donator = await UserModel.findOne({
            $or: [
              {_id: donatedBy},
              {username: donatedBy},
              {email: donatedBy},
              {invite: donatedBy},
              {key: donatedBy},
              {'discord.id': donatedBy.replace('<@!', '').replace('>', '')},
            ],
          });
          if (!donatedBy) {
            return res.status(400).json({
              success: false,
              error: 'invalid donator',
            });
          }
        }

        await CloudflareUtil.addDomain(name, wildcard).catch(e =>
          console.log(e)
        );

        await DomainModel.create({
          name,
          wildcard,
          donated: donated || false,
          donatedBy: donatedBy || null,
          userOnly: userOnly || false,
          dateAdded: new Date(),
        });
      }
      if (!req.body[0].userOnly) {
        await logDomains(req.body, donator);
      }

      res.status(200).json({
        success: true,
        message: `${
          req.body.length > 1
            ? `added ${req.body.length} domains`
            : 'added domain'
        } successfully`,
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
  '/custom',
  AuthMiddleware,
  ValidationMiddleware(CustomDomainSchema),
  async (req: Request, res: Response) => {
    const {user} = req;
    const {name, wildcard, userOnly} = req.body;

    if (!user.premium && !user.admin)
      return res.status(401).json({
        success: false,
        error: 'you do not have permission to add custom domains',
      });

    if (name.startsWith('http'))
      return res.status(401).json({
        success: false,
        error: 'please enter domains in the right format',
      });

    if (!isValidDomain(name))
      return res.status(401).json({
        success: false,
        error: "domain isn't formatted correctly",
      });

    try {
      const now = Date.now();
      const difference =
        user.lastDomainAddition && now - user.lastDomainAddition.getTime();
      const duration = 43200000 - difference;

      if (user.lastDomainAddition && duration > 0) {
        const hours = Math.floor(duration / 1000 / 60 / 60);
        const minutes = Math.floor((duration / 1000 / 60 / 60 - hours) * 60);
        const timeLeft = `${hours} hours and ${minutes} minutes`;

        res.status(400).json({
          success: false,
          error: `you cannot add a domain for another ${timeLeft}`,
        });

        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let domain: any = await DomainModel.findOne({
        name: {$regex: new RegExp(name, 'i')},
      });

      if (domain)
        return res.status(400).json({
          success: false,
          error: `${name} already exists`,
        });

      await CloudflareUtil.addDomain(name, wildcard);

      domain = await DomainModel.create({
        name,
        wildcard,
        donated: true,
        donatedBy: user._id,
        userOnly: userOnly,
        dateAdded: new Date(),
      });

      await logCustomDomain(domain);

      await UserModel.findByIdAndUpdate(user._id, {
        lastDomainAddition: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'added domain successfully',
        domain,
      });
    } catch (err) {
      console.log(err.response.data);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.delete(
  '/:name',
  AdminMiddleware,
  async (req: Request, res: Response) => {
    const {name} = req.params;
    const domain = await DomainModel.findOne({name});

    if (!domain)
      return res.status(404).json({
        success: false,
        error: 'invalid domain',
      });

    try {
      await CloudflareUtil.deleteZone(domain.name).catch(e => console.log(e));
      await domain.remove();

      await UserModel.updateMany(
        {'settings.domain.name': domain.name},
        {
          'settings.domain.name': 'i.higure.wtf',
          'settings.domain.subdomain': null,
        }
      );

      res.status(200).json({
        success: true,
        message: 'deleted domain successfully',
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.get(
  '/list',
  AdminAuthMiddleware,
  async (_req: Request, res: Response) => {
    try {
      const domains = await DomainModel.find({}).select(
        '-__v -_id -wildcard -donated -donatedBy -dateAdded'
      );

      res.status(200).json(domains.map(d => d.name).join(', '));
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

router.get(
  '/rank',
  AdminAuthMiddleware,
  async (_req: Request, res: Response) => {
    try {
      const domains = await DomainModel.find({});
      const ranks = [];

      for (const domain of domains) {
        const users = await UserModel.countDocuments({
          'settings.domain.name': domain.name,
        });
        ranks.push({
          domain: domain.name,
          users,
        });
      }

      const sorted = ranks.sort((a, b) => a.users - b.users).reverse();

      res.status(200).json(sorted);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

export default router;
