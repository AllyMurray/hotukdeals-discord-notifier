# Discord Bot Configuration Management Plan

## Overview

This document outlines the plan for adding a Discord bot to manage configuration remotely, addressing the current limitation of requiring a MacBook to update configurations via CLI.

## Current System Analysis

The existing CLI (`scripts/manage-config.ts`) manages search terms in DynamoDB with comprehensive operations:
- **Add/Update**: Single or multiple search terms with webhook URLs
- **Remove**: Individual terms or entire webhook configurations
- **Toggle**: Enable/disable search terms
- **Filter**: Add include/exclude keywords and case-sensitive options
- **List**: View all configurations or grouped by webhook

**Current Infrastructure:**
- DynamoDB for config storage (`hotukdeals-config` table)
- AWS Lambda for processing notifications
- TypeScript with comprehensive error handling
- SST for infrastructure management

## Security Architecture

### 1. Authentication & Authorization

**Multi-layer Security Model:**
- **Guild-based access**: Bot only operates in specific Discord servers
- **Role-based permissions**: Commands restricted to users with specific roles (e.g., `@ConfigAdmin`, `@BotManager`)
- **User ID allowlist**: Fallback to specific Discord user IDs for additional security
- **Channel restrictions**: Commands only work in designated management channels

### 2. Command Structure

#### Slash Commands Design
```
/config list                              # View all configurations
/config list-grouped                      # View configurations grouped by webhook
/config add <term> <webhook> [--disabled] # Add search term
/config add-multiple <webhook> <terms>    # Add multiple terms to one webhook
/config remove <term>                     # Remove search term
/config remove-webhook <webhook>          # Remove all terms for webhook
/config toggle <term>                     # Enable/disable term
/config filter <term> [options]          # Add include/exclude filters
/config status                           # Show system health and stats
/config audit [limit]                    # View recent changes (default 10)
```

#### Filter Command Options
```
/config filter <term> 
  --exclude <keywords>     # Comma-separated exclusion keywords
  --include <keywords>     # Comma-separated inclusion keywords (ALL must be present)
  --case-sensitive        # Enable case-sensitive filtering
```

### 3. Security Controls

#### Input Validation
- **Search terms**: Alphanumeric, hyphens, spaces only
- **Webhook URLs**: Must match Discord webhook URL pattern
- **Keywords**: Sanitized to prevent injection attacks
- **Discord signature verification**: Verify all interactions are from Discord

#### Access Control
- **Permission verification**: Every command checks user roles and channel
- **Guild membership**: Bot ignores commands from unauthorized servers
- **Command confirmation**: Destructive operations require confirmation button
- **Audit logging**: All changes logged with user ID, timestamp, and details

#### Data Protection
- **Webhook URL masking**: Display truncated URLs in responses
- **Encrypted audit logs**: Sensitive data encrypted at rest
- **Secure token storage**: Bot token stored in AWS Secrets Manager

### 4. Implementation Components

#### New Infrastructure Requirements

**Discord Bot Lambda:**
- Separate Lambda function for Discord bot interactions
- Handles slash command registration and responses
- Processes Discord interaction webhooks

**Additional DynamoDB Table:**
```
audit-logs-table:
  - id (timestamp-uuid)
  - userId (Discord user ID)
  - username (Discord username)
  - command (executed command)
  - parameters (command parameters)
  - timestamp (ISO string)
  - result (success/failure)
  - changes (what was modified)
```

**IAM Roles:**
- Bot-specific role with minimal DynamoDB permissions
- Read/write access to config and audit tables only
- No access to other AWS resources

**Environment Variables:**
```
DISCORD_BOT_TOKEN_SECRET_ARN=arn:aws:secretsmanager:...
ALLOWED_GUILD_IDS=123456789,987654321
ADMIN_ROLE_NAMES=ConfigAdmin,BotManager
MANAGEMENT_CHANNEL_IDS=123456789,987654321
CONFIG_TABLE_NAME=hotukdeals-config
AUDIT_TABLE_NAME=hotukdeals-audit-logs
```

#### Security Features

**Authentication Flow:**
1. Verify Discord interaction signature
2. Check rate limits and circuit breaker status
3. Verify command comes from allowed guild
4. Check user has required role OR is in user allowlist
5. Validate command is in allowed channel
6. Execute command with audit logging

**Error Handling:**
- Graceful degradation on AWS service failures
- User-friendly error messages (no sensitive data exposure)
- Failed operations logged for security monitoring

### 5. Audit & Monitoring

#### Comprehensive Logging
- **All config changes**: Who, what, when, where
- **Failed authentication attempts**: Security monitoring
- **Command usage patterns**: Operational insights
- **System health checks**: Uptime and performance

#### CloudWatch Integration
- Custom metrics for bot usage
- Alerts for failed authentication attempts
- Performance monitoring for response times
- Error rate tracking

