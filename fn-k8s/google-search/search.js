const Controller = require('./lib/controller');

(async () => {
  const controller = new Controller.default();
  await controller.start();
  const { QUERY: query = 'charity golf events' } = process.env;
  const search = () => [].map.call(document.querySelectorAll('h3.r>a'), (e, i) => `[${i}] ${e.innerText} - ${e.href}`);
  try {
    const { result, success, error } = await controller.runOnConsole(
      'https://www.google.com/search?q=' + query.replace(/\s+/g, '+'),
      search.toString(),
      {},
      Number(process.env.TTL || 10) * 1000
    );
    if (success) {
      result.forEach(l => console.log(l));
    } else {
      throw new Error(error);
    }
  } catch (e) {
    await controller.kill();
    throw e;
  }
  await controller.kill();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
