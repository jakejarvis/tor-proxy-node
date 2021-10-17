import consola from "consola";

const logger = consola.create({
  reporters: [
    new consola.FancyReporter(),
  ],
});
logger.wrapAll();

export default logger;