#### Audit Trail Features
```
/config audit [limit] displays:
- Timestamp
- User (Discord username)
- Action performed
- Parameters used
- Result (success/failure)
- Changes made
```

### 6. Deployment Strategy

#### Infrastructure as Code
- Extend existing SST configuration
- Add Discord bot Lambda and audit table
- Environment-specific deployments (dev/prod)

#### Secrets Management
- Bot tokens stored in AWS Secrets Manager
- Automatic rotation capability
- Environment-specific secret isolation

#### Deployment Pipeline
1. **Development**: Test bot in development Discord server
2. **Staging**: Validate with production-like data
3. **Production**: Deploy with monitoring and rollback capability

## Implementation Phases

### Phase 1: Core Infrastructure
- Create Discord bot application
- Set up Lambda function for Discord interactions
- Implement basic slash command registration
- Add audit logging table

### Phase 2: Security Implementation
- Implement authentication and authorization
- Add role-based access control
- Create audit logging system
- Add rate limiting and input validation

### Phase 3: Command Implementation
- Implement all configuration commands
- Add confirmation dialogs for destructive operations
- Create comprehensive error handling
- Add command help and documentation

### Phase 4: Monitoring & Operations
- Set up CloudWatch monitoring
- Create alerting for security events
- Add health check endpoints
- Document operational procedures

## Security Benefits

### Zero Trust Model
- Every command verified against multiple security layers
- No implicit trust based on Discord server membership
- Continuous validation of user permissions

### Principle of Least Privilege
- Bot has minimal required AWS permissions
- Users granted access only to necessary commands
- Channel and role restrictions limit exposure

### Complete Audit Trail
- Every action traceable to specific Discord user
- Immutable audit log for compliance
- Real-time monitoring of configuration changes

### Defense in Depth
- Multiple security controls prevent unauthorized access
- Graceful failure modes maintain security posture
- Regular security reviews and updates

## Risk Mitigation

### Potential Risks & Mitigations

**Risk**: Discord account compromise
**Mitigation**: Role-based access, audit logging, rate limiting

**Risk**: Bot token exposure
**Mitigation**: AWS Secrets Manager, token rotation, monitoring

**Risk**: Unauthorized configuration changes
**Mitigation**: Multi-layer auth, confirmation dialogs, audit trail

**Risk**: Service disruption
**Mitigation**: Graceful degradation, CLI fallback, monitoring

**Risk**: Cost spike from malicious traffic
**Mitigation**: Rate limiting, circuit breakers, billing alerts, auto-disable

## Operational Considerations

### Maintenance
- Regular security reviews of bot permissions
- Periodic audit log analysis
- Bot token rotation schedule
- Discord API version updates

### User Management
- Onboarding process for new administrators
- Role assignment procedures
- Access review and revocation process

### Incident Response
- Security incident procedures
- Bot compromise response plan
- Audit log investigation process
- Service restoration procedures

## Cost Protection & Control

### Rate Limiting & Throttling

**Multi-tier Rate Limiting:**
- **Per-user limits**: 10 commands per minute, 100 per hour
- **Per-guild limits**: 50 commands per minute across all users  
- **Global limits**: 500 commands per minute across all guilds
- **Exponential backoff**: Increase delays for repeated violations

**Implementation Example:**
```typescript
const rateLimiter = {
  userCommands: new Map(), // userId -> { count, resetTime }
  guildCommands: new Map(), // guildId -> { count, resetTime }
  globalCount: 0,
  globalResetTime: Date.now() + 60000,
  
  isAllowed(userId: string, guildId: string): boolean {
    const now = Date.now();
    
    // Check global rate limit
    if (now > this.globalResetTime) {
      this.globalCount = 0;
      this.globalResetTime = now + 60000;
    }
    if (this.globalCount >= 500) return false;
    
    // Check user rate limit
    const userLimit = this.userCommands.get(userId);
    if (!userLimit || now > userLimit.resetTime) {
      this.userCommands.set(userId, { count: 1, resetTime: now + 60000 });
    } else if (userLimit.count >= 10) {
      return false;
    } else {
      userLimit.count++;
    }
    
    // Check guild rate limit
    const guildLimit = this.guildCommands.get(guildId);
    if (!guildLimit || now > guildLimit.resetTime) {
      this.guildCommands.set(guildId, { count: 1, resetTime: now + 60000 });
    } else if (guildLimit.count >= 50) {
      return false;
    } else {
      guildLimit.count++;
    }
    
    this.globalCount++;
    return true;
  }
};
```

### DynamoDB Cost Controls

**Cost Optimization:**
- **On-demand pricing with limits**: CloudWatch alarms at $10/day
- **Query optimization**: Use GetItem instead of Scan where possible
- **Batch operations**: Group multiple config changes into single transactions
- **TTL on audit logs**: Auto-delete logs older than 90 days to reduce storage costs

