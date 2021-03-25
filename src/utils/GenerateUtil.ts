import {randomBytes} from 'crypto';

/**
 * Generate a string.
 * @param {string} length The length of the string.
 * @return {string} The generated string.
 */
function generateString(length: number): string {
  return randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Generate a invite code.
 * @return {string} The invite code.
 */
function generateInvite(): string {
  const key = randomBytes(80).toString('hex');
  return [key.slice(0, 10), key.slice(1, 12), key.slice(3, 9)].join('-');
}

/**
 * Generate a short url.
 * @return {string} The short url.
 */
function generateInvisibleId(): string {
  let url = '';
  const invisibleCharacters = ['\u200B', '\u2060', '\u200C', '\u200D'].join('');

  for (let i = 0; i < 25; i++) {
    url += invisibleCharacters.charAt(
      Math.floor(Math.random() * invisibleCharacters.length)
    );
  }

  return url + '\u200B';
}

export {generateString, generateInvite, generateInvisibleId};
