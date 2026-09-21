const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: assert-beta-version.mjs <semver>');
  process.exit(1);
}

const major = Number(version.split('.')[0]);
if (major >= 1) {
  console.error(
    `Murmullo is still beta. Refusing to bump to ${version}. Use 0.x until 1.0.0 is intentional.`
  );
  process.exit(1);
}

console.log(`Beta guard ok: ${version}`);