**Audit Log Table Configuration:**
```typescript
const auditTableSchema = {
  TableName: 'hotukdeals-audit-logs',
  BillingMode: 'ON_DEMAND',
  TimeToLiveSpecification: {
    AttributeName: 'ttl',
    Enabled: true
  },
  // TTL set to 90 days from creation
  ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
};
```

### Lambda Cost Protection

**Resource Optimization:**
- **Timeout limits**: 30 second max execution time
- **Memory optimization**: Right-size memory allocation (256MB recommended)
- **Concurrent execution limits**: Cap at 10 concurrent executions
- **Dead letter queues**: Prevent infinite retry loops

**Circuit Breaker Implementation:**
```typescript
const circuitBreaker = {
  dailyInvocations: 0,
  maxDailyInvocations: 1000,
  isOpen: false,
  lastResetTime: Date.now(),
  
  shouldExecute(): boolean {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Reset daily counter
    if (now - this.lastResetTime > oneDayMs) {
      this.dailyInvocations = 0;
      this.lastResetTime = now;
      this.isOpen = false;
    }
    
    if (this.dailyInvocations >= this.maxDailyInvocations) {
      this.isOpen = true;
      // Log security event and notify admins
      console.error('Circuit breaker open: Daily invocation limit exceeded');
      return false;
    }
    
    this.dailyInvocations++;
    return true;
  }
};
```

### CloudWatch Billing Alerts

**Multi-tier Alert System:**
```typescript
const billingAlerts = [
  { threshold: 5, action: 'notify' },      // $5 - Warning notification
  { threshold: 10, action: 'alert' },     // $10 - Alert admins
  { threshold: 25, action: 'throttle' },  // $25 - Enable aggressive throttling
  { threshold: 50, action: 'disable' }    // $50 - Auto-disable bot
];
```

**Monitoring Metrics:**
- **Daily spend alerts**: $5, $10, $25, $50 thresholds
- **Lambda invocation alerts**: >1000 invocations/hour
- **DynamoDB read/write alerts**: Unusual traffic patterns
- **Rate limit violation alerts**: Multiple users hitting limits

### Authentication as Cost Control

**Strict Access Controls:**
- **Guild allowlist**: Maximum 2-3 authorized Discord servers
- **User verification**: Require both role AND user ID verification for sensitive commands
- **IP allowlisting**: Accept traffic only from Discord's known IP ranges
- **Signature verification**: Verify all Discord interaction signatures

### Emergency Response System

**Auto-disable Triggers:**
- **Cost threshold**: Automatically disable bot if daily costs exceed $50
- **Rate limit violations**: Disable after 10 consecutive violations from same user
- **Failed authentication**: Disable after 50 failed auth attempts in 1 hour
- **Manual override**: Admin command to emergency disable

**Emergency Disable Implementation:**
```typescript
const emergencyControls = {
  isDisabled: false,
  disableReason: '',
  
  checkEmergencyConditions(): boolean {
    // Check cost threshold via CloudWatch API
    // Check violation patterns
    // Return true if emergency disable needed
  },
  
  emergencyDisable(reason: string): void {
    this.isDisabled = true;
    this.disableReason = reason;
    // Send immediate notification to admins
    // Log to CloudWatch for investigation
  }
};
```

## Cost Estimates

### Normal Operation (Monthly)
- **Lambda**: ~$2-5 (1000 invocations, 256MB, 3s avg duration)
- **DynamoDB**: ~$1-3 (light read/write operations)
- **Secrets Manager**: ~$0.40 (1 secret)
- **CloudWatch**: ~$0.50 (custom metrics and logs)
- **Total**: **<$10/month**

### Attack Scenario Protection
- **Rate limiting**: Prevents scaling beyond 500 commands/minute
- **Circuit breaker**: Stops execution at 1000 daily invocations
- **Billing alerts**: Early warning at $5, emergency stop at $50
- **Maximum possible daily cost**: **~$50** (with all protections engaged)

### Additional Cost Monitoring

**Real-time Cost Tracking:**
```typescript
const costMonitor = {
  async getCurrentDailyCost(): Promise<number> {
    // Query CloudWatch billing metrics
    // Return current day's spend
  },
  
  async checkCostThresholds(): Promise<void> {
    const dailyCost = await this.getCurrentDailyCost();
    
    if (dailyCost > 50) {
      emergencyControls.emergencyDisable('Daily cost limit exceeded');
    } else if (dailyCost > 25) {
      // Enable aggressive rate limiting
      rateLimiter.enableAggressiveMode();
    }
  }
};
```

## Conclusion

This Discord bot implementation provides secure, auditable remote access to configuration management while maintaining robust cost controls and security posture. The multi-layered approach includes rate limiting, circuit breakers, billing alerts, and emergency disable mechanisms to prevent cost spikes from malicious actors while ensuring legitimate users can effectively manage configurations.