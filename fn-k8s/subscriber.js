const bunyan = require('bunyan');
const k8s = require('@kubernetes/client-node');
const PubSub = require('@google-cloud/pubsub');
const { LoggingBunyan } = require('@google-cloud/logging-bunyan');

const loggingBunyan = new LoggingBunyan();

const logger = bunyan.createLogger({
  name: 'pubsub-subscriber',
  streams: [
    { stream: process.stdout, level: 'debug' },
    loggingBunyan.stream('info'),
  ],
  serializers: bunyan.stdSerializers
});

const k8sApi = k8s.Config.defaultClient();

const NAMESPACE = 'development';

const processJob = async (id, image, ttl, data) => {
  const { body } = await k8sApi.createNamespacedPod(NAMESPACE, {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: { name: `worker-${id}`, labels: { role: 'yolo' } },
    spec: {
      activeDeadlineSeconds: ttl,
      terminationGracePeriodSeconds: 0,
      containers: [{
        name: 'job',
        image, imagePullPolicy: 'Always',
        env: [ { name: 'data', value: JSON.stringify(data) } ]
      }],
      restartPolicy: 'Never'
    }
  });
  if (body.kind === 'Pod') {
    logger.info(`Sucessfully created pod ${body.metadata.name} for job #${id}`);
  } else {
    throw new Error(body.message);
  }
};

const delay = ms => new Promise(r => setTimeout(r, ms));

const check = async id => {
  try {
    while(true) {
      const { body: { status } } = await k8sApi.readNamespacedPodStatus(`worker-${id}`, NAMESPACE);
      logger.debug(`Checking job #${id}, status: ${status.phase}`);
      if (status.phase === 'Succeeded') {
        logger.info(`Job #${id} completed successfully!`);
        break;
      } else if (status.phase === 'Failed') {
        if (status.reason === 'DeadlineExceeded') {
          logger.error(`Job #${id} took longer than ttl and was killed`);
        } else {
          logger.error(`Job #${id} exited with non zero code: ${status.containerStatuses[0].state.terminated.exitCode}`);
        }
        break;
      } else {
        await delay(1000);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Unknown error!');
  }
}

(async () => {
  const pubsub = new PubSub();
  const subscription = pubsub.subscription('test');

  logger.info('Pulling messages from Pub/Sub subscription...');

  subscription.on(
    'message',
    async message => {
      message.ack();
      const { id, data: json } = message;
      logger.info(`Received job #${id}`);
      logger.info(`Data: ${json}`);
      try {
        const { image: { name: image, data }, ttl } = JSON.parse(json);
        await processJob(id, image, ttl, data);
        logger.info(`Successfully processed job #${id}`);
        ttl > 0 && check(id);
      } catch (err) {
        logger.error(`Error processing job #${id}: ${err.message}`);
      }
    });
})();
