import Axios from 'axios';
import {Domain} from '../models/DomainModel';
import {User} from '../models/UserModel';

/**
 * Log a list of new domains to the domain notifications channel.
 * @param {Domain[]} domains The domain that was created.
 * @param {User} donatedby The donator
 */
async function logDomains(domains: Domain[], donatedby: User) {
  const grammar =
    domains.length > 1
      ? `**${domains.length}** new domains have`
      : 'A new domain has';
  const domainList = domains
    .map(d => (d.wildcard ? '*.' : '') + d.name)
    .join(',\n');

  await Axios.post(process.env.WEBHOOK_URL, {
    embeds: [
      {
        description: `${grammar} been added, DNS records have automatically been updated.`,
        fields: [
          {
            name: 'Domains',
            value: `\`\`\`${domainList}\`\`\``,
          },
          {
            name: 'Donated By:',
            value: !donatedby
              ? `Official Domain${domains.length > 1 ? 's' : ''}`
              : `${donatedby.username} (<@${donatedby.discord.id}>)`,
          },
        ],
      },
    ],
  });
}

/**
 * Log a single custom domain to the webhook in the server.
 * @param {Domain} domain The domain.
 */
async function logCustomDomain(domain: Domain) {
  await Axios.post(process.env.CUSTOM_DOMAIN_WEBHOOK, {
    embeds: [
      {
        title: 'A new domain has been added',
        fields: [
          {
            name: 'Name',
            value: `[${domain.name}](https://${domain.name})`,
          },
          {
            name: 'Wildcard',
            value: domain.wildcard ? 'Yes' : 'No',
          },
          {
            name: 'Donator',
            value: domain.donatedBy,
          },
          {
            name: 'Private',
            value: domain.userOnly ? 'Yes' : 'No',
          },
        ],
      },
    ],
  });
}

/**
 * Log a possible alt to the discord.
 * @param {User[]} relatedAlts The users.
 * @param alt
 * @param register
 */
async function logPossibleAlts(
  relatedAlts: User[],
  alt: User,
  register: boolean
) {
  const altsList = relatedAlts
    .map(d => d.username + (d.blacklisted.status ? ' (Blacklisted)' : ''))
    .join(', ');
  await Axios.post(process.env.CUSTOM_DOMAIN_WEBHOOK, {
    embeds: [
      {
        title: `A new possible account has ${
          register ? 'registered' : 'logged in'
        }`,
        fields: [
          {
            name: 'Username:',
            value: alt.username,
            inline: true,
          },
          {
            name: 'UID:',
            value: `${alt.uid}`,
            inline: true,
          },
          {
            name: 'Uploads:',
            value: alt.uploads,
            inline: true,
          },
          {
            name: 'Discord:',
            value: alt.discord.id ? `<@${alt.discord.id}>` : 'Not linked',
            inline: true,
          },
          {
            name: 'Relative accounts:',
            value: `\`\`\`${altsList}\`\`\``,
          },
          {
            name: 'UUID:',
            value: `\`\`\`${alt._id}\`\`\``,
          },
        ],
        thumbnail: {
          url: alt.discord.avatar,
        },
      },
    ],
  });
}

export {logDomains, logCustomDomain, logPossibleAlts};
