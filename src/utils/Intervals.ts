/**
 * The intervals array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let intervals: Array<{id?: any; uuid: string}> = [];

/**
 * Delete a interval.
 * @param {string} uuid The user's uuid.
 */
function delInterval(uuid: string) {
  intervals = intervals.filter(i => i.uuid !== uuid);
}

export {intervals, delInterval};
