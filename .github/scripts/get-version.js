const semver = require('semver');

module.exports = ({core, tag}) => {
  const result = semver.coerce(tag);

  if (!result) {
    core.error(`Could not coerce release tag ${tag} into semver.`);
    process.exit(1);
  }

  core.info(`Extracted semver: ${result.version}`);
  core.setOutput('value', result.version);
};
