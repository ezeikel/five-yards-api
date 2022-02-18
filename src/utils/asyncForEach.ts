const asyncForEach = async (array: any[], callback: any) => {
  if (!array) return;

  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array); // eslint-disable-line no-await-in-loop
  }
};

export default asyncForEach;
