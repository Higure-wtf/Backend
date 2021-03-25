/* eslint-disable eqeqeq */
import Axios from 'axios';
import proxy_check from 'proxycheck-node.js';
import ipLoggers from './IPLoggers.json';

const lookup = require('safe-browse-url-lookup')({
  apiKey: 'AIzaSyAv7Ir63bdIx03t5WVJzZlnhYUtKBrDFUQ',
});
const check = new proxy_check({api_key: '71x722-t44jz9-7043n4-13nb77'});

//this is hella ugly IK
async function isVPN(ip: string) {
  const ipintel = await Axios.get(
    `http://check.getipintel.net/check.php?ip=${ip}&contact=hello@higure.wtf`,
    {transformResponse: []}
  );
  if (Number(ipintel.data) > 0.99) {
    return true;
  }
  const result = (await check.check(ip, {vpn: true, risk: 1}))[ip];
  if (result.risk < 33 && result.proxy === 'yes' && result.type != 'VPN') {
    return true;
  } else if (result.risk < 66 && result.risk > 34 && result.proxy != 'no') {
    return true;
  } else if (result.risk > 67) {
    return true;
  }
  return false;
}

async function isMalicious(url: string) {
  try {
    // eslint-disable-next-line node/no-unsupported-features/node-builtins
    const domain = new URL(url).hostname.replace('www.', '');
    for (const ipLogger of ipLoggers) {
      if (domain.match(new RegExp(ipLogger, 'i'))) return true;
    }
    return await lookup.checkSingle('http://' + domain + '/');
  } catch (e) {
    return false;
  }
}

export {isVPN, isMalicious};
