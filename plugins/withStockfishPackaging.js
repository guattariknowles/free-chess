const { withGradleProperties } = require('@expo/config-plugins');

const LEGACY_PACKAGING_PROPERTY = 'expo.useLegacyPackaging';

module.exports = function withStockfishPackaging(config) {
  return withGradleProperties(config, (gradleConfig) => {
    const existing = gradleConfig.modResults.find(
      (item) =>
        item.type === 'property' &&
        item.key === LEGACY_PACKAGING_PROPERTY,
    );

    if (existing) {
      existing.value = 'true';
    } else {
      gradleConfig.modResults.push({
        type: 'property',
        key: LEGACY_PACKAGING_PROPERTY,
        value: 'true',
      });
    }

    return gradleConfig;
  });
};
