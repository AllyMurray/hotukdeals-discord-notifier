// Domain and certificate configuration
const appName = "dealping";
const domain = "dealping.app";

// Look up the hosted zone ID using Pulumi's AWS provider
const hostedZone = aws.route53.getZone({
  name: `${domain}.`, // Note: Route53 expects the trailing dot
});

export const hostedZoneId = await hostedZone.then(zone => zone.zoneId);

// Look up ACM certificates dynamically for each stage
// Certificates must exist in us-east-1 for CloudFront
const stageDomains = {
  prod: domain,
  staging: `staging.${domain}`,
  dev: `dev.${domain}`,
};

// Create a provider for us-east-1 (required for CloudFront certificates)
const usEast1Provider = new aws.Provider("us-east-1", {
  region: "us-east-1",
});

const getCertArn = (stageDomain: string) =>
  aws.acm.getCertificate({
    domain: stageDomain,
    statuses: ["ISSUED"],
    mostRecent: true,
  }, { provider: usEast1Provider }).then(cert => cert.arn);

export const certArns = {
  prod: await getCertArn(stageDomains.prod),
  staging: await getCertArn(stageDomains.staging),
  dev: await getCertArn(stageDomains.dev),
};

// Create domain configurations based on stage
const createDomainConfig = (subdomain: string = '') => {
  const stage = $app.stage;

  if (stage === 'prod') {
    return {
      name: subdomain ? `${subdomain}.${domain}` : domain,
      cert: certArns.prod,
      dns: sst.aws.dns({ zone: hostedZoneId }),
    };
  }

  if (stage === 'staging' || stage === 'dev') {
    const stagePrefix = stage;
    return {
      name: subdomain ? `${subdomain}.${stagePrefix}.${domain}` : `${stagePrefix}.${domain}`,
      cert: certArns[stage],
      dns: sst.aws.dns({ zone: hostedZoneId }),
    };
  }

  return undefined;
};

// Auth subdomain configuration
export const authDomainConfig = createDomainConfig('auth');
export const authDomainName = authDomainConfig?.name;

// Main app domain configuration
export const appDomainConfig = createDomainConfig();

export { appName };
