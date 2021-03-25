import Axios, {Method} from 'axios';

export default new (class CloudflareUtil {
  /**
   * Send a request to the cloudflare api.
   * @param {string} endpoint The endpoint to send a request to.
   * @param {Method} method The request method.
   * @param {object} body The request body.
   */
  async request(endpoint: string, method: Method, body?: object) {
    try {
      const baseUrl = 'https://api.cloudflare.com/client/v4';
      const {data} = await Axios({
        url: `${baseUrl}${endpoint}`,
        method,
        headers: {
          'X-Auth-Key': process.env.CLOUDFLARE_API_KEY,
          'X-Auth-Email': process.env.CLOUDFLARE_EMAIL,
          'Content-Type': 'application/json',
        },
        data: body ? body : null,
      });

      return data;
    } catch (err) {
      throw new Error(err.response.data.errors[0].message);
    }
  }

  /**
   * Add a domain to the cloudflare account.
   * @param {string} domain The domain to add.
   * @param {boolean} wildcard Whether or not the domain should be wildcarded.
   */
  async addDomain(domain: string, wildcard: boolean) {
    const data = await this.request('/zones', 'POST', {
      name: domain,
      account: {
        id: process.env.CLOUDFLARE_ACCOUNT_ID,
      },
    }).catch(e => console.log(e));

    const id = data.result.id;

    await this.setRecords(domain, wildcard, id);
    await this.setSettings(id);
  }

  /**
   * Delete a zone from the cloudflare account.
   * @param {string} domain The domain to delete.
   */
  async deleteZone(domain: string) {
    const {result} = await this.request(`/zones?name=${domain}`, 'GET');
    const {id} = result[0];

    await this.request(`/zones/${id}`, 'DELETE');
  }

  /**
   * Setup dns records for a new domain.
   * @param {string} domain The domain name.
   * @param {boolean} wildcard Whether or not the domain should be wildcarded.
   * @param {string} id The zone id.
   */
  async setRecords(domain: string, wildcard: boolean, id: string) {
    await this.request(`/zones/${id}/dns_records`, 'POST', {
      type: 'CNAME',
      name: '@',
      content: 'i.higure.wtf',
      ttl: 1,
      proxied: true,
    });

    if (wildcard)
      await this.request(`/zones/${id}/dns_records`, 'POST', {
        type: 'CNAME',
        name: '*',
        content: domain,
        ttl: 1,
      });
  }

  /**
   * Setup the ssl settings for a new domain.
   * @param {string} id The zone id.
   */
  async setSettings(id: string) {
    await this.request(`/zones/${id}/settings/ssl`, 'PATCH', {
      value: 'flexible',
    });

    await this.request(`/zones/${id}/settings/always_use_https`, 'PATCH', {
      value: 'on',
    });
  }
})();
